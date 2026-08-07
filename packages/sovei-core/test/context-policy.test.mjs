import assert from 'node:assert/strict';
import test from 'node:test';
import { buildContextPack, buildContextPolicy } from '../dist/index.js';

const absoluteRedline = {
  id: 'NO_DATA_LOSS',
  title: 'No data loss',
  rule: 'Never lose data',
  enforcement: 'absolute',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test('context policy preserves full context and reports scoped shadow candidates', () => {
  const pack = buildContextPack({
    feature: '020-quick-context-governance',
    stage: 'implement',
    redlines: [],
    projectRules: [],
    knowledge: [],
    artifacts: [{ name: 'spec.md', content: 'Target contract' }],
    snapshot: null,
  });
  const policy = buildContextPolicy(pack, [], [], { paths: ['src/parser.ts'] });
  assert.equal(policy.shadow.actual, 'full');
  assert.equal(policy.shadow.compatibility, 'preserved');
  assert.equal(policy.shadow.full.required.length, pack.required.length);
  assert.equal(policy.controlPlane.policyVersion, '1');
  assert.ok(Array.isArray(policy.controlPlane.unloadedCandidateIds));
});

test('scoped shadow keeps global absolute redlines visible', () => {
  const pack = buildContextPack({
    feature: '020-quick-context-governance',
    stage: 'implement',
    redlines: [absoluteRedline],
    projectRules: [],
    knowledge: [],
    artifacts: [],
    snapshot: null,
  });
  const policy = buildContextPolicy(pack, [absoluteRedline], [], { paths: ['src/parser.ts'] });
  assert.deepEqual(policy.controlPlane.globalInvariantIds, ['NO_DATA_LOSS']);
  assert.deepEqual(policy.shadow.scoped.required.map((item) => item.id), ['NO_DATA_LOSS']);
});
