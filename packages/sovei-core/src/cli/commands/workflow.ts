/**
 * Workflow Commands
 * 12 stage commands + bootstrap + reopen + status + list-stages
 * Each stage executes exactly one step and reports the next command.
 */

import type { Command } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import { WorkflowEngine } from '../../engine/workflow-engine.js';
import { stageRegistry } from '../../stages/registry.js';

// Import side-effect: registers all stages
import '../../stages/index.js';
import { ChangeDimension, type ChangeDimension as ChangeDimensionType } from '../../change-control/schemas.js';

const STAGE_NAMES = [
  'explore', 'grill', 'wayfind', 'spec', 'scope', 'plan',
  'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
];

function getEngine(): WorkflowEngine {
  return container.inject<WorkflowEngine>(TOKENS.WorkflowEngine);
}

function printState(state: any): void {
  console.log('');
  console.log('  ┌──────────────────────────────────────┐');
  console.log('  │  Sovei 工作流状态                     │');
  console.log('  └──────────────────────────────────────┘');
  console.log('  Feature：     ' + state.featureId);
  console.log('  状态：        ' + state.status);
  console.log('  revision：    ' + state.revision);
  console.log('  风险等级：    ' + state.riskLevel);
  console.log('  已完成：      [' + state.completedStages.join(', ') + ']');
  console.log('  当前阶段：    ' + (state.currentStage || '—'));
  console.log('  下一阶段：    ' + (state.nextStage || '—'));
  if (state.reopenedStages.length > 0) {
  console.log('  已重开：      [' + state.reopenedStages.join(', ') + ']');
  }
  if (state.completedTaskIds?.length > 0) {
    console.log('  已完成任务：  [' + state.completedTaskIds.join(', ') + ']');
  }
  if (state.activeChangeId) {
    console.log('  当前变更：    ' + state.activeChangeId);
  }
  if (state.blockers.length > 0) {
    console.log('  阻塞项：      ' + state.blockers.join('; '));
  }
  console.log('  更新时间：    ' + state.updatedAt);
  console.log('');
}

function printNextCommand(state: any, feature: string): void {
  if (state.currentStage && state.status !== 'completed') {
    console.log('  下一步命令：  sovei workflow ' + state.currentStage + ' ' + feature + '\n');
  } else if (state.status === 'completed') {
    console.log('  ✓ 工作流已完成。\n');
  }
}

/** 列出 specs/ 下形如 NNN-slug 的既有 Feature 目录名，供序号分配使用。 */
async function listFeatureIds(storage: any, specsDir: string): Promise<string[]> {
  try {
    const entries = await storage.listEntries(specsDir);
    return entries.filter((e: any) => e.isDirectory).map((e: any) => e.name);
  } catch {
    return []; // specs/ 尚不存在（首个 Feature）
  }
}

/** 生成需求原文文档（explore 阶段的自然语言输入留档）。 */
function requirementDoc(requirement: string): string {
  return [
    '# 需求原文',
    '',
    '> 由 explore 入口记录的自然语言需求，供 AI code agent 读懂意图。',
    '',
    requirement.trim(),
    '',
  ].join('\n');
}

/** 准备 explore 阶段：注入提示契约 + 创建模板，打印下一步命令。 */
async function prepareExplore(engine: WorkflowEngine, feature: string): Promise<void> {
  const result = await engine.prepareStage(feature, 'explore');
  console.log('\n  已准备阶段 \'explore\'；工作流状态未推进。\n');
  if (result.artifactsWritten.length > 0) {
    console.log('  已写入产物：');
    for (const a of result.artifactsWritten) {
      console.log('    · ' + a);
    }
  }
  if (result.prompt) {
    console.log('');
    console.log('  ── 提示契约 ──');
    console.log(result.prompt);
  }
  const state = await engine.getState(feature);
  printState(state);
  console.log('  完成命令：sovei workflow explore --feature ' + feature + ' --complete\n');
}

