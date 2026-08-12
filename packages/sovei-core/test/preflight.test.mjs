import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FilesystemStorage, MemoryStorage } from '../dist/index.js';
import { MergePreflightChecker, renderPreflightReport } from '../dist/preflight/index.js';

// ── 辅助函数 ──

async function makeProject(root, name, { entries = {}, redlines = [] } = {}) {
  await mkdir(join(root, 'sovei-flow', 'project', 'knowledge'), { recursive: true });
  await mkdir(join(root, 'sovei-flow', 'project', 'governance'), { recursive: true });
  await writeFile(join(root, 'sovei-flow', 'project', 'project.config.json'), JSON.stringify({ project: { name } }), 'utf8');
  for (const [type, list] of Object.entries(entries)) {
    await writeFile(join(root, 'sovei-flow', 'project', 'knowledge', `${type}.json`), JSON.stringify(list), 'utf8');
  }
  await writeFile(join(root, 'sovei-flow', 'project', 'governance', 'redlines.json'), JSON.stringify(redlines), 'utf8');
}

function redline(overrides) {
  const now = new Date().toISOString();
  return {
    id: 'TEST_RL',
    title: 'Test Redline',
    rule: 'Test rule',
    enforcement: 'absolute',
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function knowledge(overrides) {
  const now = new Date().toISOString();
  const lifecycle = overrides.lifecycle ?? 'stable';
  const evidenceCount = lifecycle === 'stable' ? 3 : lifecycle === 'pending' ? 2 : 1;
  return {
    id: 'rule-test',
    type: 'rule',
    title: 'Test Knowledge',
    content: 'test content',
    lifecycle,
    evidence: Array.from({ length: evidenceCount }, (_, i) => ({
      feature: `feature-${i + 1}`,
      date: now,
      description: 'Observed',
      verified: false,
    })),
    tags: [],
    scope: 'project',
    createdAt: now,
    updatedAt: now,
    promotedAt: lifecycle === 'candidate' ? null : now,
    deprecatedReason: null,
    ...overrides,
  };
}

// ── 测试 ──

test('preflight: 无冲突时 canMerge=true', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-clean-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    const rl = redline({ id: 'SHARED_RL', rule: 'Same rule' });
    await makeProject(sourcePath, 'proj', { redlines: [rl] });
    await makeProject(targetPath, 'proj', { redlines: [rl] });

    const sourceStorage = new FilesystemStorage(sourcePath);
    const targetStorage = new FilesystemStorage(targetPath);
    const checker = new MergePreflightChecker();

    const report = await checker.run(sourceStorage, targetStorage, {
      sourceId: 'source',
      targetId: 'target',
    });

    assert.equal(report.canMerge, true);
    assert.equal(report.conflicts.length, 0);
    assert.equal(report.summary.blockingCount, 0);
    assert.equal(report.summary.warningCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preflight: 红线规则冲突 → blocking', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-redline-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    await makeProject(sourcePath, 'proj', {
      redlines: [redline({ id: 'BILLING_RL', rule: 'Never auto-renew' })],
    });
    await makeProject(targetPath, 'proj', {
      redlines: [redline({ id: 'BILLING_RL', rule: 'Always auto-renew' })],
    });

    const checker = new MergePreflightChecker();
    const report = await checker.run(
      new FilesystemStorage(sourcePath),
      new FilesystemStorage(targetPath),
      { sourceId: 'src', targetId: 'tgt' },
    );

    assert.equal(report.canMerge, false);
    assert.equal(report.conflicts.length, 1);
    assert.equal(report.conflicts[0].category, 'redline');
    assert.equal(report.conflicts[0].severity, 'blocking');
    assert.equal(report.conflicts[0].sourceValue, 'Never auto-renew');
    assert.equal(report.conflicts[0].targetValue, 'Always auto-renew');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preflight: 红线执行级别冲突 → blocking', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-enf-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    await makeProject(sourcePath, 'proj', {
      redlines: [redline({ id: 'AUTH_RL', rule: 'Auth required', enforcement: 'absolute' })],
    });
    await makeProject(targetPath, 'proj', {
      redlines: [redline({ id: 'AUTH_RL', rule: 'Auth required', enforcement: 'approval-required' })],
    });

    const checker = new MergePreflightChecker();
    const report = await checker.run(
      new FilesystemStorage(sourcePath),
      new FilesystemStorage(targetPath),
      { sourceId: 'src', targetId: 'tgt' },
    );

    assert.equal(report.canMerge, false);
    assert.equal(report.conflicts.length, 1);
    assert.equal(report.conflicts[0].severity, 'blocking');
    assert.match(report.conflicts[0].description, /执行级别/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preflight: 红线启用/停用状态差异 → warning（不阻止合并）', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-active-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    await makeProject(sourcePath, 'proj', {
      redlines: [redline({ id: 'LEGACY_RL', rule: 'Same rule', active: true })],
    });
    await makeProject(targetPath, 'proj', {
      redlines: [redline({ id: 'LEGACY_RL', rule: 'Same rule', active: false })],
    });

    const checker = new MergePreflightChecker();
    const report = await checker.run(
      new FilesystemStorage(sourcePath),
      new FilesystemStorage(targetPath),
      { sourceId: 'src', targetId: 'tgt' },
    );

    assert.equal(report.canMerge, true);
    assert.equal(report.conflicts.length, 1);
    assert.equal(report.conflicts[0].severity, 'warning');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preflight: 知识内容冲突 → blocking', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-knowledge-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    await makeProject(sourcePath, 'proj', {
      entries: { rule: [knowledge({ id: 'rule-shared', content: 'Source version', lifecycle: 'stable' })] },
    });
    await makeProject(targetPath, 'proj', {
      entries: { rule: [knowledge({ id: 'rule-shared', content: 'Target version', lifecycle: 'stable' })] },
    });

    const checker = new MergePreflightChecker();
    const report = await checker.run(
      new FilesystemStorage(sourcePath),
      new FilesystemStorage(targetPath),
      { sourceId: 'src', targetId: 'tgt' },
    );

    assert.equal(report.canMerge, false);
    assert.equal(report.conflicts.length, 1);
    assert.equal(report.conflicts[0].category, 'knowledge');
    assert.equal(report.conflicts[0].severity, 'blocking');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preflight: 知识语义冲突（同类型同标题不同ID不同内容）→ warning', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-semantic-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    await makeProject(sourcePath, 'proj', {
      entries: { rule: [knowledge({ id: 'rule-a', title: 'Auth Pattern', content: 'Use JWT', lifecycle: 'stable' })] },
    });
    await makeProject(targetPath, 'proj', {
      entries: { rule: [knowledge({ id: 'rule-b', title: 'Auth Pattern', content: 'Use session cookies', lifecycle: 'stable' })] },
    });

    const checker = new MergePreflightChecker();
    const report = await checker.run(
      new FilesystemStorage(sourcePath),
      new FilesystemStorage(targetPath),
      { sourceId: 'src', targetId: 'tgt' },
    );

    // 有 warning 但无 blocking
    assert.equal(report.canMerge, true);
    const semanticConflicts = report.conflicts.filter((c) => c.id.startsWith('knowledge:semantic:'));
    assert.equal(semanticConflicts.length, 1);
    assert.equal(semanticConflicts[0].severity, 'warning');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preflight: coverage-matrix 冲突 → warning', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-coverage-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    const featurePath = 'specs/001-test';

    await makeProject(sourcePath, 'proj');
    await makeProject(targetPath, 'proj');

    // 在两分支写不同的 coverage-matrix
    await mkdir(join(sourcePath, featurePath), { recursive: true });
    await mkdir(join(targetPath, featurePath), { recursive: true });
    await writeFile(
      join(sourcePath, featurePath, 'coverage-matrix.md'),
      '| Surface | Action |\n|---|---|\n| checkout/billing | modify |\n| auth/login | add |\n',
      'utf8',
    );
    await writeFile(
      join(targetPath, featurePath, 'coverage-matrix.md'),
      '| Surface | Action |\n|---|---|\n| checkout/billing | remove |\n| auth/login | add |\n',
      'utf8',
    );

    const checker = new MergePreflightChecker();
    const report = await checker.run(
      new FilesystemStorage(sourcePath),
      new FilesystemStorage(targetPath),
      { sourceId: 'src', targetId: 'tgt', featurePaths: [featurePath] },
    );

    const coverageConflicts = report.conflicts.filter((c) => c.category === 'coverage');
    assert.equal(coverageConflicts.length, 1);
    assert.equal(coverageConflicts[0].sourceValue, 'modify');
    assert.equal(coverageConflicts[0].targetValue, 'remove');
    assert.equal(coverageConflicts[0].severity, 'warning');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preflight: 报告写入事件流（两侧审计一致）', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-event-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    await makeProject(sourcePath, 'proj', {
      redlines: [redline({ id: 'CONFLICT_RL', rule: 'Rule A' })],
    });
    await makeProject(targetPath, 'proj', {
      redlines: [redline({ id: 'CONFLICT_RL', rule: 'Rule B' })],
    });

    const sourceStorage = new FilesystemStorage(sourcePath);
    const targetStorage = new FilesystemStorage(targetPath);
    const checker = new MergePreflightChecker();
    const report = await checker.run(sourceStorage, targetStorage, {
      sourceId: 'src',
      targetId: 'tgt',
    });

    await checker.persistReport(report, sourceStorage, targetStorage);

    // 验证两侧都写了事件
    const sourceEvents = await readFile(
      join(sourcePath, 'sovei-flow', 'project', 'governance', 'preflight-events.jsonl'),
      'utf8',
    );
    const targetEvents = await readFile(
      join(targetPath, 'sovei-flow', 'project', 'governance', 'preflight-events.jsonl'),
      'utf8',
    );

    const srcParsed = JSON.parse(sourceEvents.trim());
    const tgtParsed = JSON.parse(targetEvents.trim());

    assert.equal(srcParsed.type, 'PREFLIGHT_RUN');
    assert.equal(tgtParsed.type, 'PREFLIGHT_RUN');
    assert.equal(srcParsed.canMerge, false);
    assert.equal(tgtParsed.canMerge, false);
    assert.equal(srcParsed.conflictCount, 1);
    assert.equal(tgtParsed.conflictCount, 1);
    assert.deepEqual(srcParsed, tgtParsed); // 两侧审计一致
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preflight: 裁决冲突后 canMerge 重新评估', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-resolve-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    await makeProject(sourcePath, 'proj', {
      redlines: [redline({ id: 'RESOLVE_RL', rule: 'Rule A' })],
    });
    await makeProject(targetPath, 'proj', {
      redlines: [redline({ id: 'RESOLVE_RL', rule: 'Rule B' })],
    });

    const checker = new MergePreflightChecker();
    const report = await checker.run(
      new FilesystemStorage(sourcePath),
      new FilesystemStorage(targetPath),
      { sourceId: 'src', targetId: 'tgt' },
    );

    assert.equal(report.canMerge, false);

    // 用 override 裁决（目标分支覆盖源分支）
    const resolved = checker.resolveConflict(report, report.conflicts[0].id, {
      action: 'override',
      reason: '目标分支规则更符合业务需求',
      resolvedBy: 'tech-lead',
    });

    assert.equal(resolved.canMerge, true);
    assert.equal(resolved.conflicts[0].resolution.action, 'override');
    assert.equal(resolved.conflicts[0].resolution.reason, '目标分支规则更符合业务需求');
    assert.equal(resolved.conflicts[0].resolution.resolvedBy, 'tech-lead');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preflight: 渲染报告为 Markdown', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-render-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    await makeProject(sourcePath, 'proj', {
      redlines: [redline({ id: 'RENDER_RL', rule: 'Rule A' })],
    });
    await makeProject(targetPath, 'proj', {
      redlines: [redline({ id: 'RENDER_RL', rule: 'Rule B' })],
    });

    const checker = new MergePreflightChecker();
    const report = await checker.run(
      new FilesystemStorage(sourcePath),
      new FilesystemStorage(targetPath),
      { sourceId: 'src', targetId: 'tgt', sourceBranch: 'feature-x', targetBranch: 'main' },
    );

    const md = renderPreflightReport(report);
    assert.match(md, /Merge Preflight 报告/);
    assert.match(md, /不可合并/);
    assert.match(md, /RENDER_RL/);
    assert.match(md, /feature-x/);
    assert.match(md, /main/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('preflight: 无数据时不报错且 canMerge=true', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-preflight-empty-'));
  try {
    const sourcePath = join(root, 'source');
    const targetPath = join(root, 'target');
    await makeProject(sourcePath, 'proj');
    await makeProject(targetPath, 'proj');

    const checker = new MergePreflightChecker();
    const report = await checker.run(
      new FilesystemStorage(sourcePath),
      new FilesystemStorage(targetPath),
      { sourceId: 'src', targetId: 'tgt' },
    );

    assert.equal(report.canMerge, true);
    assert.equal(report.conflicts.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
