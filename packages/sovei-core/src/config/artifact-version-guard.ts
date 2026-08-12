/**
 * Artifact Version Consistency Guard
 *
 * Protects against silently treating stale onboarding artifacts as current
 * truth after a CLI upgrade. `business-map.json` and `redlines-seed.json`
 * record the `scannerVersion` they were generated with; this module compares
 * that against the current CLI `VERSION` and, on mismatch, either warns+bail
 * (read-side guard) or tells the writer that a full refresh is about to happen
 * (write-side guard).
 *
 * Design notes:
 * - Read-side guard returns the list of stale artifact paths. The caller
 *   decides to block or to proceed (optionally printing a "bypass" notice).
 * - Version comparison is exact string equality; no range/semver ordering.
 * - Missing or corrupted artifacts are treated as "not stale" (silently
 *   skipped) so that commands do not break on projects that never onboarded.
 */

import type { StorageBackend } from '../storage/types.js';
import { VERSION } from './version.js';

/** Paths of onboarding artifacts that embed a scannerVersion. */
export const ARTIFACT_FILES = {
  businessMap: 'sovei-flow/project/codegraph/business-map.json',
  redlineSeed: 'sovei-flow/project/governance/redlines-seed.json',
} as const;

/** Read the scannerVersion embedded in an artifact. Returns null if the file
 * is missing, unparseable, or has no scannerVersion field. */
export async function readScannerVersion(
  storage: StorageBackend,
  path: string,
): Promise<string | null> {
  const content = await storage.read(path);
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { scannerVersion?: unknown };
    return typeof parsed.scannerVersion === 'string' ? parsed.scannerVersion : null;
  } catch {
    return null;
  }
}

/** Return the subset of `paths` whose embedded scannerVersion exists and
 * differs from the current CLI VERSION. */
export async function findStaleArtifacts(
  storage: StorageBackend,
  paths: string[],
): Promise<string[]> {
  const stale: string[] = [];
  for (const path of paths) {
    const version = await readScannerVersion(storage, path);
    if (version !== null && version !== VERSION) stale.push(path);
  }
  return stale;
}

/** Read-side guard. Returns the stale artifacts list. When stale artifacts
 * exist, prints a prominent warning and, unless `opts.force`/`opts.refresh` is
 * set, throws to block the command with a non-zero exit code. When bypassed,
 * prints a notice so the operator knows they are reading old artifacts.
 *
 * @returns the stale artifact paths (empty means fresh/clean).
 */
export async function assertArtifactsCurrent(
  storage: StorageBackend,
  paths: string[],
  opts: { force: boolean; refresh: boolean },
): Promise<string[]> {
  const stale = await findStaleArtifacts(storage, paths);
  if (stale.length === 0) return stale;

  const bypass = opts.force || opts.refresh;
  console.log('');
  console.log('  ⚠️  检测到由旧版 CLI 生成的 onboarding 产物（当前 CLI 为 v' + VERSION + '）：');
  for (const path of stale) {
    const version = await readScannerVersion(storage, path);
    console.log('    · ' + path + '（由 v' + version + ' 生成）');
  }
  console.log('      产物可能不完整（旧版扫描深度/过滤规则差异）。');
  console.log('      建议重新生成：sovei project rescan');
  console.log('');

  if (!bypass) {
    throw new Error(
      '旧版产物被守卫拦截。如需继续读取旧产物，请加 --force 或 --refresh；' +
        '如需刷新产物，请运行 sovei project rescan。',
    );
  }

  console.log('  已放行旧产物读取（--force/--refresh）。');
  console.log('');
  return stale;
}

/** Write-side guard. Returns the embedded version of the artifact if it is
 * stale (differs from current VERSION), otherwise null. Callers (onboard /
 * rescan) use a non-null return to tell the operator a full refresh is about
 * to happen. */
export async function getStaleArtifactVersion(
  storage: StorageBackend,
  path: string,
): Promise<string | null> {
  const version = await readScannerVersion(storage, path);
  if (version !== null && version !== VERSION) return version;
  return null;
}
