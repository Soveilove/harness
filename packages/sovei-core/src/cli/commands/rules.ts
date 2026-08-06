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

  rules.command('adapt').description('从项目已有约定（Agent Rules + 团队规范文档 doc/docs/CONTRIBUTING）提取候选规范（永不自动激活）').action(async () => {
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

  rules.command('refine')
    .requiredOption('--reviewer <name>', '审查人或责任角色（通常为运行本命令的 AI agent 身份）')
    .requiredOption('--reason <reason>', '批量精炼依据（AI 判断理由）')
    .option('--discard <ids>', '逗号分隔的候选 ID，AI 判断为噪声/过时需废弃')
    .description('AI code agent 精炼候选规范：读取候选清单 + 真实代码，判断有效/过时/合并，批量废弃噪声候选')
    .action(async (opts: { reviewer: string; reason: string; discard?: string }) => {
      const repository = new ProjectRulesRepository(getStorage(), getConfig().rulesDir);
      const candidates = (await repository.load()).filter((rule) => rule.lifecycle === 'candidate');
      if (!candidates.length) {
        console.log('\n  没有候选规范需要精炼。先运行 sovei rules adapt 提取候选。\n');
        return;
      }

      if (!opts.discard) {
        // 无 --discard：进入"精炼引导模式"，输出候选清单供 AI code agent 读真实代码判断
        console.log('\n  AI RULE REFINE GUIDE');
        console.log('  ================================================================');
        console.log('  你是 AI code agent。以下候选规范由 sovei rules adapt 从项目现有约定忠实提取，');
        console.log('  尚未激活。请读取真实代码和配置文件，判断每条候选是否仍代表当前有效规范。');
        console.log('');
        console.log('  ## 候选清单（' + candidates.length + ' 条，lifecycle=candidate）');
        for (const rule of candidates) {
          console.log('  - ' + rule.id + '  [' + (rule.confidence ?? 'medium') + ']');
          console.log('      规范：' + rule.instruction);
          console.log('      来源：' + rule.provenance.sources.join(', '));
        }
        console.log('');
        console.log('  ## 你的任务');
        console.log('  1. 对每条候选，读其 provenance.sources 提到的文件 + 相关真实代码/配置。');
        console.log('  2. 判断：仍有效 → 保留待人工激活；过时/噪声 → 记下 ID；重复 → 记下合并目标。');
        console.log('  3. 应用结论：');
        console.log('     sovei rules refine --reviewer <agent> --reason "<结论>" --discard <噪声ID,用逗号分隔>');
        console.log('  4. 保留的有效候选由人工激活：sovei rules activate <id> --reviewer maintainer --reason "..."');
        console.log('');
        return;
      }

      const discardIds = opts.discard.split(',').map((id) => id.trim()).filter(Boolean);
      const deprecated = await repository.deprecateMany(discardIds, opts.reviewer, opts.reason);
      const remaining = (await repository.load()).filter((rule) => rule.lifecycle === 'candidate');
      console.log('\n  ✓ AI 精炼完成：废弃 ' + deprecated.length + ' 条候选，剩余 ' + remaining.length + ' 条待人工激活');
      if (deprecated.length) {
        console.log('  已废弃：' + deprecated.join(', '));
      }
      console.log('  下一步：人工审查剩余候选并激活：sovei rules list --lifecycle candidate\n');
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
