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
  workflow: { version: '4.0.0', stageOrder: DEFAULT_WORKFLOW.stageOrder },
};

function createEngine() {
  const storage = new MemoryStorage();
  return { storage, engine: new WorkflowEngine(storage, new KnowledgeStore(storage), logger, config) };
}

// ── AC-2：stageOrder（v4.0.0：12 阶段，load 已被 explore 吸收）──

test('AC-2: DEFAULT_WORKFLOW.stageOrder places explore as the sole entry, no load', () => {
  assert.equal(DEFAULT_WORKFLOW.stageOrder[0], 'explore');
  assert.equal(DEFAULT_WORKFLOW.stageOrder.length, 12);
  assert.ok(!DEFAULT_WORKFLOW.stageOrder.includes('load'));
  assert.deepEqual(
    DEFAULT_WORKFLOW.stageOrder,
    ['explore', 'grill', 'wayfind', 'spec', 'scope', 'plan', 'tasks', 'implement', 'converge', 'verify', 'learn', 'sync'],
  );
});

// ── AC-1：explore 阶段定义（吸收 load 的代码探索 + 风险识别 + 依赖图拆分）──

test('AC-1: prepareStage(explore) prompt covers 读懂需求 + 探索代码 + 依赖图拆分', async () => {
  const { engine } = createEngine();
  await engine.bootstrap('001-explore-def');
  const result = await engine.prepareStage('001-explore-def', 'explore');
  assert.match(result.prompt, /# 阶段：explore/);
  assert.match(result.prompt, /读懂需求/);
  assert.match(result.prompt, /探索代码现状/);
  assert.match(result.prompt, /依赖/);
  assert.match(result.prompt, /命名规范/);
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

test('AC-1: completeStage(explore) succeeds and advances directly to grill', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('001-explore-ok');
  await engine.prepareStage('001-explore-ok', 'explore');
  await storage.write('specs/001-explore-ok/exploration.md', '# 需求探索\n\n核心目标。');
  await storage.write('specs/001-explore-ok/sub-change-map.md', 'no-split');
  const state = await engine.completeStage('001-explore-ok', 'explore');
  assert.deepEqual(state.completedStages, ['explore']);
  assert.equal(state.currentStage, 'grill');
});

// ── AC-3：explore 命令兼任自然语言入口（CLI 测试）──

test('AC-3: `workflow explore "<需求>" --slug` allocates NNN-slug and records requirement', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-entry-'));
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', '实现用户登录的 OAuth2 支持', '--slug', 'oauth-login',
    ]);
    assert.match(stdout, /已分配 Feature：001-oauth-login/);
    assert.match(stdout, /已记录需求原文/);
    const requirement = await readFile(join(root, 'specs', '001-oauth-login', 'requirement.md'), 'utf8');
    assert.match(requirement, /OAuth2/);
    const state = JSON.parse(await readFile(join(root, 'specs', '001-oauth-login', 'workflow-state.json'), 'utf8'));
    assert.equal(state.currentStage, 'explore');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AC-3: sequence auto-increments by scanning existing specs/', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-seq-'));
  try {
    // Pre-seed an existing Feature directory
    await mkdir(join(root, 'specs', '007-existing'), { recursive: true });
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', '新需求', '--slug', 'next-thing',
    ]);
    assert.match(stdout, /已分配 Feature：008-next-thing/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AC-3: explore rejects a malformed slug (uppercase/space/underscore)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-badslug-'));
  try {
    await assert.rejects(
      execFileAsync(process.execPath, [
        cli, '--root', root, 'workflow', 'explore', '需求', '--slug', 'Bad_Slug Name',
      ]),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AC-3: explore without --slug fails with guidance', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-noslug-'));
  try {
    await assert.rejects(
      execFileAsync(process.execPath, [cli, '--root', root, 'workflow', 'explore', '需求描述']),
      /slug/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AC-3: `workflow explore ... --prd <path>` writes PRD to specs/<feature>/prd.md', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-prd-'));
  try {
    const prdPath = join(root, 'my-prd.md');
    await writeFile(prdPath, '# PRD\n\n## 目标\n实现用户认证。\n', 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', '按 PRD 实现', '--slug', 'user-auth', '--prd', prdPath,
    ]);
    assert.match(stdout, /已读取 PRD/);
    const copied = await readFile(join(root, 'specs', '001-user-auth', 'prd.md'), 'utf8');
    assert.equal(copied, '# PRD\n\n## 目标\n实现用户认证。\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AC-3: `workflow explore --feature <id> --complete` validates artifacts and advances to grill', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-complete-'));
  try {
    await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', 'test requirement', '--slug', 'complete-test',
    ]);
    // --complete without artifacts should fail
    await assert.rejects(
      execFileAsync(process.execPath, [
        cli, '--root', root, 'workflow', 'explore', '--feature', '001-complete-test', '--complete',
      ]),
    );
    await writeFile(join(root, 'specs', '001-complete-test', 'exploration.md'), '# 探索\n\n需求理解。', 'utf8');
    await writeFile(join(root, 'specs', '001-complete-test', 'sub-change-map.md'), 'no-split', 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', '--feature', '001-complete-test', '--complete',
    ]);
    assert.match(stdout, /阶段 'explore' 已完成/);
    // next stage should be grill (load is gone)
    assert.match(stdout, /sovei workflow grill 001-complete-test/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ── AC-5：feature split 前置条件（方向 C：explore + grill 完成，即 exploration.md + decision-log.md 存在）──

test('AC-5: feature split --json works after explore + grill (exploration.md + decision-log.md exist)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-split-'));
  try {
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', root, '--blank']);
    await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', 'multi-domain requirement', '--slug', 'multi-domain',
    ]);
    await writeFile(join(root, 'specs', '001-multi-domain', 'exploration.md'), '# 探索\n\n需求理解。', 'utf8');
    // 方向 C：拆分发生在 grill 之后，需 decision-log.md 作为共享决策上下文
    await writeFile(join(root, 'specs', '001-multi-domain', 'decision-log.md'), '# 决策日志\n\n已决事项。', 'utf8');
    await writeFile(
      join(root, 'specs', '001-multi-domain', 'sub-change-map.md'),
      '# Sub-Change Map\n\n| SC-ID | 名称 | 目标 | 依赖 |\n|---|---|---|---|\n| SC-001 | 子变更A | 目标A | - |\n',
      'utf8',
    );
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'feature', 'split', '001-multi-domain', '--json',
    ]);
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.featureId || parsed.parentFeatureId || parsed.subChanges || parsed.proposal || parsed.contract);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('AC-5: feature split --json rejects when grill not completed (no decision-log.md)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-explore-split-nogrill-'));
  try {
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', root, '--blank']);
    await execFileAsync(process.execPath, [
      cli, '--root', root, 'workflow', 'explore', 'single requirement', '--slug', 'no-grill',
    ]);
    await writeFile(join(root, 'specs', '001-no-grill', 'exploration.md'), '# 探索\n\n需求理解。', 'utf8');
    // 缺少 decision-log.md → 拆分应被拒绝
    await assert.rejects(
      execFileAsync(process.execPath, [
        cli, '--root', root, 'feature', 'split', '001-no-grill', '--json',
      ]),
      /decision-log\.md|Cannot split/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
