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
  'load', 'grill', 'wayfind', 'spec', 'scope', 'plan',
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

export function registerWorkflowCommands(program: Command): void {
  const workflow = program.command('workflow').description('工作流阶段命令');

  // ── bootstrap ──
  workflow
    .command('bootstrap')
    .argument('<feature>', '要创建的 Feature ID')
    .description('创建带初始工作流状态的新 Feature')
    .action(async (feature: string) => {
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

  // ── All 12 stages ──
  for (const stageName of STAGE_NAMES) {
    const stage = stageRegistry.get(stageName);
    workflow
      .command(stageName)
      .argument('<feature>', 'Feature ID')
      .option('--complete', '校验产物并完成该阶段')
      .option('--task <id>', 'implement 阶段选择的任务 ID')
      .description(stage.description)
      .action(async (feature: string, opts: { complete?: boolean; task?: string }) => {
        const engine = getEngine();
        if (stageName !== 'implement' && opts.task) {
          throw new Error('--task is only valid for the implement stage');
        }
        if (opts.complete) {
          const state = stageName === 'implement' && opts.task
            ? await engine.completeTask(feature, opts.task)
            : await engine.completeStage(feature, stageName);
          const message = stageName === 'implement' && opts.task
            ? `任务 '${opts.task}' 已完成；implement 阶段继续保持活动。`
            : `阶段 '${stageName}' 已完成。`;
          console.log('\n  ✓ ' + message + '\n');
          printState(state);
          printNextCommand(state, feature);
          return;
        }
        if (stageName === 'implement' && !opts.task) {
          throw new Error("implement preparation requires --task <id>");
        }
        const result = await engine.prepareStage(feature, stageName);
        console.log('\n  已准备阶段 \'' + stageName + '\'；工作流状态未推进。\n');
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
