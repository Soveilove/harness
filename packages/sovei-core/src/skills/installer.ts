/**
 * SkillInstaller - Install external skills from git repos or local paths.
 *
 * Copies SKILL.md files into harness/vendor/, computes sha256 checksums,
 * and updates skill-lock.yaml.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { parseSkillFile } from './adapter.js';
import { parseSkillLock } from './config.js';
import type { SkillLockEntry } from './config.js';

export interface InstallResult {
  skillId: string;
  vendorPath: string;
  checksum: string;
  version: string;
  commit: string;
}

export interface GitSkillSpec {
  /** Path within the repo, e.g. "skills/productivity/grilling" */
  repoPath: string;
  /** Skill ID for the lock, e.g. "mattpocock/grilling" */
  skillId: string;
}

const VENDOR_BASE = 'harness/vendor/mattpocock/skills';
const LOCK_FILE = 'harness/skills/skill-lock.yaml';

export class SkillInstaller {
  constructor(private readonly rootPath: string) {}

  /** Install skills from a git repository at a specific ref. */
  installFromGit(repoUrl: string, ref: string, specs: GitSkillSpec[]): InstallResult[] {
    const tempDir = join(tmpdir(), `sovei-skill-${Date.now()}`);
    execSync(`git clone --depth 1 --branch ${ref} ${repoUrl} "${tempDir}"`, { stdio: 'pipe' });
    const commit = execSync(`git -C "${tempDir}" rev-parse HEAD`, { encoding: 'utf8' }).trim();

    const results: InstallResult[] = [];
    for (const spec of specs) {
      const sourceDir = join(tempDir, spec.repoPath);
      if (!existsSync(join(sourceDir, 'SKILL.md'))) {
        throw new Error(`SKILL.md not found at ${spec.repoPath} in repository`);
      }
      results.push(this.copyToVendor(sourceDir, spec.skillId, ref, commit));
    }

    rmSync(tempDir, { recursive: true, force: true });
    return results;
  }

  /** Install a skill from a local directory. */
  installFromPath(localDir: string, skillId: string): InstallResult {
    if (!existsSync(join(localDir, 'SKILL.md'))) {
      throw new Error(`SKILL.md not found at ${localDir}`);
    }
    return this.copyToVendor(localDir, skillId, '', '');
  }

  private copyToVendor(sourceDir: string, skillId: string, ref: string, commit: string): InstallResult {
    const parts = sourceDir.replace(/\\/g, '/').split('/');
    const skillName = parts[parts.length - 1];
    const category = parts[parts.length - 2] || 'misc';
    const vendorRel = `${VENDOR_BASE}/${category}/${skillName}`;
    const vendorAbs = join(this.rootPath, vendorRel);

    mkdirSync(vendorAbs, { recursive: true });
    copyFileSync(join(sourceDir, 'SKILL.md'), join(vendorAbs, 'SKILL.md'));

    const content = readFileSync(join(vendorAbs, 'SKILL.md'), 'utf8');
    const checksum = 'sha256:' + createHash('sha256').update(content).digest('hex');
    const parsed = parseSkillFile(content);

    this.updateLock(skillId, {
      source: vendorRel,
      version: '1.0.0',
      ref: ref || "''",
      commit: commit || "''",
      checksum,
      license: 'MIT',
      status: 'candidate',
    });

    return { skillId, vendorPath: vendorRel, checksum, version: '1.0.0', commit };
  }

  /** Update or insert a skill entry in skill-lock.yaml. */
  private updateLock(skillId: string, entry: SkillLockEntry): void {
    const lockPath = join(this.rootPath, LOCK_FILE);
    let lock: { schemaVersion: number; skills: Record<string, SkillLockEntry> };

    try {
      const raw = readFileSync(lockPath, 'utf8');
      lock = parseSkillLock(raw);
    } catch {
      lock = { schemaVersion: 1, skills: {} };
    }

    lock.skills[skillId] = entry;

    const lines = ['schemaVersion: 1', 'skills:'];
    for (const [id, e] of Object.entries(lock.skills)) {
      lines.push(`  ${id}:`);
      lines.push(`    source: ${e.source}`);
      lines.push(`    version: ${e.version}`);
      lines.push(`    ref: ${e.ref === '' ? "''" : e.ref}`);
      lines.push(`    commit: ${e.commit === '' ? "''" : e.commit}`);
      lines.push(`    checksum: ${e.checksum}`);
      lines.push(`    license: ${e.license}`);
      lines.push(`    status: ${e.status}`);
    }
    writeFileSync(lockPath, lines.join('\n') + '\n');
  }
}
