/**
 * SkillManager - CLI-facing skill access layer.
 *
 * Bridges the "contract layer" (types/config/registry) and the CLI so that a
 * project can actually *connect* skills at init time, from two sources:
 *
 *  1. local  - project-level `sovei-flow/skills/` (skill-map.yaml + skill-lock.yaml)
 *  2. global - user-level `~/.sovei/skills/` (shared skill pool), referenced by
 *              a project via its skill-map without copying the payload.
 *
 * The manager only mutates configuration files (skill-map/skill-lock). It never
 * injects third-party code into the workflow: the runtime chain stays owned by
 * Sovei's native stages until a binding is enabled AND locked AND a matching
 * adapter is registered.
 */

import { readFileSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { StorageBackend } from '../storage/types.js';
import {
  parseSkillLock,
  parseSkillMap,
  validateSkillConfiguration,
  type SkillLockConfig,
} from './config.js';
import type { SkillBinding, SkillStatus } from './types.js';

/** Project-relative skills directory (local access). */
export const SKILLS_DIR = 'sovei-flow/skills';
export const SKILL_MAP_FILE = `${SKILLS_DIR}/skill-map.yaml`;
export const SKILL_LOCK_FILE = `${SKILLS_DIR}/skill-lock.yaml`;

/** User-level skills directory (global access). */
export const GLOBAL_SKILLS_DIR = join(homedir(), '.sovei', 'skills');

export interface SkillsInitResult {
  created: boolean;
  mapPath: string;
  lockPath: string;
}

export interface SkillsBindResult {
  binding: SkillBinding;
  added: boolean;
  replaced: boolean;
}

export interface SkillStatusSummary {
  localDirExists: boolean;
  globalDirExists: boolean;
  mapExists: boolean;
  lockExists: boolean;
  valid: boolean;
  errors: string[];
  bindings: SkillBinding[];
  lockedSkills: string[];
}

export interface GlobalSkillEntry {
  /** Directory name under the global pool. */
  id: string;
  /** Absolute path to the global skill directory. */
  path: string;
  manifestPath: string;
}

const DEFAULT_MAP = `schemaVersion: 1
bindings:
  - stage: grill
    skillId: sovei/native/grill
    status: enabled
    fallback: native
  - stage: spec
    skillId: sovei/native/spec
    status: enabled
    fallback: native
  - stage: wayfind
    skillId: sovei/native/wayfind
    status: enabled
    fallback: native
`;

const DEFAULT_LOCK = `schemaVersion: 1
skills: {}
`;

export class SkillManager {
  constructor(private readonly storage: StorageBackend) {}

  /** Read raw map/lock content (or null when absent). */
  async readMap(): Promise<string | null> {
    return this.storage.read(SKILL_MAP_FILE);
  }

  async readLock(): Promise<string | null> {
    return this.storage.read(SKILL_LOCK_FILE);
  }

  /** Create the project-level skills directory skeleton (idempotent). */
  async ensureSkeleton(): Promise<SkillsInitResult> {
    const mapExists = await this.storage.exists(SKILL_MAP_FILE);
    const lockExists = await this.storage.exists(SKILL_LOCK_FILE);
    if (!mapExists) await this.storage.write(SKILL_MAP_FILE, DEFAULT_MAP);
    if (!lockExists) await this.storage.write(SKILL_LOCK_FILE, DEFAULT_LOCK);
    return { created: !mapExists || !lockExists, mapPath: SKILL_MAP_FILE, lockPath: SKILL_LOCK_FILE };
  }

  /** Parse + validate the current map/lock. Returns a normalized summary. */
  async status(): Promise<SkillStatusSummary> {
    const mapContent = await this.readMap();
    const lockContent = await this.readLock();
    const validation = validateSkillConfiguration(mapContent ?? '', lockContent ?? '');
    return {
      localDirExists: await this.storage.isDirectory(SKILLS_DIR),
      globalDirExists: await this.dirExistsOutsideProject(this.globalDirPath()),
      mapExists: mapContent !== null,
      lockExists: lockContent !== null,
      valid: validation.valid,
      errors: validation.errors,
      bindings: validation.map?.bindings ?? [],
      lockedSkills: validation.lock ? Object.keys(validation.lock.skills) : [],
    };
  }

  /**
   * Bind a skill to a stage in the project skill-map (local access).
   *
   * The binding is written as `candidate` by default so it never silently
   * changes runtime behaviour. Pass `--enable` to flip it to `enabled` (still
   * requires a matching lock + adapter to take effect).
   */
  async bind(stage: string, skillId: string, opts: { enable?: boolean } = {}): Promise<SkillsBindResult> {
    await this.ensureSkeleton();
    const content = await this.readMap();
    const map = parseSkillMap(content ?? '');
    const status: SkillStatus = opts.enable ? 'enabled' : 'candidate';
    const existing = map.bindings.findIndex((b) => b.stage === stage);
    const binding: SkillBinding = { stage, skillId, status, fallback: 'native' };
    if (existing >= 0) {
      map.bindings[existing] = binding;
    } else {
      map.bindings.push(binding);
    }
    await this.writeMap(map.bindings);

    // When enabling an external skill that is already present in the lock,
    // promote the lock entry to enabled too so map and lock stay consistent.
    if (opts.enable && !skillId.startsWith('sovei/native/')) {
      await this.syncLockStatus(skillId, 'enabled');
    }

    return { binding, added: existing < 0, replaced: existing >= 0 };
  }

  private async syncLockStatus(skillId: string, status: SkillStatus): Promise<void> {
    const lockContent = await this.readLock();
    if (!lockContent) return;
    let lock: SkillLockConfig;
    try {
      lock = parseSkillLock(lockContent);
    } catch {
      return;
    }
    const entry = lock.skills[skillId];
    if (!entry) return;
    entry.status = status;
    await this.writeLock(lock.skills);
  }

  /**
   * Register a skill that lives in a global pool (global access) into the
   * project lock as a `path` source. This pins the resolved path so a later
   * install/adapter step can load it deterministically.
   */
  async registerGlobalSkill(skillId: string, sourcePath: string, opts: { status?: SkillStatus } = {}): Promise<void> {
    await this.ensureSkeleton();
    const manifest = this.readManifestFromDir(sourcePath);
    const lockContent = await this.readLock();
    let lock: SkillLockConfig;
    try {
      lock = parseSkillLock(lockContent ?? '');
    } catch {
      // Tolerate an invalid/partial lock: rebuild from a clean slate so the
      // use command is always able to (re)register the requested skill.
      lock = { schemaVersion: 1, skills: {} };
    }
    lock.skills[skillId] = {
      source: sourcePath,
      version: manifest.version,
      ref: manifest.source.ref ?? '',
      commit: manifest.source.commit ?? '',
      checksum: 'sha256:' + '0'.repeat(64),
      license: manifest.license ?? 'UNKNOWN',
      status: opts.status ?? 'candidate',
    };
    await this.writeLock(lock.skills);
  }

  /** List skill directories available in the global pool. */
  async listGlobalSkills(): Promise<GlobalSkillEntry[]> {
    const poolDir = this.globalDirPath();
    // The global pool lives outside the project root, so it is reached via
    // Node fs directly (the project storage backend enforces path containment
    // and must not be used to read outside the workspace).
    let entries: { name: string; isDirectory: boolean }[];
    try {
      entries = await readdir(poolDir, { withFileTypes: true })
        .then((es) => es.map((e) => ({ name: e.name, isDirectory: e.isDirectory() })));
    } catch {
      return [];
    }
    const result: GlobalSkillEntry[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory) continue;
      const manifestPath = join(poolDir, entry.name, 'skill.json');
      let manifestExists = false;
      try {
        manifestExists = (await stat(manifestPath)).isFile();
      } catch {
        manifestExists = false;
      }
      result.push({
        id: entry.name,
        path: join(poolDir, entry.name),
        manifestPath: manifestExists ? manifestPath : '',
      });
    }
    return result;
  }

  /** Resolve the absolute path of a skill id from the global pool. */
  async resolveGlobalPath(skillId: string): Promise<string | null> {
    const poolDir = this.globalDirPath();
    const manifestPath = join(poolDir, skillId, 'skill.json');
    try {
      return (await stat(manifestPath)).isFile() ? join(poolDir, skillId) : null;
    } catch {
      return null;
    }
  }

  private globalDirPath(): string {
    return GLOBAL_SKILLS_DIR;
  }

  private async dirExistsOutsideProject(absPath: string): Promise<boolean> {
    try {
      return (await stat(absPath)).isDirectory();
    } catch {
      return false;
    }
  }

  private async writeMap(bindings: SkillBinding[]): Promise<void> {
    const lines = ['schemaVersion: 1', 'bindings:'];
    for (const b of bindings) {
      lines.push(`  - stage: ${b.stage}`);
      lines.push(`    skillId: ${b.skillId}`);
      lines.push(`    status: ${b.status}`);
      lines.push(`    fallback: native`);
    }
    await this.storage.write(SKILL_MAP_FILE, lines.join('\n') + '\n');
  }

  private async writeLock(skills: Record<string, unknown>): Promise<void> {
    const yaml = `schemaVersion: 1\nskills:\n${this.serializeSkills(skills)}`;
    await this.storage.write(SKILL_LOCK_FILE, yaml);
  }

  private serializeSkills(skills: Record<string, unknown>): string {
    const entries = Object.entries(skills);
    if (entries.length === 0) return '  {}\n';
    return entries.map(([id, value]) => this.serializeEntry(id, value as Record<string, string>)).join('');
  }

  private serializeEntry(id: string, entry: Record<string, string>): string {
    const keys = ['source', 'version', 'ref', 'commit', 'checksum', 'license', 'status'] as const;
    const lines = [`  ${id}:`];
    for (const key of keys) {
      // Quote empty values so YAML parses them back as '' rather than null,
      // matching the SkillLock schema (string-typed fields).
      const value = entry[key] ?? '';
      lines.push(`    ${key}: ${value === '' ? "''" : value}`);
    }
    return lines.join('\n') + '\n';
  }

  /** Read a SkillManifest from a skill directory (path source). */
  private readManifestFromDir(dirPath: string): {
    id: string;
    name: string;
    version: string;
    source: { type: string; locator: string; ref?: string; commit?: string };
    license?: string;
  } {
    const manifestPath = join(dirPath, 'skill.json');
    let raw: string;
    try {
      raw = readFileSync(manifestPath, 'utf8');
    } catch {
      throw new Error(`找不到 skill manifest：${manifestPath}`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`skill manifest 非法 JSON：${manifestPath}`);
    }
    const m = parsed as {
      id?: string; name?: string; version?: string;
      source?: { type?: string; locator?: string; ref?: string; commit?: string };
      license?: string;
    };
    if (!m.id || !m.name || !m.version) {
      throw new Error(`skill manifest 缺少 id/name/version：${manifestPath}`);
    }
    return {
      id: m.id,
      name: m.name,
      version: m.version,
      source: {
        type: m.source?.type ?? 'path',
        locator: m.source?.locator ?? dirPath,
        ref: m.source?.ref,
        commit: m.source?.commit,
      },
      license: m.license,
    };
  }
}
