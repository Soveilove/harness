import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { MemoryStorage } from '../dist/index.js';
import { evaluateQuickRun } from '../dist/index.js';
import { buildContextPack } from '../dist/index.js';
import { buildSnapshot } from '../dist/index.js';

// 验证 QuickEvaluationResult.policy 是精简结构，不含完整 ContextItem.content

test('QuickEvaluationResult.policy does not contain full ContextItem content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-quick-slim-'));
  try {
    const storage = new MemoryStorage();
    const redlines = [
      {
        id: 'TEST_RL_1',
        title: 'Test Redline 1',
        rule: 'A'.repeat(3000),
        enforcement: 'absolute',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const knowledge = [
      {
        id: 'rule-test-stable',
        type: 'rule',
        title: 'Test Stable Rule',
        content: 'B'.repeat(3000),
        lifecycle: 'stable',
        evidence: [
          { feature: 'f1', date: new Date().toISOString(), description: 'obs', verified: false },
          { feature: 'f2', date: new Date().toISOString(), description: 'obs', verified: false },
          { feature: 'f3', date: new Date().toISOString(), description: 'obs', verified: false },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const contextPack = buildContextPack({
      feature: 'test',
      stage: 'implement',
      redlines,
      projectRules: [],
      knowledge,
      artifacts: [],
      snapshot: null,
    });

    const result = await evaluateQuickRun({
      workspaceRoot: root,
      storage,
      request: {
        target: 'fix something',
        exclusions: [],
        declaredPaths: ['src/foo.ts'],
        declaredSymbols: [],
        declaredTests: [],
      },
      contextPack,
      redlines,
      projectRules: [],
      baselineRevision: null,
    });

    // policy 应为精简结构
    assert.ok(result.policy.controlPlane, 'controlPlane should exist');
    assert.ok(result.policy.shadowSummaries, 'shadowSummaries should exist');
    assert.ok(result.policy.index, 'index should exist');

    // shadowSummaries 应有三个变体
    assert.ok(result.policy.shadowSummaries.full, 'full summary should exist');
    assert.ok(result.policy.shadowSummaries.scoped, 'scoped summary should exist');
    assert.ok(result.policy.shadowSummaries.indexOnDemand, 'indexOnDemand summary should exist');

    // shadowSummaries 不应含 required/expanded 数组（只有 ids/counts/sizes）
    const fullSummary = result.policy.shadowSummaries.full;
    assert.ok(!('required' in fullSummary && Array.isArray(fullSummary.required) && fullSummary.required.length > 0 && typeof fullSummary.required[0] === 'object' && 'content' in fullSummary.required[0]),
      'shadowSummaries.full should not contain ContextItem objects with content');

    // index 摘要不应含超过 240 字符的 content
    for (const item of result.policy.index) {
      assert.ok(!('content' in item), `index item ${item.id} should not have content field`);
      assert.ok(item.summary.length <= 240, `index item ${item.id} summary should be <= 240 chars`);
    }

    // 序列化后不应包含 'A'.repeat(3000) 或 'B'.repeat(3000) 的完整正文
    const json = JSON.stringify(result);
    assert.ok(!json.includes('A'.repeat(500)), 'JSON should not contain full redline content');
    assert.ok(!json.includes('B'.repeat(500)), 'JSON should not contain full knowledge content');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('QuickPolicySummary preserves controlPlane metadata', async () => {
  const storage = new MemoryStorage();
  const contextPack = buildContextPack({
    feature: 'test',
    stage: 'implement',
    redlines: [],
    projectRules: [],
    knowledge: [],
    artifacts: [],
    snapshot: null,
  });

  const result = await evaluateQuickRun({
    workspaceRoot: '.',
    storage,
    request: {
      target: 'test target',
      exclusions: [],
      declaredPaths: ['src/bar.ts'],
      declaredSymbols: [],
      declaredTests: [],
    },
    contextPack,
    redlines: [],
    projectRules: [],
    baselineRevision: null,
  });

  assert.ok(result.policy.controlPlane.policyVersion, 'policyVersion should exist');
  assert.equal(typeof result.policy.controlPlane.selectionDecision, 'string');
  assert.ok(Array.isArray(result.policy.controlPlane.globalInvariantIds));
  assert.ok(Array.isArray(result.policy.controlPlane.matchedRedlineIds));
  assert.ok(Array.isArray(result.policy.controlPlane.unloadedCandidateIds));
});
