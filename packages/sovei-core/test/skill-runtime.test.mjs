import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_WORKFLOW,
  EventStore,
  KnowledgeStore,
  MemoryStorage,
  WorkflowEngine,
  WorkflowStateStore,
  transitionWorkflowStateV3,
  SkillAdapterRegistry,
  MarkdownSkillAdapter,
} from '../dist/index.js';

const logger = { info() {}, warn() {}, error() {}, debug() {} };
const config = {
  rootPath: '.',
  specsDir: 'specs',
  knowledgeDir: 'sovei-flow/project/knowledge',
  harnessDir: 'sovei-flow',
  project: { name: 'test', description: 'test', techStack: {}, started: '2026-01-01' },
  workflow: { version: '2.0.0', stageOrder: DEFAULT_WORKFLOW.stageOrder },
};

const SKILL_CONTENT = `---
name: grilling
description: Grill the user relentlessly
---

Interview the user relentlessly until you reach a shared understanding.
Map this as a **design tree**.
`;

function createEngineWithSkill() {
  const storage = new MemoryStorage();
  const knowledgeStore = new KnowledgeStore(storage);

  const manifest = {
    id: 'mattpocock/grilling',
    name: 'grilling',
    version: '1.0.0',
    source: { type: 'path', locator: 'sovei-flow/vendor/mattpocock/skills/productivity/grilling' },
    supportedStages: ['grill'],
    readOnly: true,
    protocolVersion: '1.0.0',
  };
  const adapter = new MarkdownSkillAdapter(manifest, SKILL_CONTENT);

  const registry = new SkillAdapterRegistry([
    { stage: 'grill', skillId: 'mattpocock/grilling', status: 'enabled', fallback: 'native' },
  ]);
  registry.registerAdapter(adapter);

  return { storage, engine: new WorkflowEngine(storage, knowledgeStore, logger, config, registry) };
}

function createEngineWithoutSkill() {
  const storage = new MemoryStorage();
  const knowledgeStore = new KnowledgeStore(storage);
  return { storage, engine: new WorkflowEngine(storage, knowledgeStore, logger, config) };
}

/** Fast-forward through the explore entry stage so tests can operate on grill+. */
async function skipExplore(storage, featureId) {
  const path = `specs/${featureId}`;
  const store = new WorkflowStateStore(storage, `${path}/workflow-state.json`, DEFAULT_WORKFLOW.stageOrder);
  let state = await store.read();
  const prepared = transitionWorkflowStateV3(state, { type: 'prepare', actor: 'test' }, DEFAULT_WORKFLOW.stageOrder);
  await store.update(state.revision, () => prepared);
  await storage.write(`${path}/exploration.md`, '# 需求探索\n\n代码现状与变更判定。');
  const completed = transitionWorkflowStateV3(prepared, { type: 'complete', actor: 'test' }, DEFAULT_WORKFLOW.stageOrder);
  await store.update(prepared.revision, () => completed);
}

test('prepareStage with external skill injects skill body into prompt', async () => {
  const { storage, engine } = createEngineWithSkill();
  await engine.bootstrap('test-skill');
  await skipExplore(storage, 'test-skill');
  const result = await engine.prepareStage('test-skill', 'grill');

  assert.match(result.prompt, /## 外部 Skill 指令/);
  assert.match(result.prompt, /Interview the user relentlessly/);
  assert.match(result.prompt, /design tree/);
  assert.match(result.prompt, /# 阶段：grill/);
  assert.match(result.prompt, /## 权威规则/);

  assert.ok(result.skillExecutionReport);
  assert.equal(result.skillExecutionReport.mode, 'third-party');
  assert.equal(result.skillExecutionReport.skillId, 'mattpocock/grilling');
  assert.equal(result.skillExecutionReport.version, '1.0.0');
  assert.equal(result.skillExecutionReport.fallbackReason, null);
});

test('prepareStage without skill resolver uses native mode', async () => {
  const { storage, engine } = createEngineWithoutSkill();
  await engine.bootstrap('test-native');
  await skipExplore(storage, 'test-native');
  const result = await engine.prepareStage('test-native', 'grill');

  assert.doesNotMatch(result.prompt, /## 外部 Skill 指令/);
  assert.match(result.prompt, /# 阶段：grill/);

  assert.ok(result.skillExecutionReport);
  assert.equal(result.skillExecutionReport.mode, 'native');
  assert.equal(result.skillExecutionReport.skillId, null);
});

test('prepareStage falls back when adapter not registered', async () => {
  const storage = new MemoryStorage();
  const knowledgeStore = new KnowledgeStore(storage);

  const registry = new SkillAdapterRegistry([
    { stage: 'grill', skillId: 'mattpocock/grilling', status: 'enabled', fallback: 'native' },
  ]);
  // Note: no adapter registered for 'mattpocock/grilling'

  const engine = new WorkflowEngine(storage, knowledgeStore, logger, config, registry);
  await engine.bootstrap('test-fallback');
  await skipExplore(storage, 'test-fallback');
  const result = await engine.prepareStage('test-fallback', 'grill');

  assert.doesNotMatch(result.prompt, /## 外部 Skill 指令/);
  assert.match(result.prompt, /# 阶段：grill/);

  assert.ok(result.skillExecutionReport);
  assert.equal(result.skillExecutionReport.mode, 'fallback');
  assert.equal(result.skillExecutionReport.skillId, 'mattpocock/grilling');
  assert.match(result.skillExecutionReport.fallbackReason, /Adapter not registered/);
});

test('prompt structure: authority notice → skill body → stage contract', async () => {
  const { storage, engine } = createEngineWithSkill();
  await engine.bootstrap('test-order');
  await skipExplore(storage, 'test-order');
  const result = await engine.prepareStage('test-order', 'grill');

  const authorityIdx = result.prompt.indexOf('## 权威规则');
  const skillIdx = result.prompt.indexOf('## 外部 Skill 指令');
  const stageIdx = result.prompt.indexOf('# 阶段：grill');

  assert.ok(authorityIdx >= 0, 'authority notice exists');
  assert.ok(skillIdx > authorityIdx, 'skill section after authority');
  assert.ok(stageIdx > skillIdx, 'stage contract after skill section');
});
