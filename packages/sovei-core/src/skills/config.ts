import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { SkillBinding, SkillManifest, SkillStatus } from './types.js';

const SourceType = z.enum(['git', 'path', 'registry']);

const SkillManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  source: z.object({
    type: SourceType,
    locator: z.string().min(1),
    ref: z.string().min(1).optional(),
    commit: z.string().min(1).optional(),
  }),
  license: z.string().min(1).optional(),
  supportedStages: z.array(z.string().min(1)).min(1),
  readOnly: z.literal(true),
  protocolVersion: z.string().min(1),
});

const SkillBindingSchema = z.object({
  stage: z.string().min(1),
  skillId: z.string().min(1),
  status: z.enum(['candidate', 'enabled', 'disabled', 'incompatible']),
  fallback: z.literal('native'),
  timeoutMs: z.number().int().positive().optional(),
});

const SkillLockSchema = z.object({
  schemaVersion: z.literal(1),
  skills: z.record(z.string(), z.object({
    source: z.string().min(1),
    version: z.string().min(1),
    ref: z.string().min(1),
    commit: z.string().min(1),
    checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    license: z.string().min(1),
    status: z.enum(['candidate', 'enabled', 'disabled', 'incompatible']),
  })),
});

export interface SkillMapConfig {
  schemaVersion: 1;
  bindings: SkillBinding[];
}

export interface SkillLockEntry {
  source: string;
  version: string;
  ref: string;
  commit: string;
  checksum: string;
  license: string;
  status: SkillStatus;
}

export interface SkillLockConfig {
  schemaVersion: 1;
  skills: Record<string, SkillLockEntry>;
}

export interface SkillConfigValidation {
  valid: boolean;
  errors: string[];
  map: SkillMapConfig | null;
  lock: SkillLockConfig | null;
}

export function parseSkillMap(content: string, source = 'skill-map.yaml'): SkillMapConfig {
  const raw = parseYaml(content) as unknown;
  const parsed = z.object({
    schemaVersion: z.literal(1),
    bindings: z.array(SkillBindingSchema),
  }).safeParse(raw);
  if (!parsed.success) throw new Error(`Invalid Skill map at ${source}: ${parsed.error.message}`);
  return parsed.data;
}

export function parseSkillLock(content: string, source = 'skill-lock.yaml'): SkillLockConfig {
  const parsed = SkillLockSchema.safeParse(parseYaml(content) as unknown);
  if (!parsed.success) throw new Error(`Invalid Skill lock at ${source}: ${parsed.error.message}`);
  return parsed.data;
}

export function validateSkillConfiguration(
  mapContent: string,
  lockContent: string,
): SkillConfigValidation {
  const errors: string[] = [];
  let map: SkillMapConfig | null = null;
  let lock: SkillLockConfig | null = null;
  try { map = parseSkillMap(mapContent); } catch (error) { errors.push((error as Error).message); }
  try { lock = parseSkillLock(lockContent); } catch (error) { errors.push((error as Error).message); }

  if (map && lock) {
    for (const binding of map.bindings) {
      if (binding.status === 'disabled') continue;
      if (binding.skillId.startsWith('sovei/native/')) continue;
      const locked = lock.skills[binding.skillId];
      if (!locked) {
        errors.push(`Skill ${binding.skillId} is not present in skill-lock.yaml`);
        continue;
      }
      if (binding.status === 'enabled' && locked.status !== 'enabled') {
        errors.push(`Skill ${binding.skillId} is enabled in skill-map.yaml but ${locked.status} in skill-lock.yaml`);
      }
    }
  }
  return { valid: errors.length === 0, errors, map, lock };
}

export function manifestMatchesLock(manifest: SkillManifest, lock: SkillLockEntry): string[] {
  const errors: string[] = [];
  if (manifest.id !== lock.source) errors.push(`manifest id ${manifest.id} does not match lock source ${lock.source}`);
  if (manifest.version !== lock.version) errors.push(`version mismatch for ${manifest.id}`);
  if (manifest.source.commit !== lock.commit) errors.push(`commit mismatch for ${manifest.id}`);
  if (manifest.license !== lock.license) errors.push(`license mismatch for ${manifest.id}`);
  return errors;
}
