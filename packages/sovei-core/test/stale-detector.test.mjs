import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import {
  MemoryStorage,
  FilesystemStorage,
  WorkflowEngine,
  KnowledgeStore,
  EventStore,
  DEFAULT_WORKFLOW,
  checkStale,
  serializeSyncBaseline,
  parseSyncBaseline,
  formatStaleWarning,
  SYNC_BASELINE_PATH,
} from '../dist/index.js';

const execFileAsync = promisify(execFile);

function baseline(content) {
  return { schemaVersion: 1, ...content };
}

test('checkStale: no baseline file => not stale', async () => {
  const storage = new MemoryStorage();
  const status = await checkStale(storage, '/some/root');
  assert.equal(status.isStale, false);
  assert.equal(status.baselineRevision, null);
  assert.equal(status.currentHead, null);
});

test('checkStale: HEAD unreadable (not a git repo) => not stale even with baseline', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-stale-nogit-'));
  try {
    const storage = new MemoryStorage();
    await storage.write(SYNC_BASELINE_PATH, serializeSyncBaseline(baseline({ branch: 'main', head: 'abc', recordedAt: '2026-01-01T00:00:00Z' })));
    const status = await checkStale(storage, root);
    assert.equal(status.isStale, false);
    assert.equal(status.baselineRevision, 'abc');
    assert.equal(status.currentHead, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('checkStale: different branch => not stale', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-stale-branch-'));
  try {
    await gitInit(root);
    await gitCommit(root, 'baseline');
    const head = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    const storage = new MemoryStorage();
    await storage.write(SYNC_BASELINE_PATH, serializeSyncBaseline(baseline({ branch: 'other-branch', head, recordedAt: '2026-01-01T00:00:00Z' })));
    const status = await checkStale(storage, root);
    assert.equal(status.isStale, false);
    assert.equal(status.branch, 'other-branch');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('checkStale: same branch, HEAD === baseline => not stale', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-stale-same-'));
  try {
    await gitInit(root);
    await gitCommit(root, 'baseline');
    const head = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    const branch = (await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root })).stdout.trim();
    const storage = new MemoryStorage();
    await storage.write(SYNC_BASELINE_PATH, serializeSyncBaseline(baseline({ branch, head, recordedAt: '2026-01-01T00:00:00Z' })));
    const status = await checkStale(storage, root);
    assert.equal(status.isStale, false);
    assert.equal(status.branch, branch);
    assert.equal(status.baselineRevision, head);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('checkStale: same branch, HEAD advanced past baseline => stale', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-stale-adv-'));
  try {
    await gitInit(root);
    await gitCommit(root, 'baseline');
    const baselineHead = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    const branch = (await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root })).stdout.trim();
    await gitCommit(root, 'new change');
    const currentHead = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();

    const storage = new MemoryStorage();
    await storage.write(SYNC_BASELINE_PATH, serializeSyncBaseline(baseline({ branch, head: baselineHead, recordedAt: '2026-01-01T00:00:00Z' })));
    const status = await checkStale(storage, root);
    assert.equal(status.isStale, true);
    assert.equal(status.baselineRevision, baselineHead);
    assert.equal(status.currentHead, currentHead);
    assert.equal(status.branch, branch);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('parseSyncBaseline: tolerant of malformed / missing content', () => {
  assert.equal(parseSyncBaseline(null), null);
  assert.equal(parseSyncBaseline(''), null);
  assert.equal(parseSyncBaseline('not json'), null);
  const parsed = parseSyncBaseline(serializeSyncBaseline(baseline({ branch: 'main', head: 'abc', recordedAt: 'x' })));
  assert.deepEqual(parsed, { schemaVersion: 1, branch: 'main', head: 'abc', recordedAt: 'x' });
});

test('formatStaleWarning: empty when not stale, meaningful when stale', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-stale-warn-'));
  try {
    await gitInit(root);
    await gitCommit(root, 'baseline');
    const baselineHead = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    const branch = (await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root })).stdout.trim();
    await gitCommit(root, 'change');
    const storage = new MemoryStorage();
    await storage.write(SYNC_BASELINE_PATH, serializeSyncBaseline(baseline({ branch, head: baselineHead, recordedAt: '2026-01-01T00:00:00Z' })));
    const status = await checkStale(storage, root);
    const warning = formatStaleWarning(status);
    assert.match(warning, /治理资产可能已过期/);
    assert.match(warning, /校准/);
    assert.equal(formatStaleWarning({ isStale: false, baselineRevision: null, currentHead: null, recordedAt: null, branch: null }), '');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function gitInit(root) {
  await execFileAsync('git', ['init'], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  await execFileAsync('git', ['config', 'user.name', 'Sovei Test'], { cwd: root });
}

async function gitCommit(root, message) {
  const file = join(root, 'target.txt');
  await writeFile(file, `${message}\n`);
  await execFileAsync('git', ['add', '.'], { cwd: root });
  await execFileAsync('git', ['commit', '-m', message], { cwd: root });
}

// ── sync 阶段写入仓库级基线（集成） ──

const logger = { info() {}, warn() {}, error() {}, debug() {} };

function engineConfig(root) {
  return {
    rootPath: root,
    specsDir: 'specs',
    knowledgeDir: 'harness/project/knowledge',
    harnessDir: 'harness',
    project: { name: 'test', description: 'test', techStack: {}, started: '2026-01-01' },
    workflow: { version: '2.0.0', stageOrder: DEFAULT_WORKFLOW.stageOrder },
  };
}

test('sync stage completion writes a repository-level baseline file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-stale-sync-'));
  try {
    await gitInit(root);
    await gitCommit(root, 'baseline');
    const head = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    const branch = (await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root })).stdout.trim();

    const storage = new FilesystemStorage(root);
    const engine = new WorkflowEngine(storage, new KnowledgeStore(storage), logger, engineConfig(root));
    const featureId = '024-sync-baseline';
    const path = `specs/${featureId}`;

    // 用事件日志快进到 learn 阶段完成
    const events = new EventStore(storage);
    await events.append(path, { type: 'BOOTSTRAP', featureId });
    for (const stage of DEFAULT_WORKFLOW.stageOrder.slice(0, 11)) {
      await events.append(path, { type: 'STAGE_PREPARED', stage }, stage);
      await events.append(path, { type: 'STAGE_COMPLETE', stage, artifacts: [] }, stage);
    }
    // 准备 sync 阶段（生成 sync-report.md 模板）
    await mkdir(join(root, path), { recursive: true });
    await writeFile(join(root, path, 'learning-report.md'), '# Learning Report\n\n已审核。', 'utf8');
    await engine.prepareStage(featureId, 'sync');
    // 覆盖 sync-report.md 模板为真实内容
    await writeFile(join(root, path, 'sync-report.md'), '# Sync Report\n\n已同步。', 'utf8');

    await engine.completeStage(featureId, 'sync');

    const written = JSON.parse(await readFile(join(root, SYNC_BASELINE_PATH), 'utf8'));
    assert.equal(written.schemaVersion, 1);
    assert.equal(written.branch, branch);
    assert.equal(written.head, head);
    assert.ok(written.recordedAt);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync stage completion skips baseline write when not a git repository', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-stale-sync-nogit-'));
  try {
    const storage = new FilesystemStorage(root);
    const engine = new WorkflowEngine(storage, new KnowledgeStore(storage), logger, engineConfig(root));
    const featureId = '024-sync-nogit';
    const path = `specs/${featureId}`;
    const events = new EventStore(storage);
    await events.append(path, { type: 'BOOTSTRAP', featureId });
    for (const stage of DEFAULT_WORKFLOW.stageOrder.slice(0, 11)) {
      await events.append(path, { type: 'STAGE_PREPARED', stage }, stage);
      await events.append(path, { type: 'STAGE_COMPLETE', stage, artifacts: [] }, stage);
    }
    await mkdir(join(root, path), { recursive: true });
    await writeFile(join(root, path, 'learning-report.md'), '# Learning Report\n\n已审核。', 'utf8');
    await engine.prepareStage(featureId, 'sync');
    await writeFile(join(root, path, 'sync-report.md'), '# Sync Report\n\n已同步。', 'utf8');

    await engine.completeStage(featureId, 'sync');

    // 非 git 仓库 → 基线文件不写入
    const exists = await storage.exists(SYNC_BASELINE_PATH);
    assert.equal(exists, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
