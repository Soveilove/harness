import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import {
  DEFAULT_WORKFLOW,
  EventStore,
  KnowledgeStore,
  MemoryStorage,
  WorkflowEngine,
} from '../dist/index.js';

const execFileAsync = promisify(execFile);
const cli = join(import.meta.dirname, '..', 'dist', 'cli', 'index.js');

const logger = { info() {}, warn() {}, error() {}, debug() {} };
const config = {
  rootPath: '.',
  specsDir: 'specs',
  knowledgeDir: 'sovei-flow/project/knowledge',
  harnessDir: 'sovei-flow',
  project: { name: 'test', description: 'test', techStack: {}, started: '2026-01-01' },
  workflow: { version: '2.0.0', stageOrder: DEFAULT_WORKFLOW.stageOrder },
};

function createEngine() {
  const storage = new MemoryStorage();
  return { storage, engine: new WorkflowEngine(storage, new KnowledgeStore(storage), logger, config) };
}

// ── AC-2：stageOrder 更新 ──

test('AC-2: DEFAULT_WORKFLOW.stageOrder places explore as the first stage', () => {
  assert.equal(DEFAULT_WORKFLOW.stageOrder[0], 'explore');
  assert.equal(DEFAULT_WORKFLOW.stageOrder.length, 13);
  assert.deepEqual(
    DEFAULT_WORKFLOW.stageOrder,
    ['explore', 'load', 'grill', 'wayfind', 'spec', 'scope', 'plan', 'tasks', 'implement', 'converge', 'verify', 'learn', 'sync'],
  );
});

// ── AC-1：explore 阶段定义 ──

test('AC-1: prepareStage(explore) produces prompt mentioning PRD + business-coverage + split proposal', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('001-explore-def');
  const result = await engine.prepareStage('001-explore-def', 'explore');
  assert.match(result.prompt, /# 阶段：explore/);
  assert.match(result.prompt, /PRD/);
  assert.match(result.prompt, /business-coverage/);
  assert.match(result.prompt, /拆分提议/);
  assert.match(result.prompt, /exploration\.md/);
  assert.match(result.prompt, /sub-change-map\.md/);
});

test('AC-1: completeStage(explore) rejects when exploration.md is missing', async () => {
  const { engine } = createEngine();
  await engine.bootstrap('001-explore-missing');
  await engine.prepareStage('001-explore-missing', 'explore');
  await assert.rejects(
    engine.completeStage('001-explore-missing', 'explore'),
    /exploration\.md/,
  );
});

test('AC-1: completeStage(explore) succeeds when exploration.md + sub-change-map.md exist', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('001-explore-ok');
  await engine.prepareStage('001-explore-ok', 'explore');
  await storage.write('specs/001-explore-ok/exploration.md', '# 需求探索\n\n核心目标。');
  await storage.write('specs/001-explore-ok/sub-change-map.md', 'no-split');
  const state = await engine.completeStage('001-explore-ok', 'explore');
  assert.deepEqual(state.completedStages, ['explore']);
  assert.equal(state.currentStage, 'load');
});

// ── AC-2：向后兼容（老 Feature 无 explore 事件可推进 load）──

test('AC-2: backward compat — old Feature without explore events can complete load directly', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('001-legacy');
  // Simulate old Feature: directly prepare + complete load, skipping explore
  const events = new EventStore(storage);
  const path = 'specs/001-legacy';
  await events.append(path, { type: 'STAGE_PREPARED', stage: 'load' }, 'load');
  await storage.write('specs/001-legacy/load-summary.md', '# 加载摘要\n\n代码库现状摘要。');
  await events.append(path, { type: 'STAGE_COMPLETE', stage: 'load', artifacts: ['load-summary.md'] }, 'load');
  const state = await events.replay(path, DEFAULT_WORKFLOW);
  await events.persistState(path, state);
  // load completed despite no explore event — explore is silently skipped
  assert.ok(state.completedStages.includes('load'));
  assert.equal(state.currentStage, 'grill');
});

// ── AC-3：explore 命令兼任入口（CLI 测试）──

test('AC-3: `workflow explore <feature> --brief` bootstraps Feature and writes brief.md', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-brief-'));
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', '001-brief-entry', '--brief', '实现用户登录的 OAuth2 支持',
    ]);
    assert.match(stdout, /已写入需求描述/);
    const brief = await readFile(join(root, 'specs', '001-brief-entry', 'brief.md'), 'utf8');
    assert.equal(brief, '实现用户登录的 OAuth2 支持');
    // Feature state should exist and point to explore
    const state = await readFile(join(root, 'specs', '001-brief-entry', 'workflow-state.yaml'), 'utf8');
    assert.match(state, /currentStage: "?explore"?/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AC-3: `workflow explore <feature> --prd <path>` copies PRD to specs/<feature>/prd.md', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-prd-'));
  try {
    const prdPath = join(root, 'my-prd.md');
    await writeFile(prdPath, '# PRD\n\n## 目标\n实现用户认证。\n', 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', '001-prd-entry', '--prd', prdPath,
    ]);
    assert.match(stdout, /已读取 PRD/);
    const copied = await readFile(join(root, 'specs', '001-prd-entry', 'prd.md'), 'utf8');
    assert.equal(copied, '# PRD\n\n## 目标\n实现用户认证。\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AC-3: `workflow explore --complete` validates exploration.md + sub-change-map.md', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-complete-'));
  try {
    // bootstrap + prepare explore
    await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', '001-complete-test', '--brief', 'test requirement',
    ]);
    // --complete without artifacts should fail
    await assert.rejects(
      execFileAsync(process.execPath, [cli, '--root', root, 'workflow', 'explore', '001-complete-test', '--complete']),
    );
    // write artifacts, then --complete succeeds
    await writeFile(join(root, 'specs', '001-complete-test', 'exploration.md'), '# 探索\n\n需求理解。', 'utf8');
    await writeFile(join(root, 'specs', '001-complete-test', 'sub-change-map.md'), 'no-split', 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', '001-complete-test', '--complete',
    ]);
    assert.match(stdout, /阶段 'explore' 已完成/);
    // next stage should be load
    assert.match(stdout, /sovei workflow load 001-complete-test/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ── AC-5：feature split 前置条件放宽 ──

test('AC-5: feature split --json works after explore (exploration.md exists, no spec.md/scope.md)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-split-'));
  try {
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', root, '--blank']);
    await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', '001-split-after-explore', '--brief', 'multi-domain requirement',
    ]);
    await writeFile(join(root, 'specs', '001-split-after-explore', 'exploration.md'), '# 探索\n\n需求理解。', 'utf8');
    await writeFile(
      join(root, 'specs', '001-split-after-explore', 'sub-change-map.md'),
      '# Sub-Change Map\n\n| SC-ID | 名称 | 目标 | 依赖 |\n|---|---|---|---|\n| SC-001 | 子变更A | 目标A | - |\n',
      'utf8',
    );
    // feature split --json should succeed because exploration.md exists
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'feature', 'split', '001-split-after-explore', '--json',
    ]);
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.featureId || parsed.parentFeatureId || parsed.subChanges || parsed.proposal || parsed.contract);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
