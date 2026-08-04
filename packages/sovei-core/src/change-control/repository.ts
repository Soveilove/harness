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
} from './schemas.js';

const REDLINES_FILE = 'harness/project/governance/redlines.json';
const REDLINES_LOCK = 'harness/project/governance/redlines';
const REDLINE_EVENTS_FILE = 'harness/project/governance/redline-events.jsonl';

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

  async addRedline(input: Pick<Redline, 'id' | 'title' | 'rule' | 'enforcement'>): Promise<Redline> {
    return this.storage.withLock(REDLINES_LOCK, async () => {
      const redlines = await this.loadRedlines();
      if (redlines.some((redline) => redline.id === input.id)) {
        throw new Error(`Redline already exists: ${input.id}`);
      }
      const now = new Date().toISOString();
      const redline = RedlineSchema.parse({ ...input, active: true, createdAt: now, updatedAt: now });
      await this.saveRedlines([...redlines, redline]);
      await this.storage.append(REDLINE_EVENTS_FILE, JSON.stringify({
        type: 'REDLINE_ADDED',
        timestamp: now,
        redline,
      }) + '\n');
      return redline;
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
      return updated;
    });
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
