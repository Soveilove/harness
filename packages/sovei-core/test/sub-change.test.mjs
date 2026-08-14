/**
 * Sub-change (Feature splitting) unit tests.
 *
 * Covers:
 *  - SUBCHANGE_CREATED updates subChanges array
 *  - SUBCHANGE_STAGE_PREPARE/COMPLETE update currentStage
 *  - Dependency constraint: unmerged dep blocks plan prepare
 *  - Aggregation gate: unmerged sub-changes block learn
 *  - verify completion auto-merges
 *  - replay correctly routes mixed top-level + sub-change events
 *  - Backward compat: old events (no subChangeId) replay as top-level
 *  - splitFeature creates sub-change-map.md + scaffold dirs
 *  - listSubChanges reports blocked state
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_WORKFLOW,
  EventStore,
  KnowledgeStore,
  MemoryStorage,
  WorkflowEngine,
  createInitialState,
  workflowReducer,
  aggregationGate,
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

function createEngine() {
  const storage = new MemoryStorage();
  return { storage, engine: new WorkflowEngine(storage, new KnowledgeStore(storage), logger, config) };
}

// ── Reducer unit tests ──

test('SUBCHANGE_CREATED adds a sub-change with pending status', () => {
  let state = createInitialState('050-test');
  const now = new Date().toISOString();
  state = workflowReducer(state, {
    type: 'SUBCHANGE_CREATED',
    subChangeId: 'SC-050-01',
    name: 'backend-api',
    goal: 'Build the API layer',
    dependsOn: [],
    createdAt: now,
  });
  assert.equal(state.subChanges.length, 1);
  assert.equal(state.subChanges[0].id, 'SC-050-01');
  assert.equal(state.subChanges[0].status, 'pending');
  assert.equal(state.subChanges[0].currentStage, null);
  assert.deepEqual(state.subChanges[0].completedStages, []);
});

test('SUBCHANGE_CREATED rejects duplicate ids', () => {
  let state = createInitialState('050-test');
  const now = new Date().toISOString();
  state = workflowReducer(state, {
    type: 'SUBCHANGE_CREATED', subChangeId: 'SC-050-01', name: 'a', goal: 'g', dependsOn: [], createdAt: now,
  });
  assert.throws(
    () => workflowReducer(state, {
      type: 'SUBCHANGE_CREATED', subChangeId: 'SC-050-01', name: 'b', goal: 'g2', dependsOn: [], createdAt: now,
    }),
    /Duplicate sub-change id/,
  );
});

test('SUBCHANGE_CREATED rejects forward dependency references', () => {
  let state = createInitialState('050-test');
  const now = new Date().toISOString();
  assert.throws(
    () => workflowReducer(state, {
      type: 'SUBCHANGE_CREATED', subChangeId: 'SC-050-02', name: 'b', goal: 'g', dependsOn: ['SC-050-01'], createdAt: now,
    }),
    /depends on unknown sibling/,
  );
});

test('SUBCHANGE_STAGE_PREPARE sets currentStage and transitions status', () => {
  let state = createInitialState('050-test');
  const now = new Date().toISOString();
  state = workflowReducer(state, {
    type: 'SUBCHANGE_CREATED', subChangeId: 'SC-050-01', name: 'a', goal: 'g', dependsOn: [], createdAt: now,
  });
  state = workflowReducer(state, {
    type: 'SUBCHANGE_STAGE_PREPARE', subChangeId: 'SC-050-01', stage: 'plan',
  });
  assert.equal(state.subChanges[0].currentStage, 'plan');
  assert.equal(state.subChanges[0].status, 'planning');
});

test('SUBCHANGE_STAGE_PREPARE blocks spec when dependency unmerged', () => {
  let state = createInitialState('050-test');
  const now = new Date().toISOString();
  // Create SC-01 first, then SC-02 depending on SC-01
  state = workflowReducer(state, {
    type: 'SUBCHANGE_CREATED', subChangeId: 'SC-050-01', name: 'a', goal: 'g', dependsOn: [], createdAt: now,
  });
  state = workflowReducer(state, {
    type: 'SUBCHANGE_CREATED', subChangeId: 'SC-050-02', name: 'b', goal: 'g2', dependsOn: ['SC-050-01'], createdAt: now,
  });
  // SC-02 cannot enter spec because SC-01 is not merged
  assert.throws(
    () => workflowReducer(state, {
      type: 'SUBCHANGE_STAGE_PREPARE', subChangeId: 'SC-050-02', stage: 'spec',
    }),
    /blocked by unmerged dependencies: SC-050-01/,
  );
});

test('SUBCHANGE_STAGE_COMPLETE advances cursor and verify auto-merges', () => {
  let state = createInitialState('050-test');
  const now = new Date().toISOString();
  state = workflowReducer(state, {
    type: 'SUBCHANGE_CREATED', subChangeId: 'SC-050-01', name: 'a', goal: 'g', dependsOn: [], createdAt: now,
  });
  // plan
  state = workflowReducer(state, { type: 'SUBCHANGE_STAGE_PREPARE', subChangeId: 'SC-050-01', stage: 'plan' });
  state = workflowReducer(state, { type: 'SUBCHANGE_STAGE_COMPLETE', subChangeId: 'SC-050-01', stage: 'plan', artifacts: [] });
  assert.deepEqual(state.subChanges[0].completedStages, ['plan']);
  assert.equal(state.subChanges[0].currentStage, 'tasks');
  // tasks → implement → converge → verify
  for (const stage of ['tasks', 'implement', 'converge', 'verify']) {
    state = workflowReducer(state, { type: 'SUBCHANGE_STAGE_PREPARE', subChangeId: 'SC-050-01', stage });
    state = workflowReducer(state, { type: 'SUBCHANGE_STAGE_COMPLETE', subChangeId: 'SC-050-01', stage, artifacts: [] });
  }
  assert.equal(state.subChanges[0].status, 'merged');
  assert.equal(state.subChanges[0].currentStage, null);
  assert.deepEqual(state.subChanges[0].completedStages, ['plan', 'tasks', 'implement', 'converge', 'verify']);
});

test('aggregationGate passes when all sub-changes merged', () => {
  let state = createInitialState('050-test');
  const now = new Date().toISOString();
  state = workflowReducer(state, {
    type: 'SUBCHANGE_CREATED', subChangeId: 'SC-050-01', name: 'a', goal: 'g', dependsOn: [], createdAt: now,
  });
  // Not merged yet
  let gate = aggregationGate(state);
  assert.equal(gate.passed, false);
  assert.deepEqual(gate.unfinished, ['SC-050-01']);
  // Merge it
  state = workflowReducer(state, { type: 'SUBCHANGE_MERGED', subChangeId: 'SC-050-01', mergedAt: now });
  gate = aggregationGate(state);
  assert.equal(gate.passed, true);
  assert.deepEqual(gate.unfinished, []);
});

// ── Engine integration tests ──

test('splitFeature creates sub-change-map.md and scaffold dirs', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('060-split-test');
  const state = await engine.splitFeature('060-split-test', [
    { id: 'SC-060-01', name: 'layer-a', goal: 'Build layer A', dependsOn: [] },
    { id: 'SC-060-02', name: 'layer-b', goal: 'Build layer B', dependsOn: ['SC-060-01'] },
  ]);
  assert.equal(state.subChanges.length, 2);
  // sub-change-map.md exists
  const map = await storage.read('specs/060-split-test/sub-change-map.md');
  assert.match(map, /SC-060-01/);
  assert.match(map, /SC-060-02/);
  // Scaffold dirs exist (.gitkeep)
  assert.ok(await storage.exists('specs/060-split-test/sub-changes/SC-060-01/.gitkeep'));
  assert.ok(await storage.exists('specs/060-split-test/sub-changes/SC-060-02/.gitkeep'));
});

test('splitFeature rejects re-splitting', async () => {
  const { engine } = createEngine();
  await engine.bootstrap('061-resplit');
  await engine.splitFeature('061-resplit', [
    { id: 'SC-061-01', name: 'a', goal: 'g', dependsOn: [] },
  ]);
  await assert.rejects(
    engine.splitFeature('061-resplit', [
      { id: 'SC-061-02', name: 'b', goal: 'g2', dependsOn: [] },
    ]),
    /already split/,
  );
});

test('splitFeature seeds spec.md per sub-change and parent awaits aggregation at learn (方向 C)', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('063-csplit');
  const state = await engine.splitFeature('063-csplit', [
    { id: 'SC-063-01', name: 'sc-a', goal: 'A', dependsOn: [] },
    { id: 'SC-063-02', name: 'sc-b', goal: 'B', dependsOn: ['SC-063-01'] },
  ]);
  // 每个 SC 目录预生成 spec.md 种子模板（不再只有 .gitkeep）
  for (const id of ['SC-063-01', 'SC-063-02']) {
    const spec = await storage.read(`specs/063-csplit/sub-changes/${id}/spec.md`);
    assert.ok(spec && spec.includes('SOVEI_TEMPLATE_PLACEHOLDER'), `SC ${id} spec.md should be seeded`);
    assert.match(spec, new RegExp(id));
  }
  // 父层拆分后停在 learn 等待聚合（所有 SC 未 merged）
  assert.equal(state.currentStage, 'learn');
  assert.equal(state.status, 'blocked');
  assert.match(state.blockers.join(' '), /waiting for sub-changes to merge/);
  // 依赖门在 spec 而非 plan：SC-02 依赖未 merged 的 SC-01，不能先进 spec
  assert.throws(
    () => workflowReducer(state, {
      type: 'SUBCHANGE_STAGE_PREPARE', subChangeId: 'SC-063-02', stage: 'spec',
    }),
    /blocked by unmerged dependencies: SC-063-01/,
  );
});

test('blocked parent still allows child spec preparation while awaiting aggregation', async () => {
  const { storage, engine } = createEngine();
  await engine.bootstrap('064-child-spec');
  await storage.write('specs/064-child-spec/decision-log.md', '# Decisions\n');
  const state = await engine.splitFeature('064-child-spec', [
    { id: 'SC-064-01', name: 'sc-a', goal: 'A', dependsOn: [] },
  ]);
  assert.equal(state.status, 'blocked');
  await engine.prepareStage('064-child-spec', 'spec', { subChangeId: 'SC-064-01' });
  assert.equal((await engine.getState('064-child-spec')).subChanges[0].currentStage, 'spec');
});

test('listSubChanges reports blocked state for unmerged deps', async () => {
  const { engine } = createEngine();
  await engine.bootstrap('062-blocked');
  await engine.splitFeature('062-blocked', [
    { id: 'SC-062-01', name: 'a', goal: 'g', dependsOn: [] },
    { id: 'SC-062-02', name: 'b', goal: 'g2', dependsOn: ['SC-062-01'] },
  ]);
  const list = await engine.listSubChanges('062-blocked');
  assert.equal(list.length, 2);
  const sc02 = list.find((sc) => sc.id === 'SC-062-02');
  assert.equal(sc02.blocked, true);
  assert.deepEqual(sc02.blockedBy, ['SC-062-01']);
  const sc01 = list.find((sc) => sc.id === 'SC-062-01');
  assert.equal(sc01.blocked, false);
});

// ── Backward compatibility ──

test('old events without subChangeId replay as top-level (backward compat)', async () => {
  const { storage } = createEngine();
  const events = new EventStore(storage);
  const path = 'specs/070-legacy';
  // Simulate old-style events (no subChangeId field). Completing 'grill' from the
  // explore cursor exercises forward-skip tolerance (explore is silently completed).
  await events.append(path, { type: 'BOOTSTRAP', featureId: '070-legacy' }, 'explore');
  await events.append(path, { type: 'STAGE_PREPARED', stage: 'grill' }, 'grill');
  await events.append(path, { type: 'STAGE_COMPLETE', stage: 'grill', artifacts: [] }, 'grill');
  const state = await events.replay(path, { ...DEFAULT_WORKFLOW, version: '2.0.0' });
  assert.deepEqual(state.completedStages, ['explore', 'grill']);
  assert.deepEqual(state.subChanges, []);
  assert.equal(state.currentStage, 'wayfind');
});

test('subChanges default to empty array in createInitialState', () => {
  const state = createInitialState('080-default');
  assert.deepEqual(state.subChanges, []);
});

test('YAML round-trip preserves subChanges state', async () => {
  const { storage } = createEngine();
  const events = new EventStore(storage);
  const path = 'specs/090-yaml-rt';
  const now = new Date().toISOString();
  await events.append(path, { type: 'BOOTSTRAP', featureId: '090-yaml-rt' }, 'explore');
  await events.append(path, {
    type: 'SUBCHANGE_CREATED', subChangeId: 'SC-090-01', name: 'a', goal: 'g', dependsOn: [], createdAt: now,
  }, 'scope');
  await events.append(path, {
    type: 'SUBCHANGE_STAGE_PREPARE', subChangeId: 'SC-090-01', stage: 'plan',
  }, 'plan');

  const state1 = await events.replay(path, { ...DEFAULT_WORKFLOW, version: '2.0.0' });
  assert.equal(state1.subChanges.length, 1);
  assert.equal(state1.subChanges[0].currentStage, 'plan');

  // Persist and reload
  await events.persistState(path, state1);
  const state2 = await events.replay(path, { ...DEFAULT_WORKFLOW, version: '2.0.0' });
  assert.equal(state2.subChanges.length, 1);
  assert.equal(state2.subChanges[0].id, 'SC-090-01');
  assert.equal(state2.subChanges[0].currentStage, 'plan');
  assert.equal(state2.subChanges[0].status, 'planning');
});
