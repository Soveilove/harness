import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryStorage } from '../dist/index.js';
import { archiveFeature } from '../dist/cli/commands/feature.js';

/** 构建一个已完成的 Feature 目录，包含持久文件和过程产物 */
function setupCompletedFeature(storage, featurePath) {
  // 持久文件
  storage.write(`${featurePath}/workflow-state.yaml`, 'featureId: test\nstatus: completed\ncurrentStage: null\nrevision: 0\nriskLevel: S1\ncompletedStages:\n  - load\n  - grill\n  - wayfind\n  - spec\n  - scope\n  - plan\n  - tasks\n  - implement\n  - converge\n  - verify\n  - learn\n  - sync\nnextStage: null\nupdatedAt: "2026-08-11T00:00:00.000Z"\nreopenedStages: []\nblockers: []\npendingConfirmations: []\ncompletedTaskIds: []\nactiveChangeId: null\n');
  storage.write(`${featurePath}/workflow-events.jsonl`, '{"type":"STAGE_COMPLETED"}\n');
  storage.write(`${featurePath}/decision-log.md`, '# 决策日志\n\n已解决。');
  storage.write(`${featurePath}/wayfinder.json`, '{}');
  storage.write(`${featurePath}/wayfinder-events.jsonl`, '');
  storage.write(`${featurePath}/wayfinder.md`, '# 决策地图');
  storage.write(`${featurePath}/sync-report.md`, '# Sync Report');
  storage.write(`${featurePath}/load-summary.md`, '# Load Summary');

  // 过程产物（应被归档）
  storage.write(`${featurePath}/reconciliation.md`, '# Reconciliation');
  storage.write(`${featurePath}/scope.md`, '# Scope');
  storage.write(`${featurePath}/plan.md`, '# Plan');
  storage.write(`${featurePath}/tasks.md`, '# Tasks');
  storage.write(`${featurePath}/spec.md`, '# Spec');
  storage.write(`${featurePath}/evidence.md`, '# Evidence');
  storage.write(`${featurePath}/convergence-report.md`, '# Convergence');
  storage.write(`${featurePath}/coverage-matrix.md`, '# Coverage');
  storage.write(`${featurePath}/change-manifest.md`, '# Change Manifest');
  storage.write(`${featurePath}/learning-report.md`, '# Learning');
  storage.write(`${featurePath}/knowledge-delta.md`, '# Knowledge Delta');
}

test('archiveFeature: 归档 completed Feature 的过程产物到 _archive/', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/test-feature';
  setupCompletedFeature(storage, featurePath);

  const result = await archiveFeature(storage, featurePath, 'test-feature');

  // 过程产物应被归档
  assert.ok(result.archived.includes('reconciliation.md'));
  assert.ok(result.archived.includes('scope.md'));
  assert.ok(result.archived.includes('plan.md'));
  assert.ok(result.archived.includes('tasks.md'));
  assert.ok(result.archived.includes('spec.md'));
  assert.ok(result.archived.includes('evidence.md'));
  assert.ok(result.archived.includes('convergence-report.md'));
  assert.ok(result.archived.includes('coverage-matrix.md'));
  assert.ok(result.archived.includes('change-manifest.md'));
  assert.ok(result.archived.includes('learning-report.md'));
  assert.ok(result.archived.includes('knowledge-delta.md'));

  // 持久文件应保留在顶层
  assert.ok(result.retained.includes('decision-log.md'));
  assert.ok(result.retained.includes('sync-report.md'));
  assert.ok(result.retained.includes('load-summary.md'));
  assert.ok(result.retained.includes('wayfinder.md'));

  // 非 .md 文件应保留
  assert.ok(result.retained.includes('workflow-state.yaml'));
  assert.ok(result.retained.includes('workflow-events.jsonl'));
  assert.ok(result.retained.includes('wayfinder.json'));
  assert.ok(result.retained.includes('wayfinder-events.jsonl'));

  // 归档文件应在 _archive/ 中
  const archivedContent = await storage.read(`${featurePath}/_archive/reconciliation.md`);
  assert.equal(archivedContent, '# Reconciliation');

  // 原文件应被删除
  const originalContent = await storage.read(`${featurePath}/reconciliation.md`);
  assert.equal(originalContent, null);
});

test('archiveFeature: 非 completed 状态拒绝归档', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/wip-feature';
  setupCompletedFeature(storage, featurePath);
  // 覆盖状态为 in_progress
  await storage.write(`${featurePath}/workflow-state.yaml`, 'status: in_progress\n');

  await assert.rejects(
    archiveFeature(storage, featurePath, 'wip-feature'),
    /只能归档已完成的 Feature/,
  );

  // 过程产物应仍在顶层
  const content = await storage.read(`${featurePath}/reconciliation.md`);
  assert.equal(content, '# Reconciliation');
});

test('archiveFeature: Feature 不存在时报错', async () => {
  const storage = new MemoryStorage();

  await assert.rejects(
    archiveFeature(storage, 'specs/nonexistent', 'nonexistent'),
    /Feature 目录不存在/,
  );
});

test('archiveFeature: 幂等——二次运行不报错，已归档文件跳过', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/idempotent-feature';
  setupCompletedFeature(storage, featurePath);

  // 第一次归档
  const first = await archiveFeature(storage, featurePath, 'idempotent-feature');
  assert.ok(first.archived.length > 0);

  // 第二次归档——过程产物已在 _archive/，顶层只剩持久文件
  const second = await archiveFeature(storage, featurePath, 'idempotent-feature');
  assert.equal(second.archived.length, 0);
  // 持久文件仍在 retained 中
  assert.ok(second.retained.includes('decision-log.md'));
});

test('archiveFeature: _archive/ 已有同名文件时跳过不覆盖', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/skip-feature';
  setupCompletedFeature(storage, featurePath);
  // 预置 _archive/reconciliation.md 为旧内容
  await storage.write(`${featurePath}/_archive/reconciliation.md`, '# 旧内容');

  const result = await archiveFeature(storage, featurePath, 'skip-feature');

  // reconciliation.md 应在 skipped 中
  assert.ok(result.skipped.includes('reconciliation.md'));
  // _archive/ 中的内容不应被覆盖
  const archivedContent = await storage.read(`${featurePath}/_archive/reconciliation.md`);
  assert.equal(archivedContent, '# 旧内容');
  // 顶层文件保留（reopen 后重新生成的产物，不删除）
  const originalContent = await storage.read(`${featurePath}/reconciliation.md`);
  assert.equal(originalContent, '# Reconciliation');
});

test('archiveFeature: 非 .md 文件不动', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/nonmd-feature';
  setupCompletedFeature(storage, featurePath);

  const result = await archiveFeature(storage, featurePath, 'nonmd-feature');

  // .yaml 文件在 retained 中
  assert.ok(result.retained.includes('workflow-state.yaml'));
  // .jsonl 文件在 retained 中
  assert.ok(result.retained.includes('workflow-events.jsonl'));
  // .json 文件在 retained 中
  assert.ok(result.retained.includes('wayfinder.json'));
  // 非 .md 文件不在 archived 中
  for (const f of result.archived) {
    assert.ok(f.endsWith('.md'), `不应归档非 .md 文件: ${f}`);
  }
});

test('archiveFeature: workflow-state.yaml 不存在时报错', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/no-state';
  // 只创建目录（放一个占位文件），不放 workflow-state.yaml
  await storage.write(`${featurePath}/decision-log.md`, '# 决策日志');

  await assert.rejects(
    archiveFeature(storage, featurePath, 'no-state'),
    /无法读取工作流状态/,
  );
});
