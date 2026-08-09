import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFeatureMeta, scoreCrossFeature } from '../dist/index.js';

test('extractFeatureMeta extracts title from first # heading', () => {
  const content = '# Decision Log: 020-quick-context-governance\n\n## Context\n\nSome text';
  const meta = extractFeatureMeta('020-quick-context-governance', content);
  assert.equal(meta.title, 'Decision Log: 020-quick-context-governance');
  assert.equal(meta.featureId, '020-quick-context-governance');
  assert.equal(meta.decisionLogPath, 'specs/020-quick-context-governance/decision-log.md');
});

test('extractFeatureMeta extracts tags from ## headings', () => {
  const content = '# Title\n\n## Context Policy\n\n## Budget\n\n## Subagent';
  const meta = extractFeatureMeta('test', content);
  assert.ok(meta.tags.includes('context policy'));
  assert.ok(meta.tags.includes('budget'));
  assert.ok(meta.tags.includes('subagent'));
});

test('extractFeatureMeta extracts file paths from content', () => {
  const content = '# Title\n\nModified src/context/policy.ts and packages/sovei-core/src/index.ts';
  const meta = extractFeatureMeta('test', content);
  assert.ok(meta.paths.some((p) => p.includes('src/context/policy.ts')));
  assert.ok(meta.paths.some((p) => p.includes('packages/sovei-core/src/index.ts')));
});

test('extractFeatureMeta extracts domain keywords', () => {
  const content = '# Title\n\nThis feature addresses context budget and cli governance';
  const meta = extractFeatureMeta('test', content);
  assert.ok(meta.domains.includes('context'));
  assert.ok(meta.domains.includes('budget'));
  assert.ok(meta.domains.includes('cli'));
  assert.ok(meta.domains.includes('governance'));
});

test('scoreCrossFeature returns Top-N by relevance score', () => {
  const current = {
    featureId: 'current',
    decisionLogPath: 'specs/current/decision-log.md',
    title: 'Current',
    tags: ['context', 'budget', 'cli'],
    domains: ['context', 'budget', 'cli'],
    paths: ['src/context/policy.ts', 'src/context/builder.ts'],
  };

  const others = [
    {
      featureId: 'similar',
      decisionLogPath: 'specs/similar/decision-log.md',
      title: 'Similar',
      tags: ['context', 'budget'],
      domains: ['context', 'budget'],
      paths: ['src/context/policy.ts'],
    },
    {
      featureId: 'different',
      decisionLogPath: 'specs/different/decision-log.md',
      title: 'Different',
      tags: ['knowledge', 'rule'],
      domains: ['knowledge'],
      paths: ['src/knowledge/store.ts'],
    },
    {
      featureId: 'partial',
      decisionLogPath: 'specs/partial/decision-log.md',
      title: 'Partial',
      tags: ['cli'],
      domains: ['cli'],
      paths: ['src/cli/commands/context.ts'],
    },
  ];

  const scored = scoreCrossFeature(current, others, 2);
  assert.equal(scored.length, 2);
  // 'similar' should have highest score (path overlap + tag overlap + domain overlap)
  assert.equal(scored[0].featureId, 'similar');
  assert.ok(scored[0].relevanceScore > scored[1].relevanceScore, 'first should have higher score');
});

test('scoreCrossFeature with limit returns at most N items', () => {
  const current = {
    featureId: 'current',
    decisionLogPath: 'specs/current/decision-log.md',
    title: 'Current',
    tags: ['context'],
    domains: ['context'],
    paths: ['src/context'],
  };

  const others = Array.from({ length: 10 }, (_, i) => ({
    featureId: `feature-${i}`,
    decisionLogPath: `specs/feature-${i}/decision-log.md`,
    title: `Feature ${i}`,
    tags: ['context'],
    domains: ['context'],
    paths: ['src/context'],
  }));

  const scored = scoreCrossFeature(current, others, 5);
  assert.equal(scored.length, 5);
});

test('scoreCrossFeature returns empty array for no others', () => {
  const current = {
    featureId: 'current',
    decisionLogPath: 'specs/current/decision-log.md',
    title: 'Current',
    tags: [],
    domains: [],
    paths: [],
  };
  const scored = scoreCrossFeature(current, [], 5);
  assert.equal(scored.length, 0);
});

test('scoreCrossFeature sorts by score descending, then by featureId ascending', () => {
  const current = {
    featureId: 'current',
    decisionLogPath: 'specs/current/decision-log.md',
    title: 'Current',
    tags: ['shared'],
    domains: ['shared'],
    paths: ['src/shared'],
  };

  // Two features with identical overlap
  const others = [
    {
      featureId: 'zzz',
      decisionLogPath: 'specs/zzz/decision-log.md',
      title: 'ZZZ',
      tags: ['shared'],
      domains: ['shared'],
      paths: ['src/shared'],
    },
    {
      featureId: 'aaa',
      decisionLogPath: 'specs/aaa/decision-log.md',
      title: 'AAA',
      tags: ['shared'],
      domains: ['shared'],
      paths: ['src/shared'],
    },
  ];

  const scored = scoreCrossFeature(current, others, 5);
  assert.equal(scored[0].featureId, 'aaa'); // alphabetically first when scores tied
  assert.equal(scored[1].featureId, 'zzz');
  assert.equal(scored[0].relevanceScore, scored[1].relevanceScore);
});
