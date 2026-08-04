import { type Command, Option } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import type { SoveiConfig } from '../../config/types.js';
import type { StorageBackend } from '../../storage/types.js';
import { RuleLifecycleSchema } from '../../rules/schemas.js';
import { adaptProjectRules } from '../../rules/adaptation.js';
import {
  ADAPTED_RULES_FILE,
  ProjectRulesRepository,
  resolveProjectRules,
} from '../../rules/repository.js';

function getStorage(): StorageBackend { return container.inject(TOKENS.Storage); }
function getConfig(): SoveiConfig { return container.inject(TOKENS.Config); }
function parsePaths(value?: string): string[] {
  return value?.split(',').map((path) => path.trim()).filter(Boolean) ?? [];
}

export function registerRulesCommands(program: Command): void {
  const rules = program.command('rules').description('项目工程规范：初始化、旧项目适配、审查与匹配');

  rules.command('validate').description('严格校验全部 *.rules.json 和重复 ID').action(async () => {
    const repository = new ProjectRulesRepository(getStorage(), getConfig().rulesDir);
    const loaded = await repository.load();
    console.log(`\n  ✓ 项目规范有效：${loaded.length} 条（active=${loaded.filter((r) => r.lifecycle === 'active').length}，candidate=${loaded.filter((r) => r.lifecycle === 'candidate').length}）\n`);
  });

  rules.command('adapt').description('从老项目现有约定提取候选规范（永不自动激活）').action(async () => {
    const storage = getStorage();
    const repository = new ProjectRulesRepository(storage, getConfig().rulesDir);
    const result = await adaptProjectRules(storage, repository);
    if (!result.written) {
      console.log('\n  ✓ 未发现项目原有 Agent/IDE Rules，未生成规范候选。\n');
      return;
    }
    console.log(`\n  ✓ 已写入 ${ADAPTED_RULES_FILE}`);
    console.log(`  候选：${result.total} 条；保留已审查状态：${result.preserved} 条`);
    console.log('  下一步：sovei rules list --lifecycle candidate\n');
  });

  rules.command('activate')
    .argument('<id>', '候选规范 ID')
    .requiredOption('--reviewer <name>', '审查人或责任角色')
    .requiredOption('--reason <reason>', '激活依据')
    .description('人工审查后激活一条老项目候选规范')
    .action(async (id: string, opts: { reviewer: string; reason: string }) => {
      const repository = new ProjectRulesRepository(getStorage(), getConfig().rulesDir);
      const activated = await repository.activate(id, opts.reviewer, opts.reason);
      console.log(`\n  ✓ 已激活项目规范 ${activated.id}：${activated.title}\n`);
    });

  rules.command('deprecate')
    .argument('<id>', '项目规范 ID')
    .requiredOption('--reviewer <name>', '审查人或责任角色')
    .requiredOption('--reason <reason>', '废弃依据')
    .description('废弃一条候选或已激活规范，并保留审计历史')
    .action(async (id: string, opts: { reviewer: string; reason: string }) => {
      const repository = new ProjectRulesRepository(getStorage(), getConfig().rulesDir);
      const deprecated = await repository.deprecate(id, opts.reviewer, opts.reason);
      console.log(`\n  ✓ 已废弃项目规范 ${deprecated.id}：${deprecated.title}\n`);
    });

  rules.command('list')
    .addOption(new Option('--lifecycle <value>', 'candidate/active/deprecated').choices(RuleLifecycleSchema.options))
    .option('--stage <stage>', '按工作流阶段筛选')
    .option('--paths <paths>', '按逗号分隔的项目相对路径筛选')
    .option('--json', '输出 JSON')
    .description('列出规范；不传路径时保守返回该阶段全部规范')
    .action(async (opts: { lifecycle?: string; stage?: string; paths?: string; json?: boolean }) => {
      const repository = new ProjectRulesRepository(getStorage(), getConfig().rulesDir);
      const all = await repository.load();
      const selected = resolveProjectRules(all, {
        stage: opts.stage,
        paths: parsePaths(opts.paths),
        lifecycles: opts.lifecycle ? [RuleLifecycleSchema.parse(opts.lifecycle)] : ['candidate', 'active', 'deprecated'],
      });
      if (opts.json) {
        console.log(JSON.stringify(selected, null, 2));
        return;
      }
      console.log('\n  项目规范');
      console.log('  ────────────────────────────');
      if (!selected.length) console.log('  （无匹配规范）');
      for (const rule of selected) {
        console.log(`  ${rule.id} [${rule.lifecycle}/${rule.enforcement}]`);
        console.log(`    ${rule.title}`);
        console.log(`    来源：${rule.source}`);
      }
      console.log('');
    });

  rules.command('resolve')
    .requiredOption('--stage <stage>', '当前工作流阶段')
    .option('--paths <paths>', '按逗号分隔的项目相对路径')
    .option('--json', '输出 JSON')
    .description('解析当前工作所需的 active 项目规范')
    .action(async (opts: { stage: string; paths?: string; json?: boolean }) => {
      const repository = new ProjectRulesRepository(getStorage(), getConfig().rulesDir);
      const selected = resolveProjectRules(await repository.load(), { stage: opts.stage, paths: parsePaths(opts.paths) });
      if (opts.json) console.log(JSON.stringify(selected, null, 2));
      else {
        console.log(`\n  ${opts.stage} 阶段匹配 ${selected.length} 条 active 项目规范：`);
        for (const rule of selected) console.log(`  · ${rule.id}: ${rule.instruction}`);
        console.log('');
      }
    });
}
