import type { Command } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import type { SoveiConfig } from '../../config/types.js';
import { KnowledgeStore } from '../../knowledge/store.js';
import { ChangeControlRepository } from '../../change-control/repository.js';
import { ProjectRulesRepository, resolveProjectRules } from '../../rules/repository.js';
import { ArtifactRepository } from '../../artifacts/repository.js';
import { getFeaturePath } from '../../config/loader.js';
import { buildContextPack } from '../../context/builder.js';
import { buildSnapshot } from '../../context/snapshot.js';
import { VERSION } from '../../config/version.js';
import { evaluateQuickRun } from '../../quick/run.js';
import { getGitBaseline } from '../../quick/git-verifier.js';
import type { QuickRunInput } from '../../quick/types.js';

function getStorage(): StorageBackend { return container.inject(TOKENS.Storage); }
function getConfig(): SoveiConfig { return container.inject(TOKENS.Config); }

export function registerQuickCommands(program: Command): void {
  program
    .command('quick')
    .description('机器先审的局部修改快速通道（只检查，不自动修改源码）')
    .argument('<target>', '要修改的目标描述')
    .option('--exclude <paths>', '逗号分隔的排除路径')
    .option('--paths <paths>', '逗号分隔的声明目标路径')
    .option('--symbols <symbols>', '逗号分隔的声明符号')
    .option('--test <commands>', '逗号分隔的声明测试/检查')
    .option('--feature <feature>', '用于加载 Feature 上下文的 Feature ID', 'quick')
    .option('--stage <stage>', '上下文阶段', 'implement')
    .option('--json', '输出机器可读 JSON')
    .action(async (target: string, opts: {
      exclude?: string;
      paths?: string;
      symbols?: string;
      test?: string;
      feature: string;
      stage: string;
      json?: boolean;
    }) => {
      const storage = getStorage();
      const config = getConfig();
      const input: QuickRunInput = {
        target,
        exclusions: split(opts.exclude),
        declaredPaths: split(opts.paths),
        declaredSymbols: split(opts.symbols),
        declaredTests: split(opts.test),
      };
      const knowledgeStore = new KnowledgeStore(storage, config.knowledgeDir);
      await knowledgeStore.load();
      const knowledge = knowledgeStore.selectAll();
      const redlineRepository = new ChangeControlRepository(storage);
      const redlines = await redlineRepository.loadRedlines();
      const rulesRepository = new ProjectRulesRepository(storage, config.rulesDir);
      const projectRules = resolveProjectRules(await rulesRepository.load(), {
        stage: opts.stage,
        paths: input.declaredPaths,
      });
      const featurePath = getFeaturePath(config, opts.feature);
      const artifactsRepository = new ArtifactRepository(storage, featurePath);
      const artifacts: Array<{ name: string; content: string }> = [];
      for (const name of (await artifactsRepository.list()).filter((entry) => entry.endsWith('.md'))) {
        const content = await artifactsRepository.read(name);
        if (content && !content.includes('SOVEI_TEMPLATE_PLACEHOLDER')) artifacts.push({ name, content });
      }
      const contextPack = buildContextPack({
        feature: opts.feature,
        stage: opts.stage,
        redlines,
        projectRules,
        knowledge,
        artifacts,
        snapshot: buildSnapshot(knowledge, config.project.name, { engineVersion: VERSION, scannerVersion: VERSION }),
      });
      const result = await evaluateQuickRun({
        workspaceRoot: config.rootPath,
        storage,
        request: input,
        contextPack,
        redlines,
        projectRules,
        baselineRevision: await getGitBaseline(config.rootPath),
      });
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`\n  QuickRun ${result.run.runId}`);
      console.log('  ────────────────────────────');
      console.log(`  状态：${result.run.status}`);
      console.log(`  风险：${result.run.riskLevel}`);
      console.log(`  基线：${result.run.baselineRevision ?? '不可用'}`);
      console.log(`  确认：${result.confirmation}`);
      for (const line of result.report) console.log(`  · ${line}`);
      console.log(`  usage：harness/project/usage.jsonl\n`);
    });
}

function split(value?: string): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}
