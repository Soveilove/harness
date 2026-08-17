import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkflowStateV3,
  parseWorkflowStateV3,
  WorkflowHistoryEntrySchema,
  WorkflowStateV3Schema,
} from '../dist/index.js';

test('exports strict v3 schemas from the package root', () => {
  assert.equal(typeof WorkflowStateV3Schema.parse, 'function');
  assert.equal(typeof WorkflowHistoryEntrySchema.parse, 'function');
});

test('requires stage order for state parsing', () => {
  const state = createWorkflowStateV3('002-workflow-v3-state-core', ['explore', 'grill']);
  assert.throws(() => parseWorkflowStateV3(JSON.stringify(state)), /stage order/i);
});

test('creates a versioned v3 state with an audit history', () => {
  const state = createWorkflowStateV3('002-workflow-v3-state-core', ['explore', 'grill']);

  assert.equal(state.schemaVersion, 3);
  assert.equal(state.featureId, '002-workflow-v3-state-core');
  assert.equal(state.currentStage, 'explore');
  assert.equal(state.nextStage, 'grill');
  assert.equal(state.revision, 0);
  assert.deepEqual(state.completedStages, []);
  assert.deepEqual(state.history, []);
});

test('rejects an unknown schema version', () => {
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ schemaVersion: 2 }), ['explore', 'grill']),
    /unsupported workflow state schema/i,
  );
});

test('rejects a state with duplicate completed stages', () => {
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({
      ...createWorkflowStateV3('002-workflow-v3-state-core', ['explore', 'grill']),
      completedStages: ['explore', 'explore'],
    }), ['explore', 'grill']),
    /duplicate stage entry/i,
  );
});

test('rejects missing required fields and unknown fields', () => {
  const state = createWorkflowStateV3('002-workflow-v3-state-core', ['explore', 'grill']);
  for (const field of ['schemaVersion', 'featureId', 'status', 'currentStage', 'nextStage', 'completedStages', 'reopenedStages', 'completedTaskIds', 'activeChangeId', 'revision', 'riskLevel', 'blockers', 'pendingConfirmations', 'preparedStages', 'history', 'updatedAt']) {
    const invalid = { ...state };
    delete invalid[field];
    assert.throws(() => parseWorkflowStateV3(JSON.stringify(invalid), ['explore', 'grill']), /(?:Invalid|Unsupported) workflow state/i);
  }
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ ...state, unexpected: true }), ['explore', 'grill']),
    /Invalid workflow state/i,
  );
});

test('rejects malformed history entries and non-monotonic revisions', () => {
  const state = createWorkflowStateV3('002-workflow-v3-state-core', ['explore', 'grill']);
  const entry = { revision: 1, timestamp: new Date().toISOString(), actor: 'cli', action: 'complete', sourceStage: 'explore', reason: null };
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ ...state, revision: 1, history: [{ ...entry, actor: '' }] }), ['explore', 'grill']),
    /Invalid workflow state/i,
  );
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ ...state, revision: 3, history: [entry, { ...entry, revision: 3 }] }), ['explore', 'grill']),
    /history length must equal state revision/i,
  );
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ ...state, revision: 2, history: [{ ...entry, revision: 2 }, { ...entry, revision: 3 }] }), ['explore', 'grill']),
    /history revisions must start at one/i,
  );
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ ...state, revision: 1, history: [{ ...entry, extra: true }] }), ['explore', 'grill']),
    /Invalid workflow state/i,
  );
});

test('rejects invalid stage cursors when a workflow definition is supplied', () => {
  const state = createWorkflowStateV3('002-workflow-v3-state-core', ['explore', 'grill']);
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ ...state, currentStage: 'spec', nextStage: 'grill' }), ['explore', 'grill']),
    /unknown current stage/i,
  );
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ ...state, nextStage: 'explore' }), ['explore', 'grill']),
    /immediate successor/i,
  );
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ ...state, completedStages: ['spec'] }), ['explore', 'grill']),
    /contains an unknown stage/i,
  );
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ ...state, completedStages: ['grill'] }), ['explore', 'grill']),
    /ordered prefix/i,
  );
  assert.throws(
    () => parseWorkflowStateV3(JSON.stringify({ ...state, preparedStages: ['grill'] }), ['explore', 'grill']),
    /prepared stage must be current/i,
  );
});

test('rejects invalid state status invariants', () => {
  const state = createWorkflowStateV3('002-workflow-v3-state-core', ['explore', 'grill']);
  assert.throws(() => parseWorkflowStateV3(JSON.stringify({ ...state, currentStage: null }), ['explore', 'grill']), /in-progress state requires current stage/i);
  assert.throws(() => parseWorkflowStateV3(JSON.stringify({ ...state, status: 'completed' }), ['explore', 'grill']), /completed state cannot have current stage/i);
  assert.throws(() => parseWorkflowStateV3(JSON.stringify({ ...state, status: 'blocked' }), ['explore', 'grill']), /blocked state requires blockers/i);
});

test('accepts a valid completed prefix and current preparation', () => {
  const state = createWorkflowStateV3('002-workflow-v3-state-core', ['explore', 'grill']);
  const prepared = { ...state, preparedStages: ['explore'] };
  assert.equal(parseWorkflowStateV3(JSON.stringify(prepared), ['explore', 'grill']).preparedStages[0], 'explore');
  const completed = { ...state, status: 'completed', currentStage: null, nextStage: null, completedStages: ['explore', 'grill'], preparedStages: [] };
  assert.equal(parseWorkflowStateV3(JSON.stringify(completed), ['explore', 'grill']).status, 'completed');
});

test('rejects invalid stage order when creating v3 state', () => {
  assert.throws(() => createWorkflowStateV3('feature', []), /stage order cannot be empty/i);
  assert.throws(() => createWorkflowStateV3('feature', ['explore', 'explore']), /cannot contain duplicates/i);
});
