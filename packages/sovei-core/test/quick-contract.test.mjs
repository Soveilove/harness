import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createQuickRun,
  finishQuickRun,
  interruptQuickRun,
  transitionQuickRun,
} from '../dist/index.js';

test('QuickRun follows the six phases and rejects skipped phases', () => {
  let state = createQuickRun({ target: 'fix parser', declaredPaths: ['src/parser.ts'] }, 'run-1');
  assert.equal(state.phase, 'capture');

  const skipped = transitionQuickRun(state, 'implement');
  assert.equal(skipped.accepted, false);
  assert.match(skipped.reason ?? '', /cannot move/);

  state = transitionQuickRun(state, 'check', { riskLevel: 'low' }).state;
  state = transitionQuickRun(state, 'confirm', { scopeDeclaration: 'modify src/parser.ts only' }).state;
  state = transitionQuickRun(state, 'implement').state;
  state = transitionQuickRun(state, 'verify', { actualDiff: ['src/parser.ts'], testsPassed: true }).state;
  const completed = finishQuickRun(state, 'completed');

  assert.equal(completed.accepted, true);
  assert.equal(completed.state.phase, 'report');
  assert.equal(completed.state.status, 'completed');
});

test('QuickRun cannot continue after escalation', () => {
  let state = createQuickRun({ target: 'change auth and billing' }, 'run-2');
  state = transitionQuickRun(state, 'check', { riskLevel: 'high', riskSignals: ['shared contract'] }).state;
  const escalated = finishQuickRun(state, 'escalated', { riskLevel: 'high' });
  assert.equal(escalated.accepted, true);
  assert.equal(escalated.state.status, 'escalated');
  assert.equal(transitionQuickRun(escalated.state, 'confirm').accepted, false);
});

test('interrupted runs retain an explicit unverified reason', () => {
  const state = createQuickRun({ target: 'update one file' }, 'run-3');
  const interrupted = interruptQuickRun(state, 'host process stopped');
  assert.equal(interrupted.status, 'interrupted');
  assert.deepEqual(interrupted.unverifiedItems, ['host process stopped']);
});
