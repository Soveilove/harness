import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
import { checkStale, formatStaleWarning } from '../../stale/stale-detector.js';
import type { QuickRunInput } from '../../quick/types.js';

function getStorage(): StorageBackend { return container.inject(TOKENS.Storage); }
function getConfig(): SoveiConfig { return container.inject(TOKENS.Config); }

/**
 * 从 .gitignore 读取排除路径。
 * 当用户未提供 --exclude 时，自动从工作区 .gitignore 提取排除模式，
 * 这样 slash command 模板就不需要硬编码 --exclude dist/**。
 */
function loadGitignoreExclusions(rootPath: string): string[] {
  try {
    const gitignorePath = join(rootPath, '.gitignore');
    const content = readFileSync(gitignorePath, 'utf8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.replace(/^\/+/, '')) // 去掉前导斜杠
      .filter((line) => line.length > 0);
  } catch {
    // 无 .gitignore 或读取失败——返回空数组
    return [];
  }
}

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
      // 用户未提供 --exclude 时，自动从 .gitignore 读取排除路径
      const userExclusions = split(opts.exclude);
      const exclusions = userExclusions.length > 0
        ? userExclusions
        : loadGitignoreExclusions(config.rootPath);
      const input: QuickRunInput = {
        target,
        exclusions,
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
      // ── stale-aware L1：检测治理资产是否可能过期 ──
      const stale = await checkStale(storage, config.rootPath);

      if (opts.json) {
        console.log(JSON.stringify({ ...result, stale }, null, 2));
        return;
      }
      console.log(`\n  QuickRun ${result.run.runId}`);
      console.log('  ────────────────────────────');
      console.log(`  状态：${result.run.status}`);
      console.log(`  风险：${result.run.riskLevel}`);
      console.log(`  基线：${result.run.baselineRevision ?? '不可用'}`);
      const warning = formatStaleWarning(stale);
      if (warning) {
        for (const line of warning.split('\n')) console.log(`  ${line}`);
      }
      console.log(`  确认：${result.confirmation}`);
      for (const line of result.report) console.log(`  · ${line}`);
      console.log(`  usage：sovei-flow/project/usage.jsonl\n`);
    });
}

function split(value?: string): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}