export function registerWorkflowCommands(program: Command): void {
  const workflow = program.command('workflow').description('工作流阶段命令');

  // ── bootstrap ──
  workflow
    .command('bootstrap')
    .argument('<feature>', '要创建的 Feature ID（NNN-slug）')
    .description('创建带初始工作流状态的新 Feature')
    .action(async (feature: string) => {
      const { validateFeatureId } = await import('../../config/loader.js');
      const invalid = validateFeatureId(feature);
      if (invalid) throw new Error(invalid);
      const engine = getEngine();
      const state = await engine.bootstrap(feature);
      console.log('\n  ✓ 已初始化 Feature：' + feature + '\n');
      printState(state);
      printNextCommand(state, feature);
    });

  // ── status ──
  workflow
   .command('status')
   .description('查看 Feature 工作流状态')
   .argument('<feature>', 'Feature ID（例如 001-my-feature）')
    .action(async (feature: string) => {
      const engine = getEngine();
      const state = await engine.getState(feature);
      printState(state);
      printNextCommand(state, feature);
    });

  // ── All 12 stages（explore 单独注册：自然语言入口）──
  for (const stageName of STAGE_NAMES) {
    if (stageName === 'explore') continue; // explore 命令单独注册
    const stage = stageRegistry.get(stageName);
    workflow
      .command(stageName)
      .argument('<feature>', 'Feature ID')
      .option('--complete', '校验产物并完成该阶段')
      .option('--task <id>', 'implement 阶段选择的任务 ID')
      .option('--sub-change <id>', '子变更 ID（仅 spec→verify 阶段可用）')
      .description(stage.description)
      .action(async (feature: string, opts: { complete?: boolean; task?: string; subChange?: string }) => {
        const engine = getEngine();
        if (stageName !== 'implement' && opts.task) {
          throw new Error('--task is only valid for the implement stage');
        }
        // Sub-change constraint: direction C allows independent spec→verify stages.
        const SUB_CHANGE_STAGES = ['spec', 'scope', 'plan', 'tasks', 'implement', 'converge', 'verify'];
        if (opts.subChange && !SUB_CHANGE_STAGES.includes(stageName)) {
          throw new Error(
            `--sub-change is only valid for stages: ${SUB_CHANGE_STAGES.join(', ')}. `
            + `Stage '${stageName}' is shared at the parent Feature level.`,
          );
        }
        const subChangeOpts = opts.subChange ? { subChangeId: opts.subChange } : undefined;
        if (opts.complete) {
          const state = stageName === 'implement' && opts.task
            ? await engine.completeTask(feature, opts.task, subChangeOpts)
            : await engine.completeStage(feature, stageName, subChangeOpts);
          const message = stageName === 'implement' && opts.task
            ? `任务 '${opts.task}' 已完成；implement 阶段继续保持活动。`
            : opts.subChange
              ? `子变更 '${opts.subChange}' 阶段 '${stageName}' 已完成。`
              : `阶段 '${stageName}' 已完成。`;
          console.log('\n  ✓ ' + message + '\n');
          printState(state);
          printNextCommand(state, feature);
          return;
        }
        if (stageName === 'implement' && !opts.task) {
          throw new Error("implement preparation requires --task <id>");
        }
        const result = await engine.prepareStage(feature, stageName, subChangeOpts);
        console.log('\n  已准备阶段 \'' + stageName + '\'；工作流状态未推进。\n');
        if (result.skillExecutionReport) {
          const sr = result.skillExecutionReport;
          if (sr.mode === 'third-party') {
            console.log('  使用 Skill：' + sr.skillId + ' v' + sr.version);
          } else if (sr.mode === 'fallback') {
            console.log('  使用 Skill：native (fallback: ' + sr.fallbackReason + ')');
          } else {
            console.log('  使用 Skill：native');
          }
        }
        if (opts.task) console.log('  已选择任务：' + opts.task + '\n');
        if (stageName === 'grill') {
          console.log('  grill 已触发：CLI 负责生成决策提示契约；AI/IDE 应区分事实核实、可推断决策与范围性决策，将结果记录到 decision-log.md，再运行 --complete。范围性决策逐个提问并附推荐答案。\n');
        }
        if (result.artifactsWritten.length > 0) {
          console.log('  已写入产物：');
          for (const a of result.artifactsWritten) {
            console.log('    · ' + a);
          }
        }
        if (result.prompt) {
          console.log('');
          console.log('  ── 提示契约 ──');
          console.log(result.prompt);
        }
        const state = await engine.getState(feature);
        printState(state);
        console.log('  完成命令：sovei workflow ' + stageName + ' ' + feature + ' --complete' + (opts.task ? ' --task ' + opts.task : '') + '\n');
      });
  }

  // ── explore（工作流唯一入口：接受自然语言需求，自动分配 NNN + 校验 slug）──
  //
  // 设计要点（v4.0.0）：explore 不再要求预先命名 Feature。它接受一段自然语言需求
  // （一句话 / 一个模糊问题 / 一次多个问题 / 一段 PRD 文本 / 一个 md 文件），由 AI code
  // agent 读懂需求 + 探索代码 + 判定变更。命名由 AI 给出 slug、CLI 扫描 specs/ 分配下一个
  // 三位序号并强制 slug 格式校验——从入口根除历史上出现过的畸形目录名。
  //
  // 两种调用形态：
  //   1) 入口：sovei workflow explore "<自然语言需求>" [--slug <ai-derived-slug>] [--prd <path>]
  //      → 分配 NNN-<slug>，bootstrap，写入 requirement.md/prd.md，准备 explore 提示契约。
  //   2) 复用/完成既有 Feature：sovei workflow explore --feature <NNN-slug> [--complete]
  workflow
    .command('explore')
    .description('explore 阶段（工作流入口）：读懂自然需求 + 探索代码现状 + 判定变更拆分。')
    .argument('[requirement]', '自然语言需求（一句话/多个问题/PRD 文本/md 文件路径）')
    .option('--slug <slug>', 'AI 给出的 kebab-case 主题 slug（2-4 个词）；CLI 负责拼接 NNN 前缀')
    .option('--prd <path>', 'PRD 文件路径（读取内容写入 specs/<feature>/prd.md）')
    .option('--feature <id>', '复用/完成既有 Feature（形如 032-my-feature），跳过命名分配')
    .option('--complete', '校验 exploration.md + sub-change-map.md 并完成阶段')
    .action(async (
      requirement: string | undefined,
      opts: { slug?: string; prd?: string; feature?: string; complete?: boolean },
    ) => {
      const engine = getEngine();
      const config = container.inject<any>(TOKENS.Config);
      const storage = container.inject<any>(TOKENS.Storage);
      const { validateFeatureId, normalizeSlug, nextFeatureSequence } = await import('../../config/loader.js');

      // ── 完成/复用模式：显式提供 --feature ──
      if (opts.feature) {
        const invalid = validateFeatureId(opts.feature);
        if (invalid) throw new Error(invalid);
        if (opts.complete) {
          const state = await engine.completeStage(opts.feature, 'explore');
          console.log('\n  ✓ 阶段 \'explore\' 已完成。\n');
          printState(state);
          printNextCommand(state, opts.feature);
          return;
        }
        await prepareExplore(engine, opts.feature);
        return;
      }

      if (opts.complete) {
        throw new Error('--complete 需配合 --feature <id> 指定要完成的 Feature');
      }

      // ── 入口模式：从自然语言需求分配一个新 Feature ──
      if (!requirement || !requirement.trim()) {
        throw new Error(
          'explore 需要一段自然语言需求作为入口，或用 --feature <id> 复用既有 Feature。\n'
          + '  例：sovei workflow explore "把知识提取加上复用价值阈值" --slug knowledge-reuse-threshold',
        );
      }
      if (!opts.slug) {
        throw new Error(
          'AI code agent 必须提供 --slug <kebab-case 主题>（2-4 个词），CLI 负责拼接 NNN 前缀。\n'
          + '  slug 规范：小写字母/数字/连字符，禁止空格/中文/大写/下划线。',
        );
      }

      const slug = normalizeSlug(opts.slug);
      // 扫描 specs/ 现有目录，分配下一个三位序号（借鉴 spec-kit create-new-feature.sh）
      const existing = await listFeatureIds(storage, config.specsDir);
      const seq = nextFeatureSequence(existing);
      const feature = `${seq}-${slug}`;
      const invalid = validateFeatureId(feature);
      if (invalid) throw new Error(invalid); // 双保险：拼接结果仍须合规

      await engine.bootstrap(feature);
      console.log('\n  🆕 已分配 Feature：' + feature);

      // 写入需求原文，供 explore 阶段读取
      if (opts.prd) {
        const path = await import('node:path');
        const fs = await import('node:fs/promises');
        const prdContent = await fs.readFile(path.resolve(opts.prd), 'utf-8');
        await storage.write(`${config.specsDir}/${feature}/prd.md`, prdContent);
        console.log('  📄 已读取 PRD：' + opts.prd + ' → specs/' + feature + '/prd.md');
      }
      await storage.write(`${config.specsDir}/${feature}/requirement.md`, requirementDoc(requirement));
      console.log('  📝 已记录需求原文 → specs/' + feature + '/requirement.md');

      await prepareExplore(engine, feature);
    });

  // ── reopen ──
  workflow
   .command('reopen')
   .description('返工已完成阶段，失效目标及其后继并增加 revision')
   .argument('<feature>', 'Feature ID')
   .requiredOption('--target <stage>', 'Stage to reopen')
    .requiredOption('--reason <reason>', 'Reason for reopening')
    .action(async (feature: string, opts: { target: string; reason: string }) => {
      const engine = getEngine();
      const state = await engine.reopen(feature, opts.target, opts.reason);
      console.log('\n  ↻ Reopened \'' + opts.target + '\' (revision ' + state.revision + ')\n');
      printState(state);
      printNextCommand(state, feature);
    });

  workflow
    .command('change')
    .argument('<feature>', 'Feature ID')
    .requiredOption('--target <stage>', 'Earliest stage invalidated by the material change')
    .requiredOption('--summary <summary>', 'Concise description of the new direction')
    .requiredOption('--reason <reason>', 'Why the previous requirements are no longer valid')
    .requiredOption('--dimensions <dimensions>', 'Comma-separated material change dimensions')
    .description('创建重大变更草稿与红线审查矩阵')
    .action(async (feature: string, opts: { target: string; summary: string; reason: string; dimensions: string }) => {
      const dimensions: ChangeDimensionType[] = [];
      for (const value of opts.dimensions.split(',')) {
        const result = ChangeDimension.safeParse(value.trim());
        if (!result.success) {
          throw new Error(`无效的变更维度 '${value.trim()}'，可选值：${ChangeDimension.options.join(' / ')}`);
        }
        dimensions.push(result.data);
      }
      const request = await getEngine().prepareChange(feature, opts.target, opts.summary, opts.reason, dimensions);
      console.log(`\n  Draft change request: ${request.id}`);
      console.log(`  File: specs/${feature}/change-requests/${request.id}.json`);
      console.log('  Fill affectedSurfaces, authorization fields, supersedes, and every redline assessment before applying.');
      console.log(`  Apply: sovei workflow apply-change ${feature} ${request.id}\n`);
    });

  workflow
    .command('apply-change')
    .argument('<feature>', 'Feature ID')
    .argument('<change-id>', 'Reviewed Change Request ID')
    .description('应用已审查的变更，归档过期产物并重开目标阶段')
    .action(async (feature: string, changeId: string) => {
      const state = await getEngine().applyChange(feature, changeId);
      console.log(`\n  Applied change '${changeId}'. Superseded artifacts were archived.\n`);
      printState(state);
      printNextCommand(state, feature);
    });

  workflow
    .command('cancel-change')
    .argument('<feature>', 'Feature ID')
    .argument('<change-id>', 'Draft Change Request ID')
    .requiredOption('--reason <reason>', 'Why this material change is no longer being pursued')
    .description('取消重大变更草稿并解冻普通工作流')
    .action(async (feature: string, changeId: string, options: { reason: string }) => {
      await getEngine().cancelChange(feature, changeId, options.reason);
      console.log(`\n  Cancelled change '${changeId}'. Ordinary workflow commands are available again.\n`);
    });

  workflow
    .command('confirm')
    .argument('<feature>', 'Feature ID')
    .requiredOption('--stage <stage>', 'Stage that has a pending confirmation gate')
    .requiredOption('--role <role>', 'Confirmer role: product | tech')
    .requiredOption('--by <name>', 'Name of the person confirming')
    .requiredOption('--reference <ref>', 'Approval reference (ticket, doc, etc.)')
    .description('确认待审门禁，解除工作流阻塞')
    .action(async (feature: string, opts: { stage: string; role: 'product' | 'tech'; by: string; reference: string }) => {
      const state = await getEngine().confirmGate(feature, opts.stage, opts.role, opts.by, opts.reference);
      const remaining = state.pendingConfirmations.filter((pc) => !pc.confirmedBy && !pc.overridden);
      console.log('\n  ✅ 已记录确认：' + opts.stage + ' / ' + opts.role + ' 由 ' + opts.by + '签字');
      if (remaining.length) {
        console.log('  剩余待确认：' + remaining.map((pc) => pc.stage + '/' + pc.role).join(', '));
        console.log('  工作流仍然阻塞。\n');
      } else {
        console.log('  所有确认完成，工作流已恢复。\n');
      }
      printState(state);
      printNextCommand(state, feature);
    });

  workflow
    .command('override-confirm')
    .argument('<feature>', 'Feature ID')
    .requiredOption('--stage <stage>', 'Stage that has a pending confirmation gate')
    .requiredOption('--role <role>', 'Confirmer role: product | tech')
    .requiredOption('--by <name>', 'Name of the person overriding')
    .requiredOption('--reason <reason>', 'Why this confirmation is being overridden')
    .description('覆盖待审门禁（审计留痕）')
    .action(async (feature: string, opts: { stage: string; role: 'product' | 'tech'; by: string; reason: string }) => {
      const state = await getEngine().overrideConfirmation(feature, opts.stage, opts.role, opts.by, opts.reason);
      const remaining = state.pendingConfirmations.filter((pc) => !pc.confirmedBy && !pc.overridden);
      console.log('\n  ⚠️ 已覆盖确认：' + opts.stage + ' / ' + opts.role + ' 由 ' + opts.by + '覆盖');
      console.log('  理由：' + opts.reason);
      if (remaining.length) {
        console.log('  剩余待确认：' + remaining.map((pc) => pc.stage + '/' + pc.role).join(', '));
        console.log('  工作流仍然阻塞。\n');
      } else {
        console.log('  所有确认完成，工作流已恢复。\n');
      }
      printState(state);
      printNextCommand(state, feature);
    });

  // ── list-stages ──
  workflow
    .command('list-stages')
    .description('列出所有已注册的工作流阶段')
    .action(() => {
      console.log('\n  Sovei 工作流阶段：');
      console.log('  ────────────────────────────────────────────');
      for (const name of STAGE_NAMES) {
        const stage = stageRegistry.get(name);
        const req = stage.contract.requiredArtifacts.length > 0
          ? '依赖产物：' + stage.contract.requiredArtifacts.join(', ')
          : '依赖产物：（无）';
        const prod = stage.contract.producesArtifacts.length > 0
          ? '生成产物：' + stage.contract.producesArtifacts.join(', ')
          : '生成产物：（无）';
        console.log('  ' + name.padEnd(12) + ' ' + stage.description);
        console.log('  ' + ' '.repeat(12) + ' ' + req);
        console.log('  ' + ' '.repeat(12) + ' ' + prod);
        console.log('');
      }
    });
}
