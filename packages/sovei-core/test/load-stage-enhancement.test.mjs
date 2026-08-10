import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_WORKFLOW,
  KnowledgeStore,
  MemoryStorage,
  WorkflowEngine,
} from '../dist/index.js';

const logger = { info() {}, warn() {}, error() {}, debug() {} };
const config = {
  rootPath: '.',
  specsDir: 'specs',
  knowledgeDir: 'harness/project/knowledge',
  harnessDir: 'harness',
  project: { name: 'test', description: 'test', techStack: {}, started: '2026-01-01' },
  workflow: { version: '2.0.0', stageOrder: DEFAULT_WORKFLOW.stageOrder },
};

function createEngine() {
  const storage = new MemoryStorage();
  return { storage, engine: new WorkflowEngine(storage, new KnowledgeStore(storage), logger, config) };
}

// ── TASK-001: TASK_TYPE_MAP['general'] 包含 code-map 和 rule ──

test('loadByTaskType("general") loads code-map and rule knowledge types', async () => {
  const storage = new MemoryStorage();
  const knowledge = new KnowledgeStore(storage);
  await knowledge.loadByTaskType('general');
  const sources = knowledge.getLoadedSources();
  assert.ok(sources.includes('knowledge/code-map.json'), 'should include code-map');
  assert.ok(sources.includes('knowledge/rule.json'), 'should include rule');
  assert.ok(sources.includes('knowledge/constitution.json'), 'should still include constitution');
  assert.ok(sources.includes('knowledge/preference.json'), 'should still include preference');
  assert.ok(sources.includes('knowledge/architecture.json'), 'should still include architecture');
});

// ── TASK-002: loadStage 契约 + postExecute + prompt ──

test('loadStage contract declares load-summary.md as produced artifact', async () => {
  const { engine } = createEngine();
  // 通过 prepareStage 间接验证契约——prepareStage 会为 producesArtifacts 创建模板
  await engine.bootstrap('test-contract');
  await engine.prepareStage('test-contract', 'load');
  // load-summary.md 模板应已创建
  // 验证方式：completeStage 会对模板报 "still templates" 错误
  await assert.rejects(
    engine.completeStage('test-contract', 'load'),
    /still templates: load-summary\.md/,
  );
});

test('loadStage postExecute validates workflow-state consistency', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('test-postexec');
  await engine.prepareStage('test-postexec', 'load');
  await storage.write('specs/test-postexec/load-summary.md', '# 加载摘要\n\n代码库现状。');
  // 正常完成不应抛出异常
  const state = await engine.completeStage('test-postexec', 'load');
  assert.deepEqual(state.completedStages, ['load']);
});

test('load prompt includes exploration methodology keywords', async () => {
  const { engine } = createEngine();
  await engine.bootstrap('test-prompt');
  const result = await engine.prepareStage('test-prompt', 'load');
  assert.match(result.prompt, /现状探索/);
  assert.match(result.prompt, /风险识别/);
  assert.match(result.prompt, /代码库现状摘要/);
  assert.match(result.prompt, /潜在风险点/);
});

// ── TASK-003: grillStage requiredArtifacts 包含 load-summary.md ──

test('grillStage requires load-summary.md as input artifact', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('test-grill-dep');
  await engine.prepareStage('test-grill-dep', 'load');
  await storage.write('specs/test-grill-dep/load-summary.md', '# 加载摘要\n\n代码库现状。');
  await engine.completeStage('test-grill-dep', 'load');

  // grill 准备时应校验 load-summary.md 存在——已写入，应通过
  const result = await engine.prepareStage('test-grill-dep', 'grill');
  assert.match(result.prompt, /# 阶段：grill/);
});

test('grillStage preparation fails when load-summary.md is missing', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('test-grill-missing');

  // 用引擎 API 完成 load，但不写 load-summary.md——通过手动操作事件日志绕过产物校验
  const { EventStore } = await import('../dist/index.js');
  const events = new EventStore(storage);
  const path = 'specs/test-grill-missing';
  // bootstrap 已创建 BOOTSTRAP 事件，只需追加 PREPARED + COMPLETE
  await events.append(path, { type: 'STAGE_PREPARED', stage: 'load' }, 'load');
  await events.append(path, { type: 'STAGE_COMPLETE', stage: 'load', artifacts: [] }, 'load');
  await events.persistState(path, await events.replay(path, DEFAULT_WORKFLOW));

  // grill 准备时应因缺少 load-summary.md 而失败
  await assert.rejects(
    engine.prepareStage('test-grill-missing', 'grill'),
    /Missing required artifacts.*load-summary\.md/,
  );
});
