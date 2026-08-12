import { createHash } from 'node:crypto';
import type { StorageBackend } from '../storage/types.js';
import { parseJson } from '../storage/json.js';
import {
  ChangeRequest as ChangeRequestSchema,
  Redline as RedlineSchema,
  type ChangeRequest,
  type ChangeDimension,
  type ChangeValidation,
  type Redline,
  type RedlineInput,
  type RedlinePatch,
} from './schemas.js';
import {
  REDLINES_VIEW_FILE,
  renderRedlinesMarkdown,
  type RedlineEvent,
  type RedlineSeed,
} from './redline-view.js';

const REDLINES_FILE = 'sovei-flow/project/governance/redlines.json';
const REDLINES_LOCK = 'sovei-flow/project/governance/redlines';
const REDLINE_EVENTS_FILE = 'sovei-flow/project/governance/redline-events.jsonl';
const REDLINE_SEED_FILE = 'sovei-flow/project/governance/redlines-seed.json';

const DIMENSION_MINIMUM_STAGE: Record<ChangeDimension, string> = {
  'business-direction': 'grill',
  'business-redline': 'grill',
  'user-behavior': 'spec',
  'acceptance-or-api-contract': 'spec',
  'impact-surface': 'scope',
  'technical-design': 'plan',
  'task-decomposition': 'tasks',
  'implementation-only': 'implement',
};

export class ChangeControlRepository {
  constructor(private readonly storage: StorageBackend) {}

  async loadRedlines(): Promise<Redline[]> {
    const content = await this.storage.read(REDLINES_FILE);
    if (!content) {
      await this.storage.write(REDLINES_FILE, '[]');
      return [];
    }
    return RedlineSchema.array().parse(parseJson(content, REDLINES_FILE));
  }

  async saveRedlines(redlines: Redline[]): Promise<void> {
    await this.storage.write(REDLINES_FILE, JSON.stringify(RedlineSchema.array().parse(redlines), null, 2));
  }

  async addRedline(input: RedlineInput, options: { refreshView?: boolean } = {}): Promise<Redline> {
    return this.storage.withLock(REDLINES_LOCK, async () => {
      const redlines = await this.loadRedlines();
      if (redlines.some((redline) => redline.id === input.id)) {
        throw new Error(`Redline already exists: ${input.id}`);
      }
      const now = new Date().toISOString();
      // 空 branches 数组归一为 undefined（= 全局生效），避免在 redlines.json 里残留空数组。
      const normalizedInput = input.branches?.length ? input : { ...input, branches: undefined };
      const redline = RedlineSchema.parse({ ...normalizedInput, active: true, createdAt: now, updatedAt: now });
      await this.saveRedlines([...redlines, redline]);
      await this.storage.append(REDLINE_EVENTS_FILE, JSON.stringify({
        type: 'REDLINE_ADDED',
        timestamp: now,
        redline,
      }) + '\n');
      if (options.refreshView !== false) await this.refreshRedlinesView();
      return redline;
    });
  }

  async updateRedline(id: string, patch: RedlinePatch, options: { refreshView?: boolean } = {}): Promise<Redline> {
    return this.storage.withLock(REDLINES_LOCK, async () => {
      const redlines = await this.loadRedlines();
      const existing = redlines.find((redline) => redline.id === id);
      if (!existing) throw new Error(`Redline not found: ${id}`);
      const fields = Object.entries(patch).filter(([key, value]) =>
        value !== undefined && (existing as Record<string, unknown>)[key] !== value);
      if (!fields.length) throw new Error(`Redline ${id} has no fields to update`);
      // 空 branches 归一为 undefined（= 全局生效），避免残留空数组。
      const merged = Object.fromEntries(fields) as Record<string, unknown>;
      if (merged.branches && (merged.branches as unknown[]).length === 0) merged.branches = undefined;
      const now = new Date().toISOString();
      const updated = RedlineSchema.parse({
        ...existing,
        ...merged,
        updatedAt: now,
      });
      await this.saveRedlines(redlines.map((redline) => redline.id === id ? updated : redline));
      await this.storage.append(REDLINE_EVENTS_FILE, JSON.stringify({
        type: 'REDLINE_UPDATED',
        timestamp: now,
        redlineId: id,
        patch: Object.fromEntries(fields),
        redline: updated,
      }) + '\n');
      if (options.refreshView !== false) await this.refreshRedlinesView();
      return updated;
    });
  }

