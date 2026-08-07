import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import {
  FilesystemStorage,
  MemoryStorage,
  UsageRecorder,
  unknownTokenUsage,
  verifyGitChanges,
} from '../dist/index.js';

const execFileAsync = promisify(execFile);

function baseEvent(runId = 'run-1') {
  return {
    schemaVersion: 1,
    event: 'run-start',
    runId,
    channel: 'quick',
    stage: null,
    occurredAt: new Date().toISOString(),
    policyVersion: '1',
    baselineRevision: null,
    tokenUsage: unknownTokenUsage(),
    targetDigest: null,
  };
}

test('usage recorder initializes once, appends events, and identifies interrupted runs', async () => {
  const storage = new MemoryStorage();
  const recorder = new UsageRecorder(storage);
  assert.equal(await recorder.ensureFile(), true);
  assert.equal(await recorder.ensureFile(), false);
  await recorder.append(baseEvent('run-1'));
  await recorder.append({
    schemaVersion: 1,
    event: 'run-end',
    runId: 'run-2',
    channel: 'quick',
    stage: null,
    occurredAt: new Date().toISOString(),
    policyVersion: '1',
    baselineRevision: null,
    tokenUsage: unknownTokenUsage(),
    status: 'completed',
    escalated: false,
    testsPassed: true,
    calls: 1,
    latencyMs: 12,
  });
  const events = await recorder.read();
  assert.equal(events.length, 2);
  assert.deepEqual(await recorder.interruptedRunIds(), ['run-1']);
  assert.equal(events[0].tokenUsage.inputTokens, null);
});

test('git verifier reports changed and out-of-scope files without modifying the worktree', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-git-'));
  try {
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
    await execFileAsync('git', ['config', 'user.name', 'Sovei Test'], { cwd: root });
    await writeFile(join(root, 'target.txt'), 'before\n');
    await execFileAsync('git', ['add', 'target.txt'], { cwd: root });
    await execFileAsync('git', ['commit', '-m', 'baseline'], { cwd: root });
    const baseline = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    await writeFile(join(root, 'target.txt'), 'after\n');
    await writeFile(join(root, 'outside.txt'), 'outside\n');

    const result = await verifyGitChanges({ workspaceRoot: root, baselineRevision: baseline, declaredPaths: ['target.txt'] });
    assert.equal(result.status, 'uncertain');
    assert.deepEqual(result.changedFiles, ['outside.txt', 'target.txt']);
    assert.deepEqual(result.outOfScopeFiles, ['outside.txt']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('git verifier reports non-repository and unreadable baseline explicitly', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-nogit-'));
  try {
    assert.equal((await verifyGitChanges({ workspaceRoot: root, declaredPaths: ['target.txt'] })).status, 'not-a-repository');
    await execFileAsync('git', ['init'], { cwd: root });
    assert.equal((await verifyGitChanges({ workspaceRoot: root, baselineRevision: 'missing', declaredPaths: ['target.txt'] })).status, 'baseline-unreadable');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// Keep FilesystemStorage in this suite so the append contract is exercised by both backends elsewhere.
void FilesystemStorage;
