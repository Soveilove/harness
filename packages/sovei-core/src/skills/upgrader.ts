/**
 * SkillUpgrader - Check for upstream updates, diff, and upgrade vendored skills.
 *
 * Pulls the latest version from the upstream git repo, compares SKILL.md
 * content, and updates the vendor files and lock after user confirmation.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { parseSkillLock } from './config.js';
import type { SkillLockEntry } from './config.js';

const LOCK_FILE = 'harness/skills/skill-lock.yaml';

export interface UpdateCheckResult {
  skillId: string;
  currentCommit: string;
  latestCommit: string;
  hasUpdate: boolean;
}

export interface UpgradeResult {
  skillId: string;
  oldCommit: string;
  newCommit: string;
  newChecksum: string;
}

const KNOWN_REPOS: Record<string, string> = {
  mattpocock: 'https://github.com/mattpocock/skills.git',
};

export class SkillUpgrader {
  constructor(private readonly rootPath: string) {}

  /** Check if an upstream update is available for a skill. */
  checkUpdate(skillId: string): UpdateCheckResult {
    const lock = this.readLock();
    const entry = lock.skills[skillId];
    if (!entry) throw new Error(`Skill '${skillId}' not found in skill-lock.yaml`);

    const vendor = entry.source.split('/').slice(-2).join('/'); // e.g. "productivity/grilling"
    const repoUrl = this.resolveRepoUrl(skillId);

    const tempDir = join(tmpdir(), `sovei-skill-check-${Date.now()}`);
    execSync(`git clone --depth 1 ${repoUrl} "${tempDir}"`, { stdio: 'pipe' });
    const latestCommit = execSync(`git -C "${tempDir}" rev-parse HEAD`, { encoding: 'utf8' }).trim();

    // Check if SKILL.md exists in the same relative path
    const upstreamSkillPath = join(tempDir, 'skills', vendor, 'SKILL.md');
    if (!existsSync(upstreamSkillPath)) {
      rmSync(tempDir, { recursive: true, force: true });
      throw new Error(`SKILL.md not found upstream at skills/${vendor}/SKILL.md`);
    }

    rmSync(tempDir, { recursive: true, force: true });
    return {
      skillId,
      currentCommit: entry.commit,
      latestCommit,
      hasUpdate: entry.commit !== latestCommit,
    };
  }

  /** Show the diff between the current vendor version and upstream. */
  diff(skillId: string): string {
    const lock = this.readLock();
    const entry = lock.skills[skillId];
    if (!entry) throw new Error(`Skill '${skillId}' not found in skill-lock.yaml`);

    const vendor = entry.source.split('/').slice(-2).join('/');
    const repoUrl = this.resolveRepoUrl(skillId);
    const vendorFile = join(this.rootPath, entry.source, 'SKILL.md');

    const tempDir = join(tmpdir(), `sovei-skill-diff-${Date.now()}`);
    execSync(`git clone --depth 1 ${repoUrl} "${tempDir}"`, { stdio: 'pipe' });
    const upstreamFile = join(tempDir, 'skills', vendor, 'SKILL.md');

    let output: string;
    try {
      output = execSync(`git diff --no-index "${vendorFile}" "${upstreamFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (err) {
      // git diff returns exit code 1 when differences exist
      output = (err as { stdout?: string }).stdout ?? 'No output';
    }

    rmSync(tempDir, { recursive: true, force: true });
    return output || 'No differences found.';
  }

  /** Upgrade a skill to the latest upstream version. */
  upgrade(skillId: string): UpgradeResult {
    const lock = this.readLock();
    const entry = lock.skills[skillId];
    if (!entry) throw new Error(`Skill '${skillId}' not found in skill-lock.yaml`);

    const vendor = entry.source.split('/').slice(-2).join('/');
    const repoUrl = this.resolveRepoUrl(skillId);

    const tempDir = join(tmpdir(), `sovei-skill-upgrade-${Date.now()}`);
    execSync(`git clone --depth 1 ${repoUrl} "${tempDir}"`, { stdio: 'pipe' });
    const newCommit = execSync(`git -C "${tempDir}" rev-parse HEAD`, { encoding: 'utf8' }).trim();

    const upstreamSkillDir = join(tempDir, 'skills', vendor);
    const upstreamFile = join(upstreamSkillDir, 'SKILL.md');
    if (!existsSync(upstreamFile)) {
      rmSync(tempDir, { recursive: true, force: true });
      throw new Error(`SKILL.md not found upstream at skills/${vendor}/SKILL.md`);
    }

    // Copy new version to vendor
    const vendorAbs = join(this.rootPath, entry.source);
    copyFileSync(upstreamFile, join(vendorAbs, 'SKILL.md'));

    // Compute new checksum
    const content = readFileSync(join(vendorAbs, 'SKILL.md'), 'utf8');
    const newChecksum = 'sha256:' + createHash('sha256').update(content).digest('hex');

    // Update lock
    entry.commit = newCommit;
    entry.checksum = newChecksum;
    this.writeLock(lock);

    rmSync(tempDir, { recursive: true, force: true });
    return {
      skillId,
      oldCommit: entry.commit === newCommit ? entry.commit : entry.commit,
      newCommit,
      newChecksum,
    };
  }

  private resolveRepoUrl(skillId: string): string {
    const vendor = skillId.split('/')[0];
    const url = KNOWN_REPOS[vendor];
    if (!url) throw new Error(`Unknown vendor '${vendor}'. Known: ${Object.keys(KNOWN_REPOS).join(', ')}`);
    return url;
  }

  private readLock(): { schemaVersion: number; skills: Record<string, SkillLockEntry> } {
    const raw = readFileSync(join(this.rootPath, LOCK_FILE), 'utf8');
    return parseSkillLock(raw);
  }

  private writeLock(lock: { schemaVersion: number; skills: Record<string, SkillLockEntry> }): void {
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
    writeFileSync(join(this.rootPath, LOCK_FILE), lines.join('\n') + '\n');
  }
}
