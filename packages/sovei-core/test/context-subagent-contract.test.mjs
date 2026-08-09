import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FilesystemStorage, extractFeatureMeta, scoreCrossFeature, buildContextPack, buildContextPolicy } from '../dist/index.js';

// ── 辅助：创建临时项目 ──

async function makeProject(root) {
  await mkdir(join(root, 'harness', 'project', 'knowledge'), { recursive: true });
  await mkdir(join(root, 'harness', 'project', 'governance'), { recursive: true });
  await mkdir(join(root, 'harness', 'project', 'rules'), { recursive: true });
  await mkdir(join(root, 'specs'), { recursive: true });
  await writeFile(
    join(root, 'harness', 'project', 'project.config.json'),
    JSON.stringify({ project: { name: 'test-project' } }),
    'utf8',
  );
}

async function makeFeatureSpecs(root, features) {
  for (const [featureId, dlContent] of Object.entries(features)) {
    await mkdir(join(root, 'specs', featureId), { recursive: true });
    await writeFile(join(root, 'specs', featureId, 'decision-log.md'), dlContent, 'utf8');
  }
}

// ── cross-feature-index 契约测试 ──

test('cross-feature-index logic: extract metadata and score all features', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-cf-index-'));
  try {
    await makeProject(root);
    await makeFeatureSpecs(root, {
      '020-quick-context-governance': '# Decision Log: 020\n\n## Context Policy\n\nModified src/context/policy.ts for budget governance',
      '019-contract-single-source': '# Decision Log: 019\n\n## Contract\n\nRefactored engine/types.ts and stages/index.ts',
      '016-skill-verify': '# Decision Log: 016\n\n## Skill Verify\n\nAdded skills verification logic',
      '022-context-budget-subagent': '# Decision Log: 022\n\n## Context Budget\n\nModified src/context/policy.ts and src/context/budget.ts',
    });

    const storage = new FilesystemStorage(root);
    const currentDl = await storage.read('specs/022-context-budget-subagent/decision-log.md');
    const currentMeta = extractFeatureMeta('022-context-budget-subagent', currentDl, ['src/context/policy.ts']);

    // 读取其他 Feature 元数据
    const allEntries = await storage.listEntries('specs');
    const specDirs = allEntries.filter((e) => e.isDirectory && e.name !== '022-context-budget-subagent' && e.name !== '.gitkeep').map((e) => e.name);
    const otherMetas = [];
    for (const specDir of specDirs) {
      const dl = await storage.read(`specs/${specDir}/decision-log.md`);
      if (dl) {
        otherMetas.push(extractFeatureMeta(specDir, dl));
      }
    }

    const scored = scoreCrossFeature(currentMeta, otherMetas, otherMetas.length);

    // 验证评分结果格式（cross-feature-index CLI 输出会包装为 { _subagentContract, items } 对象）
    assert.ok(Array.isArray(scored));
    assert.ok(scored.length > 0);

    for (const item of scored) {
      assert.ok(item.featureId, 'each item should have featureId');
      assert.ok(item.decisionLogPath, 'each item should have decisionLogPath');
      assert.ok(typeof item.title === 'string');
      assert.ok(typeof item.relevanceScore === 'number');
      assert.ok(Array.isArray(item.tags));
    }

    // 020 应该有较高分数（共享 src/context/policy.ts 路径 + context 标签）
    const feature020 = scored.find((s) => s.featureId === '020-quick-context-governance');
    assert.ok(feature020, '020 should be in scored list');
    assert.ok(feature020.relevanceScore > 0, '020 should have positive score');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ── cross-feature-index CLI 输出含 _subagentContract 契约提示 ──

test('cross-feature-index output wraps items in _subagentContract envelope', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-subagent-env-'));
  try {
    await makeProject(root);
    await makeFeatureSpecs(root, {
      'current-feature': '# Decision Log: current\n\n## Context\n\nModified src/context/policy.ts',
      'other-feature': '# Decision Log: other\n\n## Context\n\nModified src/context/builder.ts',
    });

    const storage = new FilesystemStorage(root);
    const currentDl = await storage.read('specs/current-feature/decision-log.md');
    const currentMeta = extractFeatureMeta('current-feature', currentDl, ['src/context/policy.ts']);
    const allEntries = await storage.listEntries('specs');
    const specDirs = allEntries.filter((e) => e.isDirectory && e.name !== 'current-feature' && e.name !== '.gitkeep').map((e) => e.name);
    const otherMetas = [];
    for (const specDir of specDirs) {
      const dl = await storage.read(`specs/${specDir}/decision-log.md`);
      if (dl) otherMetas.push(extractFeatureMeta(specDir, dl));
    }
    const scored = scoreCrossFeature(currentMeta, otherMetas, otherMetas.length);

    // 模拟 CLI 输出的包装对象
    const cliOutput = {
      _subagentContract: {
        hint: '为每个 item 分派一个子 Agent，运行 sovei context expand <featureId> decision-log.md',
        expandCommand: 'sovei context expand <featureId> decision-log.md',
        parallelizable: true,
        hostAgents: ['codebuddy:Task', 'claude-code:Task', 'codex:agent'],
      },
      items: scored,
    };

    // 验证契约提示存在
    assert.ok(cliOutput._subagentContract, 'should have _subagentContract envelope');
    assert.ok(cliOutput._subagentContract.hint, 'hint should exist');
    assert.ok(cliOutput._subagentContract.expandCommand, 'expandCommand should exist');
    assert.equal(cliOutput._subagentContract.parallelizable, true);
    assert.ok(Array.isArray(cliOutput._subagentContract.hostAgents));
    assert.ok(cliOutput._subagentContract.hostAgents.length > 0);

    // 验证 items 数组
    assert.ok(Array.isArray(cliOutput.items));
    assert.ok(cliOutput.items.length > 0);
    for (const item of cliOutput.items) {
      assert.ok(item.featureId);
      assert.ok(item.decisionLogPath);
      assert.ok(typeof item.relevanceScore === 'number');
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ── expand 契约测试 ──

test('expand logic: read and truncate artifact content', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-expand-'));
  try {
    await makeProject(root);
    const longContent = '# Decision Log\n\n' + 'A'.repeat(5000);
    await mkdir(join(root, 'specs', '020-test'), { recursive: true });
    await writeFile(join(root, 'specs', '020-test', 'decision-log.md'), longContent, 'utf8');

    const storage = new FilesystemStorage(root);
    const content = await storage.read('specs/020-test/decision-log.md');
    assert.ok(content);

    // 模拟 expand 命令的截断逻辑
    const truncated = content.slice(0, 4000);
    assert.equal(truncated.length, 4000);
    assert.ok(truncated.startsWith('# Decision Log'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('expand logic: return error for non-existent artifact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-expand-missing-'));
  try {
    await makeProject(root);
    const storage = new FilesystemStorage(root);
    const content = await storage.read('specs/non-existent/decision-log.md');
    assert.equal(content, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ── buildContextPolicy with budget 集成测试 ──

test('buildContextPolicy with budget truncates required items', () => {
  const pack = buildContextPack({
    feature: 'test',
    stage: 'implement',
    redlines: [{
      id: 'GLOBAL_RL',
      title: 'Global Redline',
      rule: 'Never lose data',
      enforcement: 'absolute',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }],
    projectRules: [],
    knowledge: [{
      id: 'rule-stable-1',
      type: 'rule',
      title: 'Stable Rule',
      content: 'B'.repeat(2000),
      lifecycle: 'stable',
      evidence: [
        { feature: 'f1', date: '2026-01-01', description: 'obs', verified: false },
        { feature: 'f2', date: '2026-01-01', description: 'obs', verified: false },
        { feature: 'f3', date: '2026-01-01', description: 'obs', verified: false },
      ],
      tags: [], scope: 'project',
      createdAt: '2026-01-01', updatedAt: '2026-01-01', promotedAt: '2026-01-01', deprecatedReason: null,
    }],
    artifacts: [{ name: 'spec.md', content: 'C'.repeat(2000) }],
    snapshot: null,
  });

  // 有 paths + budget → actual='scoped', 预算截断
  const policy = buildContextPolicy(pack, pack.required.find((r) => r.id === 'GLOBAL_RL')
    ? [{
        id: 'GLOBAL_RL',
        title: 'Global Redline',
        rule: 'Never lose data',
        enforcement: 'absolute',
        active: true,
        scope: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]
    : [], [], {
    paths: ['spec.md'],
    budget: 500,
  });

  assert.equal(policy.shadow.actual, 'scoped');
  assert.ok(policy.shadow.actualReason.length > 0);
  // 预算 500 字符，总内容远超，应有项被截断
  assert.equal(policy.controlPlane.status, 'over-budget');
});

test('buildContextPolicy without budget preserves full context', () => {
  const pack = buildContextPack({
    feature: 'test',
    stage: 'implement',
    redlines: [],
    projectRules: [],
    knowledge: [],
    artifacts: [{ name: 'spec.md', content: 'content' }],
    snapshot: null,
  });

  // 无 paths → actual='full'（向后兼容）
  const policy = buildContextPolicy(pack, [], [], {});
  assert.equal(policy.shadow.actual, 'full');
  assert.ok(policy.shadow.actualReason.includes('backward compatible'));
  assert.equal(policy.controlPlane.status, 'stable');
});

test('buildContextPolicy with paths but no budget selects scoped', () => {
  const pack = buildContextPack({
    feature: 'test',
    stage: 'implement',
    redlines: [],
    projectRules: [],
    knowledge: [],
    artifacts: [{ name: 'spec.md', content: 'content' }],
    snapshot: null,
  });

  const policy = buildContextPolicy(pack, [], [], { paths: ['spec.md'] });
  assert.equal(policy.shadow.actual, 'scoped');
  assert.ok(policy.shadow.actualReason.includes('scoped'));
  assert.notEqual(policy.controlPlane.status, 'over-budget');
});
