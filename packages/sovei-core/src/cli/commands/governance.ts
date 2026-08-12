import type { Command } from 'commander';
import { ChangeControlRepository } from '../../change-control/repository.js';
import type { RedlinePatch } from '../../change-control/schemas.js';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import { resolve } from 'node:path';
import { getFeaturePath } from '../../config/loader.js';
import type { SoveiConfig } from '../../config/types.js';
import { WorkflowEngine } from '../../engine/workflow-engine.js';
import { ARTIFACT_FILES, assertArtifactsCurrent } from '../../config/artifact-version-guard.js';

function repository(): ChangeControlRepository {
  return new ChangeControlRepository(container.inject<StorageBackend>(TOKENS.Storage));
}

function storage(): StorageBackend {
  return container.inject<StorageBackend>(TOKENS.Storage);
}

function collectExample(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

function collectBranch(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export function registerGovernanceCommands(program: Command): void {
  const governance = program.command('governance').description('业务红线治理');
  const redline = governance.command('redline').description('管理项目业务红线');

  redline
   .command('add')
   .description('添加业务红线')
   .argument('<id>', 'Stable uppercase ID, e.g. BILLING_NO_RENEWAL')
    .requiredOption('--title <title>', 'Short redline title')
    .requiredOption('--rule <rule>', 'Business rule that changes must preserve')
    .option('--enforcement <level>', 'absolute | approval-required', 'absolute')
    .option('--rationale <text>', 'Why this redline exists (business context for human review)')
    .option('--scope <text>', 'Where this redline applies')
    .option('--branch <name>', 'Branch this redline applies to (repeatable; absent => global)', collectBranch, [] as string[])
    .option('--example <text>', 'Typical violation example (repeatable)', collectExample, [] as string[])
    .option('--owner <name>', 'Person accountable for this redline')
    .option('--origin <origin>', 'Origin of this redline: manual | scanner-seed | pm-confirmed | agent-generated (default: manual)', 'manual')
    .action(async (id: string, options: {
      title: string; rule: string; enforcement: 'absolute' | 'approval-required';
      rationale?: string; scope?: string; branch: string[]; example: string[]; owner?: string; origin?: string;
    }) => {
      const entry = await repository().addRedline({
        id: id.toUpperCase(),
        title: options.title,
        rule: options.rule,
        enforcement: options.enforcement,
        rationale: options.rationale,
        scope: options.scope,
        branches: options.branch.length ? options.branch : undefined,
        examples: options.example.length ? options.example : undefined,
        owner: options.owner,
        origin: (options.origin as 'manual' | 'scanner-seed' | 'pm-confirmed' | 'agent-generated') || 'manual',
      });
      console.log(`\n  Added redline ${entry.id} [${entry.enforcement}]`);
      console.log('  人工审查视图已刷新：sovei-flow/project/governance/redlines.md\n');
    });

  redline
   .command('list')
   .description('列出业务红线')
   .option('--all', 'Include inactive redlines')
    .option('--force', '放行读取旧版生成的 onboarding 产物')
    .option('--refresh', '放行读取旧版生成的 onboarding 产物（同 --force）')
    .action(async (options: { all?: boolean; force?: boolean; refresh?: boolean }) => {
      await assertArtifactsCurrent(storage(), [ARTIFACT_FILES.redlineSeed], {
        force: options.force ?? false,
        refresh: options.refresh ?? false,
      });
      const entries = await repository().loadRedlines();
      const visible = options.all ? entries : entries.filter((entry) => entry.active);
      if (!visible.length) {
        console.log('\n  No active business redlines.\n');
        return;
      }
      console.log('\n  Business Redlines\n');
      for (const entry of visible) {
        const statusTag = entry.active ? '' : ' [INACTIVE]';
        console.log(`  ${entry.id} [${entry.enforcement}] ${entry.title}${statusTag}`);
        console.log(`    ${entry.rule}`);
      }
      console.log('\n  人工审查视图：sovei-flow/project/governance/redlines.md（sovei governance redline render 重新生成）\n');
    });

  redline
    .command('deactivate')
    .argument('<id>', 'Redline ID')
    .requiredOption('--reason <reason>', 'Why this business redline is no longer active')
    .description('停用红线并保留审计历史')
    .action(async (id: string, options: { reason: string }) => {
      const entry = await repository().deactivateRedline(id.toUpperCase(), options.reason);
      console.log(`\n  Deactivated redline ${entry.id}.`);
      console.log('  人工审查视图已刷新：sovei-flow/project/governance/redlines.md\n');
    })

  redline
    .command('update')
    .argument('<id>', 'Redline ID')
    .description('更新红线内容或人工审查字段')
    .option('--title <title>', 'Short redline title')
    .option('--rule <rule>', 'Business rule that changes must preserve')
    .option('--enforcement <level>', 'absolute | approval-required')
    .option('--rationale <text>', 'Why this redline exists (business context for human review)')
    .option('--scope <text>', 'Where this redline applies')
    .option('--branch <name>', 'Branch this redline applies to (repeatable; overrides existing branches)', collectBranch, [] as string[])
    .option('--clear-branches', 'Clear branch scope => redline becomes global')
    .option('--example <text>', 'Typical violation example (repeatable)', collectExample, [] as string[])
    .option('--owner <name>', 'Person accountable for this redline')
    .option('--reviewer <name>', 'Record a human review by this person')
    .action(async (id: string, options: {
      title?: string; rule?: string; enforcement?: 'absolute' | 'approval-required';
      rationale?: string; scope?: string; branch: string[]; clearBranches?: boolean;
      example: string[]; owner?: string; reviewer?: string;
    }) => {
      const patch: RedlinePatch = {};
      if (options.title !== undefined) patch.title = options.title;
      if (options.rule !== undefined) patch.rule = options.rule;
      if (options.enforcement !== undefined) patch.enforcement = options.enforcement;
      if (options.rationale !== undefined) patch.rationale = options.rationale;
      if (options.scope !== undefined) patch.scope = options.scope;
      // --branch 提供则整体覆盖分支作用域；--clear-branches 显式清空为全局。
      if (options.clearBranches) {
        patch.branches = [];
      } else if (options.branch.length) {
        patch.branches = options.branch;
      }
      if (options.example.length) patch.examples = options.example;
      if (options.owner !== undefined) patch.owner = options.owner;
      if (options.reviewer !== undefined) {
        patch.reviewedBy = options.reviewer;
        patch.reviewedAt = new Date().toISOString();
      }
      const entry = await repository().updateRedline(id.toUpperCase(), patch);
      console.log(`\n  Updated redline ${entry.id}.`);
      console.log('  人工审查视图已刷新：sovei-flow/project/governance/redlines.md\n');
    });

  redline
    .command('render')
    .description('重新生成人工审查视图 sovei-flow/project/governance/redlines.md')
    .option('--force', '放行读取旧版生成的 onboarding 产物')
    .option('--refresh', '放行读取旧版生成的 onboarding 产物（同 --force）')
    .action(async (opts: { force?: boolean; refresh?: boolean }) => {
      await assertArtifactsCurrent(storage(), [ARTIFACT_FILES.redlineSeed], {
        force: opts.force ?? false,
        refresh: opts.refresh ?? false,
      });
      const viewPath = await repository().refreshRedlinesView();
      console.log(`\n  已生成人工审查视图：${viewPath}\n`);
    });

  redline
    .command('import')
    .argument('<file>', 'JSON file with redline definitions')
    .description('从 JSON 文件批量导入红线')
    .action(async (file: string) => {
      const resolvedFile = resolve(file);
      const content = await import('node:fs/promises').then((m) => m.readFile(resolvedFile, 'utf8'));
      let items: Array<{
        id: string; title: string; rule: string; enforcement?: string;
        rationale?: string; scope?: string; branches?: string[]; examples?: string[]; owner?: string;
      }>;
      let fromSeed = false;
      try {
        const parsed = JSON.parse(content);
        // Support both raw array and versioned seed object { redlines: [...] }
        items = Array.isArray(parsed) ? parsed : (parsed?.redlines ?? []);
        fromSeed = !Array.isArray(parsed);
      } catch {
        throw new Error('Invalid JSON in ' + file);
      }
      if (!Array.isArray(items)) {
        throw new Error('Expected a JSON array or a seed object with a redlines array');
      }
      const repo = repository();
      let added = 0;
      let skipped = 0;
      const failed: string[] = [];
      for (const item of items) {
        try {
          await repo.addRedline({
            id: item.id.toUpperCase(),
            title: item.title,
            rule: item.rule,
            enforcement: (item.enforcement as 'absolute' | 'approval-required') || 'absolute',
            rationale: item.rationale,
            scope: item.scope,
            branches: item.branches,
            examples: item.examples,
            owner: item.owner,
            origin: fromSeed ? 'scanner-seed' : 'manual',
          }, { refreshView: false });
          added++;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/already exists/i.test(message)) {
            skipped++;
          } else {
            failed.push(`${item.id ?? '<无 id>'}: ${message}`);
          }
        }
      }
      await repo.refreshRedlinesView();
      for (const failure of failed) console.error(`  ✗ ${failure}`);
      console.log(`\n  已导入 ${added} 条红线，跳过 ${skipped} 条重复${failed.length ? '，失败 ' + failed.length + ' 条' : ''}。\n`);
      if (failed.length) process.exitCode = 1;
    });

  const reviewPack = governance.command('review-pack').description('需求对齐与确认包生成与导入');

  reviewPack
    .command('generate')
    .argument('<feature>', 'Feature ID')
    .description('从 reconciliation.md 渲染 tech-review.md 和 product-review.md')
    .action(async (feature: string) => {
      const storage = container.inject<StorageBackend>(TOKENS.Storage);
      const config = container.inject<SoveiConfig>(TOKENS.Config);
      const featurePath = getFeaturePath(config, feature);
      const reconContent = await storage.read(featurePath + '/reconciliation.md');
      if (!reconContent) {
        throw new Error('reconciliation.md not found. Run spec stage first: sovei workflow spec ' + feature);
      }
      const { parseReconciliation, renderTechReview, renderProductReview } = await import('../../review/index.js');
      const doc = parseReconciliation(reconContent);
      const techMd = renderTechReview(doc);
      const productMd = renderProductReview(doc);
      await storage.write(featurePath + '/tech-review.md', techMd);
      await storage.write(featurePath + '/product-review.md', productMd);
      console.log('\n  已生成：');
      console.log('    ' + featurePath + '/tech-review.md');
      console.log('    ' + featurePath + '/product-review.md');
      console.log('\n  交付审阅后，导入确认：');
      console.log('    sovei governance review-pack import ' + feature + ' --product ' + featurePath + '/product-review.md --by <name> --reference <ref>');
      console.log('');
    });

  reviewPack
    .command('import')
    .argument('<feature>', 'Feature ID')
    .requiredOption('--product <file>', '产品签字后的 product-review.md 文件路径')
    .requiredOption('--by <name>', '签字人姓名')
    .requiredOption('--reference <ref>', '审批参考（工单、文档等）')
    .description('导入 PM 签字的产品确认，解除工作流阻塞')
    .action(async (feature: string, opts: { product: string; by: string; reference: string }) => {
      const storage = container.inject<StorageBackend>(TOKENS.Storage);
      const config = container.inject<SoveiConfig>(TOKENS.Config);
      const { parseReconciliation } = await import('../../review/index.js');
      const featurePath = getFeaturePath(config, feature);
      const engine = container.inject<WorkflowEngine>(TOKENS.WorkflowEngine);
      const state = await engine.getState(feature);
      const productPending = state.pendingConfirmations.find(
        (pc: { role: string; confirmedBy: string | null; overridden: boolean }) => pc.role === 'product' && !pc.confirmedBy && !pc.overridden,
      );
      if (productPending) {
        await engine.confirmGate(feature, productPending.stage, 'product', opts.by, opts.reference);
        console.log('\n  ✅ 产品确认已记录：' + opts.by + ' / ' + opts.reference);
      } else {
        console.log('\n  ℹ️ 无待审的产品确认门禁。');
      }
      const newState = await engine.getState(feature);
      const techPending = newState.pendingConfirmations.find(
        (pc: { role: string; confirmedBy: string | null; overridden: boolean }) => pc.role === 'tech' && !pc.confirmedBy && !pc.overridden,
      );
      if (techPending) {
        console.log('  剩余待审：技术确认');
        console.log('  sovei workflow confirm ' + feature + ' --stage ' + techPending.stage + ' --role tech --by <name> --reference <ref>');
      } else {
        console.log('  所有确认完成，工作流已恢复。');
      }
      console.log('');
    });
;
}
