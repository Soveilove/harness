import assert from 'node:assert/strict';
import test from 'node:test';
import { KnowledgeStore, MemoryStorage, parseLearningReport, reconcileObservations, formatReconcileReport } from '../dist/index.js';

function makeCandidate(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: 'rule-test-12345678',
    type: 'rule',
    title: 'Test Rule',
    content: 'A test rule content.',
    lifecycle: 'candidate',
    evidence: [{ feature: '001-test', date: now, description: 'First observation', verified: false }],
    tags: ['test', 'rule'],
    scope: 'project',
    createdAt: now,
    updatedAt: now,
    promotedAt: null,
    deprecatedReason: null,
    ...overrides,
  };
}

const SAMPLE_REPORT = `# 学习报告

> Feature：015-test-feature
> 阶段：learn

## 观察分类

### candidate/pending
1. **Test Rule**: 测试规则再次被验证。

## 知识提取

\`\`\`yaml:knowledge-delta
observations:
  - title: "Test Rule"
    type: rule
    content: "A test rule content."
    tags: [test, rule]
    category: pending-proposal
    evidence: "015 再次验证此规则"
    relatedEntryId: null
  - title: "New Architecture Pattern"
    type: architecture
    content: "New pattern discovered in this feature."
    tags: [architecture, pattern]
    category: candidate
    evidence: "首次观察到新架构模式"
    relatedEntryId: null
  - title: "Rejected: Sub-agent Execution"
    type: decision
    content: "Sovei is not an agent platform."
    tags: [rejected]
    category: rejected
    evidence: "确认拒绝"
    relatedEntryId: null
\`\`\`
`;

// ── Parsing Tests ──

test('parseLearningReport extracts structured observations from markdown', () => {
  const obs = parseLearningReport(SAMPLE_REPORT);
  assert.equal(obs.length, 3);
  assert.equal(obs[0].title, 'Test Rule');
  assert.equal(obs[0].type, 'rule');
  assert.equal(obs[0].category, 'pending-proposal');
  assert.deepEqual(obs[0].tags, ['test', 'rule']);
  assert.equal(obs[1].title, 'New Architecture Pattern');
  assert.equal(obs[1].type, 'architecture');
  assert.equal(obs[2].category, 'rejected');
});

test('parseLearningReport returns empty array when no delta block exists', () => {
  const obs = parseLearningReport('# Just a report\n\nNo delta block here.');
  assert.equal(obs.length, 0);
});

// ── Reconciliation Tests ──

test('reconcileObservations adds new entries as candidate', () => {
  const storage = new MemoryStorage();
  const store = new KnowledgeStore(storage);
  const observations = [{
    title: 'Brand New Rule',
    type: 'rule',
    content: 'A brand new rule.',
    tags: ['new'],
    category: 'candidate',
    evidence: 'First observation',
    relatedEntryId: null,
  }];

  const result = reconcileObservations(observations, store, '015-test');
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].title, 'Brand New Rule');
  assert.equal(result.promoted.length, 0);
  assert.equal(result.skipped.length, 0);

  const entry = store.selectByType('rule')[0];
  assert.equal(entry.lifecycle, 'candidate');
  assert.equal(entry.evidence.length, 1);
  assert.equal(entry.evidence[0].feature, '015-test');
});

test('reconcileObservations promotes existing entry with new evidence (candidate → pending)', () => {
  const storage = new MemoryStorage();
  const store = new KnowledgeStore(storage);
  store.dispatch({ type: 'ADD', entry: makeCandidate({
    id: 'rule-test-rule-abcd1234',
    title: 'Test Rule',
    tags: ['test', 'rule'],
  }) });

  const observations = [{
    title: 'Test Rule',
    type: 'rule',
    content: 'A test rule content.',
    tags: ['test', 'rule'],
    category: 'pending-proposal',
    evidence: 'Second observation from 015',
    relatedEntryId: null,
  }];

  const result = reconcileObservations(observations, store, '015-test');
  assert.equal(result.added.length, 0);
  assert.equal(result.promoted.length, 1);
  assert.equal(result.promoted[0].from, 'candidate');
  assert.equal(result.promoted[0].to, 'pending');

  const entry = store.selectById('rule-test-rule-abcd1234');
  assert.equal(entry.lifecycle, 'pending');
  assert.equal(entry.evidence.length, 2);
  assert.equal(entry.evidence[1].feature, '015-test');
});

test('reconcileObservations auto-promotes to stable when 3+ evidence from different features', () => {
  const storage = new MemoryStorage();
  const store = new KnowledgeStore(storage);
  const now = new Date().toISOString();
  const entry = makeCandidate({
    id: 'rule-stable-test-abcd1234',
    title: 'Stable Candidate',
    lifecycle: 'pending',
    evidence: [
      { feature: '012-first', date: now, description: 'First', verified: false },
      { feature: '013-second', date: now, description: 'Second', verified: false },
    ],
  });
  store.dispatch({ type: 'ADD', entry });

  const observations = [{
    title: 'Stable Candidate',
    type: 'rule',
    content: 'A rule ready for stable.',
    tags: ['test'],
    category: 'stable-proposal',
    evidence: 'Third observation from 015',
    relatedEntryId: null,
  }];

  const result = reconcileObservations(observations, store, '015-third');
  assert.equal(result.promoted.length, 1);
  assert.equal(result.promoted[0].to, 'stable');
  assert.equal(result.autoStable.length, 1);
  assert.equal(result.autoStable[0].evidenceCount, 3);

  const updated = store.selectById('rule-stable-test-abcd1234');
  assert.equal(updated.lifecycle, 'stable');
  assert.equal(updated.evidence.length, 3);
});

