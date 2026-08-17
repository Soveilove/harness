import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflowStateV3, parseWorkflowStateV3 } from '../dist/index.js';
import { transitionWorkflowStateV3 } from '../dist/index.js';

const stages = ['explore', 'grill', 'wayfind'];
const actor = 'test-agent';

function initial() {
  return createWorkflowStateV3('002-workflow-v3-state-core', stages);
}

test('prepares the current stage idempotently', () => {
  const state = initial();
  const prepared = transitionWorkflowStateV3(state, { type: 'prepare', actor }, stages);
  assert.deepEqual(prepared.preparedStages, ['explore']);
  assert.equal(prepared.revision, 1);
  assert.equal(prepared.history[0].action, 'prepare');
  const repeated = transitionWorkflowStateV3(prepared, { type: 'prepare', actor }, stages);
  assert.deepEqual(repeated, prepared);
});

test('completes only the current stage and advances one stage', () => {
  const state = transitionWorkflowStateV3(initial(), { type: 'prepare', actor }, stages);
  const completed = transitionWorkflowStateV3(state, { type: 'complete', actor, reason: 'exploration complete' }, stages);
  assert.deepEqual(completed.completedStages, ['explore']);
  assert.equal(completed.currentStage, 'grill');
  assert.equal(completed.nextStage, 'wayfind');
  assert.equal(completed.revision, 2);
  assert.equal(completed.history.at(-1).action, 'complete');
});

test('rejects completion without prepare, duplicate completion, and jumps', () => {
  assert.throws(() => transitionWorkflowStateV3(initial(), { type: 'complete', actor }, stages), /prepared/i);
  const prepared = transitionWorkflowStateV3(initial(), { type: 'prepare', actor }, stages);
  const completed = transitionWorkflowStateV3(prepared, { type: 'complete', actor }, stages);
  assert.throws(() => transitionWorkflowStateV3(completed, { type: 'complete', actor }, stages), /prepared/i);
  assert.throws(() => transitionWorkflowStateV3({ ...prepared, preparedStages: ['grill'] }, { type: 'complete', actor }, stages), /current stage/i);
});

test('reopens a completed stage and records the transition', () => {
  let state = initial();
  state = transitionWorkflowStateV3(state, { type: 'prepare', actor }, stages);
  state = transitionWorkflowStateV3(state, { type: 'complete', actor }, stages);
  state = transitionWorkflowStateV3(state, { type: 'prepare', actor }, stages);
  state = transitionWorkflowStateV3(state, { type: 'complete', actor }, stages);
  const reopened = transitionWorkflowStateV3(state, { type: 'reopen', actor, stage: 'explore', reason: 'new requirement' }, stages);
  assert.deepEqual(reopened.completedStages, []);
  assert.equal(reopened.currentStage, 'explore');
  assert.equal(reopened.nextStage, 'grill');
  assert.deepEqual(reopened.reopenedStages, ['explore']);
  assert.equal(reopened.status, 'in_progress');
  assert.equal(reopened.revision, 5);
  assert.equal(reopened.history.at(-1).action, 'reopen');
  assert.deepEqual(parseWorkflowStateV3(JSON.stringify(reopened), stages), reopened);
});

test('completing the last stage produces a valid completed state', () => {
  const lastStages = ['explore'];
  let state = createWorkflowStateV3('002-workflow-v3-state-core', lastStages);
  state = transitionWorkflowStateV3(state, { type: 'prepare', actor }, lastStages);
  const completed = transitionWorkflowStateV3(state, { type: 'complete', actor }, lastStages);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.currentStage, null);
  assert.equal(completed.nextStage, null);
  assert.deepEqual(parseWorkflowStateV3(JSON.stringify(completed), lastStages), completed);
});

test('rejects structurally valid states with invalid stage cursors', () => {
  const state = initial();
  const invalid = { ...state, completedStages: ['explore'], currentStage: 'explore', nextStage: 'grill', preparedStages: ['explore'], revision: 0, history: [] };
  assert.throws(() => transitionWorkflowStateV3(invalid, { type: 'prepare', actor }, stages), /cursor|completed stages/i);
  assert.deepEqual(invalid, { ...state, completedStages: ['explore'], currentStage: 'explore', nextStage: 'grill', preparedStages: ['explore'], revision: 0, history: [] });
});

test('failed transitions leave the input state unchanged', () => {
  const state = initial();
  const before = structuredClone(state);
  assert.throws(() => transitionWorkflowStateV3(state, { type: 'complete', actor }, stages), /prepared/i);
  assert.deepEqual(state, before);
});

test('rejects reopening an incomplete or unknown stage', () => {
  assert.throws(() => transitionWorkflowStateV3(initial(), { type: 'reopen', actor, stage: 'explore' }, stages), /completed/i);
  assert.throws(() => transitionWorkflowStateV3(initial(), { type: 'reopen', actor, stage: 'missing' }, stages), /unknown/i);
});
