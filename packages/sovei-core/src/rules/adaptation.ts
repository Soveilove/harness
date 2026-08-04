import { scanProjectRuleCandidates } from '../config/project-rule-scanner.js';
import type { StorageBackend } from '../storage/types.js';
import { ProjectRulesDocumentSchema, type ProjectRule } from './schemas.js';
import { ADAPTED_RULES_FILE, ProjectRulesRepository } from './repository.js';
import { parseProjectJson } from '../config/json.js';

/** Refresh deterministic legacy candidates while preserving every reviewed decision. */
export async function adaptProjectRules(
  storage: StorageBackend,
  repository: ProjectRulesRepository,
): Promise<{ total: number; preserved: number; written: boolean }> {
  const detected = await scanProjectRuleCandidates(storage);
  const existingContent = await storage.read(ADAPTED_RULES_FILE);
  if (!detected.length && existingContent === null) {
    return { total: 0, preserved: 0, written: false };
  }
  const existing = existingContent
    ? ProjectRulesDocumentSchema.parse(parseProjectJson(existingContent, ADAPTED_RULES_FILE)).rules
    : [];
  const existingById = new Map(existing.map((rule) => [rule.id, rule]));
  let preserved = 0;
  const next: ProjectRule[] = detected.map((rule) => {
    const previous = existingById.get(rule.id);
    if (!previous || previous.lifecycle === 'candidate') return rule;
    preserved++;
    return { ...rule, lifecycle: previous.lifecycle, provenance: previous.provenance };
  });
  for (const previous of existing) {
    if (!next.some((rule) => rule.id === previous.id) && previous.lifecycle !== 'candidate') {
      next.push(previous);
      preserved++;
    }
  }
  next.sort((a, b) => a.id.localeCompare(b.id));
  await repository.writeDocument(ADAPTED_RULES_FILE, { schemaVersion: 1, rules: next });
  await repository.load();
  return { total: detected.length, preserved, written: true };
}
