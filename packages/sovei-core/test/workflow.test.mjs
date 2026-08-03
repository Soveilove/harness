import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_WORKFLOW,
  EventStore,
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

test('bootstrap is idempotent and preparation cannot complete placeholder artifacts', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('001-safe-state');
  await engine.completeStage('001-safe-state', 'load');
  const before = await storage.read('specs/001-safe-state/workflow-events.jsonl');

  const bootstrappedAgain = await engine.bootstrap('001-safe-state');
  assert.deepEqual(bootstrappedAgain.completedStages, ['load']);
  assert.equal(await storage.read('specs/001-safe-state/workflow-events.jsonl'), before);

  await engine.prepareStage('001-safe-state', 'grill');
  await assert.rejects(
    engine.completeStage('001-safe-state', 'grill'),
    /still templates: decision-log\.md/,
  );
  await storage.write('specs/001-safe-state/decision-log.md', '# Decision\n\nThe requested behavior is approved.');
  const completed = await engine.completeStage('001-safe-state', 'grill');
  assert.deepEqual(completed.completedStages, ['load', 'grill']);
});

test('implement tracks individual tasks and blocks stage completion while tasks remain', async () => {
  const { storage, engine } = createEngine();
  const events = new EventStore(storage);
  const path = 'specs/002-multi-task';
  await events.append(path, { type: 'BOOTSTRAP', featureId: '002-multi-task' });
  for (const stage of DEFAULT_WORKFLOW.stageOrder.slice(0, 7)) {
    await events.append(path, { type: 'STAGE_COMPLETE', stage, artifacts: [] }, stage);
  }
  await storage.write(`${path}/tasks.md`, '# Tasks\n\n- [ ] TASK-001: first\n- [ ] TASK-002: second\n');
  await storage.write(`${path}/change-manifest.md`, '# Changes\n\nTASK-001 implemented and verified.');

  let state = await engine.completeTask('002-multi-task', 'TASK-001');
  assert.deepEqual(state.completedTaskIds, ['TASK-001']);
  assert.equal(state.currentStage, 'implement');
  await assert.rejects(engine.completeStage('002-multi-task', 'implement'), /unfinished tasks: TASK-002/);

  await storage.write(`${path}/change-manifest.md`, '# Changes\n\nTASK-001 and TASK-002 implemented and verified.');
  state = await engine.completeTask('002-multi-task', 'TASK-002');
  assert.deepEqual(state.completedTaskIds, ['TASK-001', 'TASK-002']);
  state = await engine.completeStage('002-multi-task', 'implement');
  assert.equal(state.currentStage, 'converge');
});

test('event replay rejects a duplicate bootstrap event in a corrupted log', async () => {
  const storage = new MemoryStorage();
  const events = new EventStore(storage);
  const path = 'specs/003-corrupt';
  await events.append(path, { type: 'BOOTSTRAP', featureId: '003-corrupt' });
  await events.append(path, { type: 'BOOTSTRAP', featureId: '003-corrupt' });
  await assert.rejects(events.replay(path, DEFAULT_WORKFLOW), /Duplicate BOOTSTRAP/);
});