  async deactivateRedline(id: string, reason: string): Promise<Redline> {
    return this.storage.withLock(REDLINES_LOCK, async () => {
      const redlines = await this.loadRedlines();
      const existing = redlines.find((redline) => redline.id === id);
      if (!existing) throw new Error(`Redline not found: ${id}`);
      const updated = { ...existing, active: false, updatedAt: new Date().toISOString() };
      await this.saveRedlines(redlines.map((redline) => redline.id === id ? updated : redline));
      await this.storage.append(REDLINE_EVENTS_FILE, JSON.stringify({
        type: 'REDLINE_DEACTIVATED',
        timestamp: updated.updatedAt,
        redlineId: id,
        reason,
      }) + '\n');
      await this.refreshRedlinesView();
      return updated;
    });
  }

  async loadRedlineEvents(): Promise<RedlineEvent[]> {
    const content = await this.storage.read(REDLINE_EVENTS_FILE);
    if (!content) return [];
    const events: RedlineEvent[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed) as RedlineEvent);
      } catch {
        continue;
      }
    }
    return events;
  }

  async loadRedlineSeed(): Promise<RedlineSeed | null> {
    const content = await this.storage.read(REDLINE_SEED_FILE);
    if (!content) return null;
    try {
      const parsed = JSON.parse(content) as RedlineSeed;
      return Array.isArray(parsed.redlines) ? parsed : null;
    } catch {
      return null;
    }
  }

  async refreshRedlinesView(): Promise<string> {
    const [redlines, events, seed] = await Promise.all([
      this.loadRedlines(),
      this.loadRedlineEvents(),
      this.loadRedlineSeed(),
    ]);
    const markdown = renderRedlinesMarkdown({
      redlines,
      events,
      seed,
      generatedAt: new Date().toISOString(),
    });
    await this.storage.write(REDLINES_VIEW_FILE, markdown);
    return REDLINES_VIEW_FILE;
  }

  async createRequest(
    featurePath: string,
    featureId: string,
    targetStage: string,
    summary: string,
    reason: string,
    changeDimensions: ChangeDimension[],
    baseEventRevision: number,
    baseCurrentStage: string | null,
  ): Promise<ChangeRequest> {
    const now = new Date().toISOString();
    const id = `CHG-${createHash('sha1').update(`${featureId}\0${summary}\0${now}`).digest('hex').slice(0, 10).toUpperCase()}`;
    const redlines = (await this.loadRedlines()).filter((redline) => redline.active);
    const request = ChangeRequestSchema.parse({
      schemaVersion: 1,
      id,
      featureId,
      summary,
      reason,
      targetStage,
      changeDimensions,
      baseEventRevision,
      baseCurrentStage,
      status: 'draft',
      affectedSurfaces: [],
      supersedes: [],
      redlineAssessments: redlines.map((redline) => ({
        redlineId: redline.id,
        disposition: 'review-required',
        rationale: '',
        evidence: [],
        approvedBy: null,
        approvedAt: null,
        approvalReference: null,
      })),
      authorizedBy: null,
      authorizedAt: null,
      authorizationReference: null,
      createdAt: now,
      appliedAt: null,
      cancelledAt: null,
      cancellationReason: null,
    });
    await this.saveRequest(featurePath, request);
    return request;
  }

  async loadRequest(featurePath: string, id: string): Promise<ChangeRequest> {
    const content = await this.storage.read(this.requestPath(featurePath, id));
    if (!content) throw new Error(`Change request not found: ${id}`);
    return ChangeRequestSchema.parse(parseJson(content, `变更请求 ${id}`));
  }

  async saveRequest(featurePath: string, request: ChangeRequest): Promise<void> {
    await this.storage.write(this.requestPath(featurePath, request.id), JSON.stringify(ChangeRequestSchema.parse(request), null, 2));
  }

  async listRequests(featurePath: string): Promise<ChangeRequest[]> {
    const files = await this.storage.list(`${featurePath}/change-requests`);
    const requests: ChangeRequest[] = [];
    for (const file of files.filter((name) => name.endsWith('.json'))) {
      const content = await this.storage.read(`${featurePath}/change-requests/${file}`);
      if (content) requests.push(ChangeRequestSchema.parse(parseJson(content, `变更请求 ${file}`)));
    }
    return requests.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async cancelRequest(featurePath: string, id: string, reason: string): Promise<ChangeRequest> {
    const request = await this.loadRequest(featurePath, id);
    if (request.status !== 'draft') throw new Error(`Only draft changes can be cancelled; ${id} is ${request.status}`);
    const cancelled = ChangeRequestSchema.parse({
      ...request,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason,
    });
    await this.saveRequest(featurePath, cancelled);
    return cancelled;
  }

  async validateForApply(request: ChangeRequest, stageOrder: string[]): Promise<ChangeValidation> {
    const blockers: string[] = [];
    if (request.status !== 'draft') blockers.push(`change request status is '${request.status}', expected 'draft'`);
    if (!stageOrder.includes(request.targetStage)) blockers.push(`unknown target stage '${request.targetStage}'`);
    if (!request.changeDimensions.length) {
      blockers.push('changeDimensions must classify the material change');
    } else {
      const targetIndex = stageOrder.indexOf(request.targetStage);
      const requiredIndex = Math.min(...request.changeDimensions.map((dimension) =>
        stageOrder.indexOf(DIMENSION_MINIMUM_STAGE[dimension])));
      if (targetIndex > requiredIndex) {
        blockers.push(
          `targetStage '${request.targetStage}' is too late for dimensions ${request.changeDimensions.join(', ')}; `
          + `reopen at or before '${stageOrder[requiredIndex]}'`,
        );
      }
    }
    if (!request.affectedSurfaces.length) blockers.push('affectedSurfaces must identify at least one business or code surface');
    if (!request.authorizedBy || !request.authorizedAt || !request.authorizationReference) {
      blockers.push('material change requires authorizedBy, authorizedAt, and authorizationReference');
    }

    const activeRedlines = (await this.loadRedlines()).filter((redline) => redline.active);
    if (!activeRedlines.length) blockers.push('no active business redlines configured; declare project redlines before applying a material change');
    const assessments = new Map(request.redlineAssessments.map((assessment) => [assessment.redlineId, assessment]));
    if (assessments.size !== request.redlineAssessments.length) blockers.push('redline assessments contain duplicate IDs');
    for (const redline of activeRedlines) {
      const assessment = assessments.get(redline.id);
      if (!assessment) {
        blockers.push(`missing assessment for active redline ${redline.id}`);
        continue;
      }
      if (!assessment.rationale.trim()) blockers.push(`${redline.id} requires a rationale`);
      if (assessment.disposition === 'review-required') blockers.push(`${redline.id} is not reviewed`);
      if (assessment.disposition === 'violation') blockers.push(`${redline.id} is marked as a violation`);
      if (assessment.disposition === 'compliant' && !assessment.evidence.length) {
        blockers.push(`${redline.id} compliance requires evidence`);
      }
      if (assessment.disposition === 'approved-exception') {
        if (redline.enforcement === 'absolute') {
          blockers.push(`${redline.id} is absolute and cannot receive an exception`);
        } else if (!assessment.approvedBy || !assessment.approvedAt || !assessment.approvalReference) {
          blockers.push(`${redline.id} exception requires approver, time, and approval reference`);
        }
      }
    }
    const activeIds = new Set(activeRedlines.map((redline) => redline.id));
    for (const assessment of request.redlineAssessments) {
      if (!activeIds.has(assessment.redlineId)) blockers.push(`assessment references inactive or unknown redline ${assessment.redlineId}`);
    }
    return { valid: blockers.length === 0, blockers };
  }

  requestPath(featurePath: string, id: string): string {
    return `${featurePath}/change-requests/${id}.json`;
  }
}
