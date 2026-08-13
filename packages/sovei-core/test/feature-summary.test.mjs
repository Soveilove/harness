import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryStorage } from '../dist/index.js';
import { summaryFeature } from '../dist/cli/commands/feature.js';

/** 构建一个已完成 Feature 目录（含事件流 + 各阶段产物，部分产物归档到 _archive/） */
function setupCompletedFeature(storage, featurePath) {
  // 状态
  storage.write(
    `${featurePath}/workflow-state.yaml`,
    'featureId: "test-feature"\nstatus: completed\ncurrentStage: null\nriskLevel: S1\ncompletedStages:\n  - "explore"\n  - "grill"\n  - "wayfind"\n  - "spec"\n  - "scope"\n  - "plan"\n  - "tasks"\n  - "implement"\n  - "converge"\n  - "verify"\n  - "learn"\n  - "sync"\nnextStage: null\nupdatedAt: "2026-08-11T00:00:00.000Z"\nreopenedStages: []\nblockers: []\ncompletedTaskIds:\n  - "TASK-001"\nactiveChangeId: null\n',
  );
  // 事件流（含 BOOTSTRAP / STAGE / TASK / OVERRIDE）
  storage.write(
    `${featurePath}/workflow-events.jsonl`,
    '{"timestamp":"2026-08-11T00:00:00.000Z","event":{"type":"BOOTSTRAP","featureId":"test-feature"}}\n'
      + '{"timestamp":"2026-08-11T00:00:01.000Z","event":{"type":"STAGE_PREPARED","stage":"explore"}}\n'
      + '{"timestamp":"2026-08-11T00:00:02.000Z","event":{"type":"STAGE_COMPLETE","stage":"explore","artifacts":["exploration.md"]}}\n'
      + '{"timestamp":"2026-08-11T00:00:03.000Z","event":{"type":"STAGE_PREPARED","stage":"grill"}}\n'
      + '{"timestamp":"2026-08-11T00:00:04.000Z","event":{"type":"STAGE_COMPLETE","stage":"grill","artifacts":["decision-log.md"]}}\n'
      + '{"timestamp":"2026-08-11T00:00:05.000Z","event":{"type":"TASK_COMPLETE","taskId":"TASK-001","artifact":"change-manifest.md"}}\n'
      + '{"timestamp":"2026-08-11T00:00:06.000Z","event":{"type":"OVERRIDE_CONFIRM","stage":"verify","role":"tech","reason":"all tests pass"}}\n',
  );
  // 持久产物
  storage.write(`${featurePath}/decision-log.md`, '# decision-log\n\n## 决策树\n\n### D1: 是否支持 --json？\n\n- **类型:** 可推断决策\n- **决策:** 支持。\n- **理由:** 供脚本消费。\n- **被拒绝方案:** 只输出 markdown。\n- **状态:** ✅ 已决\n');
  storage.write(`${featurePath}/sync-report.md`, '# Sync Report\n\n## 目标\n修复缺陷\n\n## 同步状态\n\n| 目标 | 状态 |\n|---|---|\n| 源码 | ✅ 已实施 |\n\n## 结论\n✅ 全部就绪\n');
  storage.write(`${featurePath}/exploration.md`, '# 需求探索 — test-feature\n\n代码库现状摘要。\n');
  storage.write(`${featurePath}/wayfinder.md`, '# Wayfinder\n\n已标记 not required\n');
  // 过程产物：部分留在顶层，部分归档
  storage.write(`${featurePath}/spec.md`, '# Spec\n\n## 目标\n新增 feature summary 命令\n\n## 验收标准\n- AC1 ...\n');
  storage.write(`${featurePath}/change-manifest.md`, '# Change Manifest\n\n## 目标\n新增 summary 子命令\n');
  // 归档的过程产物
  storage.write(`${featurePath}/_archive/evidence.md`, '# Evidence\n\n验证通过。\n');
  storage.write(`${featurePath}/_archive/learning-report.md`, '# Learning\n\n## 学习\n观察：summary 复用 archive 的存储模式。\n');
}