test('reconcileObservations skips rejected patterns', () => {
  const storage = new MemoryStorage();
  const store = new KnowledgeStore(storage);
  const observations = [{
    title: 'Bad Pattern',
    type: 'decision',
    content: 'Something we rejected.',
    tags: ['rejected'],
    category: 'rejected',
    evidence: 'This was rejected',
    relatedEntryId: null,
  }];

  const result = reconcileObservations(observations, store, '015-test');
  assert.equal(result.added.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason.includes('rejected'), true);
});

test('reconcileObservations skips duplicate evidence from same feature', () => {
  const storage = new MemoryStorage();
  const store = new KnowledgeStore(storage);
  store.dispatch({ type: 'ADD', entry: makeCandidate({
    id: 'rule-dup-test-abcd1234',
    title: 'Duplicate Test',
    evidence: [{ feature: '015-test', date: new Date().toISOString(), description: 'Already added', verified: false }],
  }) });

  const observations = [{
    title: 'Duplicate Test',
    type: 'rule',
    content: 'Same rule.',
    tags: ['test'],
    category: 'candidate',
    evidence: 'Another observation from same feature',
    relatedEntryId: null,
  }];

  const result = reconcileObservations(observations, store, '015-test');
  assert.equal(result.added.length, 0);
  assert.equal(result.promoted.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.ok(result.skipped[0].reason.includes('already has evidence'));
});

test('reconcileObservations matches by title similarity when relatedEntryId is null', () => {
  const storage = new MemoryStorage();
  const store = new KnowledgeStore(storage);
  store.dispatch({ type: 'ADD', entry: makeCandidate({
    id: 'rule-sim-test-abcd1234',
    title: 'Storage Write With Lock FS',
    tags: ['storage', 'concurrency'],
  }) });

  // Same concept, slightly different title
  const observations = [{
    title: 'storage write with lock fs',
    type: 'rule',
    content: 'Write through storage layer.',
    tags: ['storage', 'concurrency'],
    category: 'pending-proposal',
    evidence: 'Confirmed in 015',
    relatedEntryId: null,
  }];

  const result = reconcileObservations(observations, store, '015-test');
  assert.equal(result.added.length, 0);
  assert.equal(result.promoted.length, 1);
  assert.equal(result.promoted[0].id, 'rule-sim-test-abcd1234');
});

// ── Report Formatting ──

test('formatReconcileReport produces readable markdown', () => {
  const result = {
    added: [{ id: 'rule-new-abcd1234', title: 'New Rule', type: 'rule' }],
    promoted: [{ id: 'rule-old-abcd1234', title: 'Old Rule', from: 'candidate', to: 'pending', feature: '015-test' }],
    autoStable: [{ id: 'rule-stable-abcd1234', title: 'Stable Rule', evidenceCount: 3 }],
    skipped: [{ title: 'Rejected Thing', reason: 'rejected pattern' }],
    errors: [],
  };

  const report = formatReconcileReport(result, '015-test');
  assert.ok(report.includes('新增知识条目'));
  assert.ok(report.includes('New Rule'));
  assert.ok(report.includes('生命周期晋级'));
  assert.ok(report.includes('Old Rule'));
  assert.ok(report.includes('candidate → pending'));
  assert.ok(report.includes('自动晋级 stable'));
  assert.ok(report.includes('Stable Rule'));
  assert.ok(report.includes('跳过'));
  assert.ok(report.includes('sovei knowledge deprecate'));
});

test('formatReconcileReport handles empty result', () => {
  const result = {
    added: [],
    promoted: [],
    autoStable: [],
    skipped: [],
    errors: [],
  };

  const report = formatReconcileReport(result, '015-test');
  assert.ok(report.includes('无知识变更'));
});

// ── Integration: full report parsing + reconciliation ──

test('full pipeline: parse report → reconcile → verify store state', () => {
  const storage = new MemoryStorage();
  const store = new KnowledgeStore(storage);

  // Pre-populate with an existing candidate that matches "Test Rule"
  store.dispatch({ type: 'ADD', entry: makeCandidate({
    id: 'rule-test-rule-abcd1234',
    title: 'Test Rule',
    evidence: [{ feature: '001-first', date: new Date().toISOString(), description: 'Initial', verified: false }],
  }) });

  const observations = parseLearningReport(SAMPLE_REPORT);
  assert.equal(observations.length, 3);

  const result = reconcileObservations(observations, store, '015-test');

  // "Test Rule" should be promoted (candidate → pending, now 2 evidence)
  assert.equal(result.promoted.length, 1);
  assert.equal(result.promoted[0].title, 'Test Rule');

  // "New Architecture Pattern" should be added as new candidate
  assert.equal(result.added.length, 1);
  assert.equal(result.added[0].title, 'New Architecture Pattern');

  // "Rejected: Sub-agent Execution" should be skipped
  assert.equal(result.skipped.length, 1);

  // Verify store state
  const allEntries = store.selectAll();
  assert.equal(allEntries.length, 2); // 1 pre-existing + 1 new

  const testRule = store.selectById('rule-test-rule-abcd1234');
  assert.equal(testRule.lifecycle, 'pending');
  assert.equal(testRule.evidence.length, 2);

  const newArch = store.selectByType('architecture')[0];
  assert.equal(newArch.lifecycle, 'candidate');
  assert.equal(newArch.evidence[0].feature, '015-test');
});
