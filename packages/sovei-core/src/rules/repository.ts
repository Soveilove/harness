import { minimatch } from 'minimatch';
import type { StorageBackend } from '../storage/types.js';
import { parseProjectJson } from '../config/json.js';
import {
  ProjectRulesDocumentSchema,
  type LoadedProjectRule,
  type ProjectRule,
  type ProjectRulesDocument,
} from './schemas.js';

export const DEFAULT_RULES_DIR = 'harness/project/rules';
export const DEFAULT_RULES_FILE = `${DEFAULT_RULES_DIR}/project.rules.json`;
export const ADAPTED_RULES_FILE = `${DEFAULT_RULES_DIR}/adapted.rules.json`;

function formatSchemaError(source: string, issues: Array<{ path: PropertyKey[]; message: string }>): Error {
  const details = issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ');
  return new Error(`Invalid project rules at ${source}: ${details}`);
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
}

export class ProjectRulesRepository {
  constructor(
    private readonly storage: StorageBackend,
    private readonly rulesDir = DEFAULT_RULES_DIR,
  ) {}

  async load(): Promise<LoadedProjectRule[]> {
    const files = (await this.storage.listRecursive(this.rulesDir))
      .filter((file) => file.endsWith('.rules.json'))
      .sort();
    const loaded: LoadedProjectRule[] = [];
    const ids = new Map<string, string>();

    for (const source of files) {
      const content = await this.storage.read(source);
      if (content === null) continue;
      let raw: unknown;
      try {
        raw = parseProjectJson(content, source);
      } catch (error) {
        throw new Error(`Invalid JSON in project rules at ${source}: ${(error as Error).message}`);
      }
      const parsed = ProjectRulesDocumentSchema.safeParse(raw);
      if (!parsed.success) throw formatSchemaError(source, parsed.error.issues);
      for (const rule of parsed.data.rules) {
        const previous = ids.get(rule.id);
        if (previous) throw new Error(`Duplicate project rule id ${rule.id} in ${previous} and ${source}`);
        ids.set(rule.id, source);
        loaded.push({ ...rule, source });
      }
    }

    return loaded.sort((a, b) => a.source.localeCompare(b.source) || a.id.localeCompare(b.id));
  }

  async writeDocument(path: string, document: ProjectRulesDocument): Promise<void> {
    const parsed = ProjectRulesDocumentSchema.safeParse(document);
    if (!parsed.success) throw formatSchemaError(path, parsed.error.issues);
    await this.storage.write(path, JSON.stringify(parsed.data, null, 2) + '\n');
  }

  async activate(id: string, reviewer: string, reason: string): Promise<LoadedProjectRule> {
    const rules = await this.load();
    const target = rules.find((rule) => rule.id === id);
    if (!target) throw new Error(`Project rule not found: ${id}`);
    if (target.lifecycle !== 'candidate') throw new Error(`Project rule ${id} is ${target.lifecycle}, expected candidate`);

    const content = await this.storage.read(target.source);
    if (content === null) throw new Error(`Project rules source disappeared: ${target.source}`);
    const document = ProjectRulesDocumentSchema.parse(parseProjectJson(content, target.source));
    const reviewedAt = new Date().toISOString();
    const updatedRules = document.rules.map((rule): ProjectRule => rule.id === id
      ? {
          ...rule,
          lifecycle: 'active',
          provenance: { ...rule.provenance, reviewedBy: reviewer, reviewedAt, reviewReason: reason },
        }
      : rule);
    await this.writeDocument(target.source, { schemaVersion: 1, rules: updatedRules });
    await this.storage.append(`${this.rulesDir}/rule-events.jsonl`, JSON.stringify({
      type: 'PROJECT_RULE_ACTIVATED', id, reviewer, reason, timestamp: reviewedAt, source: target.source,
    }) + '\n');
    return { ...target, lifecycle: 'active', provenance: { ...target.provenance, reviewedBy: reviewer, reviewedAt, reviewReason: reason } };
  }

  async deprecate(id: string, reviewer: string, reason: string): Promise<LoadedProjectRule> {
    const rules = await this.load();
    const target = rules.find((rule) => rule.id === id);
    if (!target) throw new Error(`Project rule not found: ${id}`);
    if (target.lifecycle === 'deprecated') throw new Error(`Project rule ${id} is already deprecated`);

    const content = await this.storage.read(target.source);
    if (content === null) throw new Error(`Project rules source disappeared: ${target.source}`);
    const document = ProjectRulesDocumentSchema.parse(parseProjectJson(content, target.source));
    const deprecatedAt = new Date().toISOString();
    const updatedRules = document.rules.map((rule): ProjectRule => rule.id === id
      ? { ...rule, lifecycle: 'deprecated' }
      : rule);
    await this.writeDocument(target.source, { schemaVersion: 1, rules: updatedRules });
    await this.storage.append(`${this.rulesDir}/rule-events.jsonl`, JSON.stringify({
      type: 'PROJECT_RULE_DEPRECATED', id, reviewer, reason, timestamp: deprecatedAt, source: target.source,
    }) + '\n');
    return { ...target, lifecycle: 'deprecated' };
  }
}

export interface ResolveRulesOptions {
  stage?: string;
  paths?: string[];
  lifecycles?: Array<ProjectRule['lifecycle']>;
}

export function resolveProjectRules(rules: LoadedProjectRule[], options: ResolveRulesOptions = {}): LoadedProjectRule[] {
  const targetPaths = (options.paths ?? []).map(normalizePath).filter(Boolean);
  const lifecycles = new Set(options.lifecycles ?? ['active']);

  return rules.filter((rule) => {
    if (!lifecycles.has(rule.lifecycle)) return false;
    if (options.stage && rule.appliesTo.stages.length && !new Set<string>(rule.appliesTo.stages).has(options.stage)) return false;
    if (!targetPaths.length) return true;
    return targetPaths.some((target) => {
      const included = rule.appliesTo.paths.some((pattern) => minimatch(target, normalizePath(pattern), { dot: true }));
      const excluded = rule.appliesTo.excludePaths.some((pattern) => minimatch(target, normalizePath(pattern), { dot: true }));
      return included && !excluded;
    });
  }).sort((a, b) => {
    if (a.enforcement !== b.enforcement) return a.enforcement === 'required' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

export function emptyRulesDocument(): ProjectRulesDocument {
  return { schemaVersion: 1, rules: [] };
}