/** 构建一个 in_progress Feature（只完成 explore） */
function setupInProgressFeature(storage, featurePath) {
  storage.write(
    `${featurePath}/workflow-state.yaml`,
    'featureId: "wip-feature"\nstatus: in_progress\ncurrentStage: "grill"\nriskLevel: S1\ncompletedStages:\n  - "explore"\nnextStage: "wayfind"\nupdatedAt: "2026-08-11T00:00:00.000Z"\nreopenedStages: []\nblockers: []\ncompletedTaskIds: []\nactiveChangeId: null\n',
  );
  storage.write(
    `${featurePath}/workflow-events.jsonl`,
    '{"timestamp":"2026-08-11T00:00:00.000Z","event":{"type":"BOOTSTRAP","featureId":"wip-feature"}}\n'
      + '{"timestamp":"2026-08-11T00:00:01.000Z","event":{"type":"STAGE_PREPARED","stage":"explore"}}\n'
      + '{"timestamp":"2026-08-11T00:00:02.000Z","event":{"type":"STAGE_COMPLETE","stage":"explore","artifacts":["exploration.md"]}}\n',
  );
  storage.write(`${featurePath}/exploration.md`, '# 需求探索 — wip-feature\n\n探索中。\n');
}

test('summaryFeature: completed Feature 生成含六章节的 summary.md', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/test-feature';
  setupCompletedFeature(storage, featurePath);

  const markdown = await summaryFeature(storage, featurePath, 'test-feature', false);

  // 六核心章节
  for (const section of ['## 概览', '## 需求', '## 关键决策', '## 变更', '## 验证', '## 经验', '## 结论']) {
    assert.ok(markdown.includes(section), `缺少章节: ${section}`);
  }
  // 需求来自 spec.md 目标段
  assert.ok(markdown.includes('新增 feature summary 命令'));
  // 变更来自 change-manifest.md 目标段
  assert.ok(markdown.includes('新增 summary 子命令'));
  // 决策提取
  assert.ok(markdown.includes('D1'));
  assert.ok(markdown.includes('支持'));
  // 经验回退到 _archive/learning-report.md（顶层无，归档有）
  assert.ok(markdown.includes('观察：summary 复用 archive 的存储模式'));

  // 写入到顶层 summary.md
  const written = await storage.read(`${featurePath}/summary.md`);
  assert.equal(written, markdown);
});

test('summaryFeature: 归档后从 _archive/ 回退读取过程产物', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/archived-feature';
  setupCompletedFeature(storage, featurePath);
  // 归档 change-manifest.md（从顶层移走）
  const manifest = await storage.read(`${featurePath}/change-manifest.md`);
  await storage.write(`${featurePath}/_archive/change-manifest.md`, manifest);
  await storage.delete(`${featurePath}/change-manifest.md`);

  const markdown = await summaryFeature(storage, featurePath, 'archived-feature', false);

  // 变更章节仍能从 _archive/ 回退读取到
  assert.ok(markdown.includes('新增 summary 子命令'));
});

test('summaryFeature: in_progress Feature 生成进度快照，未执行阶段显示未执行', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/wip-feature';
  setupInProgressFeature(storage, featurePath);

  const markdown = await summaryFeature(storage, featurePath, 'wip-feature', false);

  // 概览阶段进度为 1/12
  assert.ok(markdown.includes('1/12'));
  // 需求从 exploration.md 回退（无 spec.md），显示探索摘要
  assert.ok(markdown.includes('探索中'));
  // 关键决策降级（无 decision-log.md）
  assert.ok(markdown.includes('无决策条目'));
});

test('summaryFeature: --json 输出合法结构化字段', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/json-feature';
  setupCompletedFeature(storage, featurePath);

  const json = await summaryFeature(storage, featurePath, 'json-feature', true);

  const data = JSON.parse(json);
  assert.equal(data.featureId, 'test-feature');
  assert.equal(data.status, 'completed');
  assert.ok(Array.isArray(data.stages));
  assert.ok(data.stages.length >= 12);
  // 任务与门禁覆盖
  assert.ok(data.tasks.some((t) => t.taskId === 'TASK-001'));
  assert.ok(data.overrides.some((o) => o.stage === 'verify' && o.role === 'tech'));
  // 决策提取
  assert.ok(data.decisions.some((d) => d.label === 'D1'));
  // 产物清单含 _archive 项
  assert.ok(data.artifacts.includes('_archive/evidence.md'));

  // --json 不应写 summary.md 文件
  const written = await storage.read(`${featurePath}/summary.md`);
  assert.equal(written, null);
});

test('summaryFeature: Feature 不存在时抛错', async () => {
  const storage = new MemoryStorage();

  await assert.rejects(
    summaryFeature(storage, 'specs/nonexistent', 'nonexistent', false),
    /Feature 不存在|状态缺失/,
  );
});

test('summaryFeature: 写入走 StorageBackend（通过 MemoryStorage 断言落盘）', async () => {
  const storage = new MemoryStorage();
  const featurePath = 'specs/write-feature';
  setupCompletedFeature(storage, featurePath);

  await summaryFeature(storage, featurePath, 'write-feature', false);

  const written = await storage.read(`${featurePath}/summary.md`);
  assert.ok(written !== null && written.includes('# Feature Summary'));
});
