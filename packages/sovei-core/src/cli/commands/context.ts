/**
 * Context Commands
 * sovei context build <feature> --stage <stage> [--adapter <id>] [--query <text>]
 * sovei context status
 * sovei context cross-feature-index <feature>   — 子 Agent 契约：输出 cross-feature 索引 JSON
 * sovei context expand <feature-id> <artifact>  — 子 Agent 契约：按需展开单个产物
 */

import type { Command } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import type { SoveiConfig } from '../../config/types.js';
import { KnowledgeStore } from '../../knowledge/store.js';
import { ChangeControlRepository } from '../../change-control/repository.js';
import { ArtifactRepository } from '../../artifacts/repository.js';
import { getFeaturePath } from '../../config/loader.js';
import { buildContextPack, renderContextPackMarkdown } from '../../context/builder.js';
import { buildSnapshot, saveSnapshot, loadSnapshot, isStale, computeSourceHash } from '../../context/snapshot.js';
import { ProjectRulesRepository, resolveProjectRules } from '../../rules/repository.js';
import { VERSION } from '../../config/version.js';
import { buildContextPolicy } from '../../context/policy.js';
import { extractFeatureMeta, scoreCrossFeature } from '../../context/cross-feature.js';
import { checkStale, formatStaleWarning } from '../../stale/stale-detector.js';
import type { WorkflowEngine } from '../../engine/workflow-engine.js';

function getStorage(): StorageBackend { return container.inject(TOKENS.Storage); }
function getConfig(): SoveiConfig { return container.inject(TOKENS.Config); }

export function registerContextCommands(program: Command): void {
  const context = program.command('context').description('上下文包构建与版本检查');

  context
    .command('build')
    .argument('<feature>', 'Feature ID')
    .requiredOption('--stage <stage>', '当前工作流阶段')
    .option('--adapter <id>', '目标 IDE 适配器 ID')
    .option('--query <text>', '可选检索查询')
    .option('--paths <paths>', '按逗号分隔的项目相对路径，用于匹配项目规范')
    .option('--cross-feature', '加载其他 Feature 的 decision-log 作为建议参考（按相关性 Top-N 筛选）')
    .option('--cross-feature-limit <n>', 'cross-feature Top-N 数量（默认 5）', '5')
    .option('--budget <chars>', '上下文包字符预算上限（超预算项降级为索引摘要）')
    .option('--json', '输出 JSON 而非 Markdown')
    .option('--sub-change <id>', '聚焦子变更 ID（加载父 Feature 共享前段 + 子变更专属后段）')
    .action(async (feature: string, opts: { stage: string; adapter?: string; query?: string; paths?: string; crossFeature?: boolean; crossFeatureLimit?: string; budget?: string; json?: boolean; subChange?: string }) => {
      const storage = getStorage();
      const config = getConfig();
      const featurePath = getFeaturePath(config, feature);
      const subChangeId = opts.subChange;
      const subChangePath = subChangeId ? `${featurePath}/sub-changes/${subChangeId}` : null;

      // Load knowledge
      const knowledgeStore = new KnowledgeStore(storage, config.knowledgeDir);
      await knowledgeStore.load();
      const knowledge = knowledgeStore.selectAll();

      // Load active redlines
      const repo = new ChangeControlRepository(storage);
      const redlines = await repo.loadRedlines();

      // Load active project rules. With no target paths, resolution is conservative
      // and includes every rule matching the current stage.
      const rulesRepository = new ProjectRulesRepository(storage, config.rulesDir);
      const projectRules = resolveProjectRules(await rulesRepository.load(), {
        stage: opts.stage,
        paths: opts.paths?.split(',').map((path) => path.trim()).filter(Boolean),
      });

      // Load Feature artifacts.
      // When --sub-change is set, load the parent Feature's shared front-stages
      // (explore→grill) PLUS the sub-change's spec→verify artifacts.
      const SHARED_FRONT_ARTIFACTS = new Set([
        'exploration.md', 'requirement.md', 'decision-log.md',
        'sub-change-map.md',
      ]);
      const artifacts = new ArtifactRepository(storage, featurePath);
      const artifactNames = await artifacts.list();
      const artifactContents: Array<{ name: string; content: string }> = [];
      for (const name of artifactNames.filter((n) => n.endsWith('.md'))) {
        // In sub-change mode, skip the parent's plan→verify artifacts
        // (those belong to sub-changes, not the shared context).
        if (subChangeId && !SHARED_FRONT_ARTIFACTS.has(name)) continue;
        const content = await artifacts.read(name);
        if (content && !content.includes('SOVEI_TEMPLATE_PLACEHOLDER')) {
          artifactContents.push({ name, content });
        }
      }

      // Load sub-change-specific artifacts (spec→verify) when --sub-change is set.
      if (subChangeId && subChangePath) {
        const subArtifacts = new ArtifactRepository(storage, subChangePath);
        const subNames = await subArtifacts.list();
        for (const name of subNames.filter((n) => n.endsWith('.md'))) {
          const content = await subArtifacts.read(name);
          if (content && !content.includes('SOVEI_TEMPLATE_PLACEHOLDER')) {
            // Prefix with sub-change id to distinguish from parent artifacts.
            artifactContents.push({ name: `${subChangeId}/${name}`, content });
          }
        }
        // Also load sibling sub-changes' id/name/goal/status as a summary.
        const engine = container.inject<WorkflowEngine>(TOKENS.WorkflowEngine);
        try {
          const siblings = await engine.listSubChanges(feature);
          const siblingSummary = siblings
            .map((sc) => `- ${sc.id} (${sc.status}) — ${sc.goal}${sc.dependsOn.length ? ` [依赖: ${sc.dependsOn.join(',')}]` : ''}`)
            .join('\n');
          if (siblingSummary) {
            artifactContents.push({
              name: `${subChangeId}/sibling-sub-changes.md`,
              content: `# Sibling Sub-Changes\n\n${siblingSummary}\n`,
            });
          }
        } catch {
          // Engine may not be available in all contexts; skip silently.
        }
      }

      // Load cross-feature decision logs when requested — 按相关性 Top-N 筛选
      const crossFeatureArtifacts: Array<{ featureId: string; name: string; content: string }> = [];
      if (opts.crossFeature) {
        const crossFeatureLimit = parseInt(opts.crossFeatureLimit ?? '5', 10) || 5;
        const currentPaths = opts.paths?.split(',').map((p) => p.trim()).filter(Boolean) ?? [];

        // 读取当前 Feature 的 decision-log 用于提取元数据
        const currentDl = await storage.read(`${config.specsDir}/${feature}/decision-log.md`);
        const currentMeta = currentDl
          ? extractFeatureMeta(feature, currentDl, currentPaths)
          : extractFeatureMeta(feature, '', currentPaths);

        // 读取所有其他 Feature 的 decision-log（使用 listEntries 获取目录列表）
        const allEntries = await storage.listEntries(config.specsDir);
        const specDirs = allEntries.filter((e) => e.isDirectory && e.name !== feature && e.name !== '.gitkeep').map((e) => e.name);
        const otherMetas: Array<{ featureId: string; content: string; meta: ReturnType<typeof extractFeatureMeta> }> = [];
        for (const specDir of specDirs) {
          const dl = await storage.read(`${config.specsDir}/${specDir}/decision-log.md`);
          if (dl && !dl.includes('SOVEI_TEMPLATE_PLACEHOLDER')) {
            otherMetas.push({
              featureId: specDir,
              content: dl,
              meta: extractFeatureMeta(specDir, dl),
            });
          }
        }

        // 按相关性评分取 Top-N
        const scored = scoreCrossFeature(
          currentMeta,
          otherMetas.map((o) => o.meta),
          crossFeatureLimit,
        );
        const topIds = new Set(scored.map((s) => s.featureId));

        // 仅将 Top-N 的 decision-log 加入 crossFeatureArtifacts
        for (const item of otherMetas.filter((o) => topIds.has(o.featureId))) {
          crossFeatureArtifacts.push({ featureId: item.featureId, name: 'decision-log.md', content: item.content });
        }
      }

      // Always compute a fresh snapshot for the context pack
      const freshSnapshot = buildSnapshot(knowledge, config.project.name, {
        engineVersion: VERSION,
        scannerVersion: VERSION,
      });

      const pack = buildContextPack({
        feature,
        stage: opts.stage,
        adapter: opts.adapter,
        query: opts.query,
        redlines,
        projectRules,
        knowledge,
        artifacts: artifactContents,
        crossFeatureArtifacts,
        snapshot: freshSnapshot,
      });

      // 解析预算参数
      const budget = opts.budget ? parseInt(opts.budget, 10) : undefined;
      pack.policy = buildContextPolicy(pack, redlines, projectRules, {
        paths: opts.paths?.split(',').map((path) => path.trim()).filter(Boolean),
        stage: opts.stage,
        budget: budget && budget > 0 ? budget : undefined,
      });

      // 按 actual 模式过滤 required——scoped 时只交付命中项 + 全局不变量
      if (pack.policy.actualRequired && pack.policy.actualRequired.length < pack.required.length) {
        pack.required = pack.policy.actualRequired;
      }

      // ── stale-aware L1：检测治理资产是否可能过期 ──
      const stale = await checkStale(storage, config.rootPath);

      if (opts.json) {
        console.log(JSON.stringify({ ...pack, stale }, null, 2));
      } else {
        const warning = formatStaleWarning(stale);
        if (warning) {
          console.log('\n' + warning + '\n');
        }
        console.log(renderContextPackMarkdown(pack));
      }
    });

  context
    .command('status')
    .description('显示知识索引版本与 stale 状态')
    .action(async () => {
      const storage = getStorage();
      const config = getConfig();
      const knowledgeStore = new KnowledgeStore(storage, config.knowledgeDir);
      await knowledgeStore.load();
      const knowledge = knowledgeStore.selectAll();

      const savedSnapshot = await loadSnapshot(storage);
      const stale = isStale(knowledge, savedSnapshot);
      const currentHash = computeSourceHash(knowledge);

      console.log('\n  知识索引状态');
      console.log('  ────────────────────────────');
      console.log('  当前条目数：  ' + knowledge.length);
      console.log('  当前哈希：    ' + currentHash.slice(0, 16) + '…');
      if (savedSnapshot) {
        console.log('  快照哈希：    ' + savedSnapshot.sourceHash.slice(0, 16) + '…');
        console.log('  indexVersion：' + savedSnapshot.indexVersion);
        console.log('  engineVersion：' + savedSnapshot.engineVersion);
        console.log('  scannerVersion：' + savedSnapshot.scannerVersion);
        console.log('  createdAt：    ' + savedSnapshot.createdAt);
      } else {
        console.log('  快照：        （无，视为 stale）');
      }
      console.log('  状态：        ' + (stale ? 'stale（需重建）' : 'current（最新）'));
      console.log('');
    });

  // ── cross-feature-index — 子 Agent 契约：输出 cross-feature 索引 JSON ──
  // 供宿主 AI（如 CodeBuddy Task）分派子 Agent 并行读取各 Feature 的 decision-log
  context
    .command('cross-feature-index')
    .description('输出其他 Feature 的相关性索引 JSON（供子 Agent 并行加载）')
    .argument('<feature>', '当前 Feature ID')
    .option('--paths <paths>', '按逗号分隔的项目相对路径，用于相关性评分')
    .action(async (feature: string, opts: { paths?: string }) => {
      const storage = getStorage();
      const config = getConfig();
      const currentPaths = opts.paths?.split(',').map((p) => p.trim()).filter(Boolean) ?? [];

      // 读取当前 Feature 的 decision-log
      const currentDl = await storage.read(`${config.specsDir}/${feature}/decision-log.md`);
      const currentMeta = currentDl
        ? extractFeatureMeta(feature, currentDl, currentPaths)
        : extractFeatureMeta(feature, '', currentPaths);

      // 读取所有其他 Feature 的 decision-log 元数据（不加载 content）
      const allEntries = await storage.listEntries(config.specsDir);
      const specDirs = allEntries.filter((e) => e.isDirectory && e.name !== feature && e.name !== '.gitkeep').map((e) => e.name);
      const otherMetas: ReturnType<typeof extractFeatureMeta>[] = [];
      for (const specDir of specDirs) {
        const dl = await storage.read(`${config.specsDir}/${specDir}/decision-log.md`);
        if (dl && !dl.includes('SOVEI_TEMPLATE_PLACEHOLDER')) {
          otherMetas.push(extractFeatureMeta(specDir, dl));
        }
      }

      // 评分并输出全部（不截断 Top-N，让宿主 AI 自行决定取多少）
      const scored = scoreCrossFeature(currentMeta, otherMetas, otherMetas.length);

      // 输出带子 Agent 契约提示的包装对象
      // 宿主 AI（CodeBuddy Task / CC Task / Codex）据此分派子 Agent 并行读取
      const output = {
        _subagentContract: {
          hint: '以下每个 item 可由一个子 Agent 并行读取。为每个 item 分派一个子 Agent，'
            + 'prompt 指示其运行 `sovei context expand <featureId> decision-log.md` '
            + '并返回完整输出。子 Agent 数量建议取 relevanceScore > 0 的前 N 项（如 5）。',
          expandCommand: 'sovei context expand <featureId> decision-log.md',
          parallelizable: true,
          hostAgents: ['codebuddy:Task', 'claude-code:Task', 'codex:agent'],
        },
        items: scored,
      };
      console.log(JSON.stringify(output, null, 2));
    });

  // ── expand — 子 Agent 契约：按需展开单个 Feature 产物 ──
  // 供宿主 AI 在 index+on-demand 模式下按需读取完整内容
  context
    .command('expand')
    .description('按需展开指定 Feature 的指定产物（截断 4000 字符）')
    .argument('<feature-id>', '要展开的 Feature ID')
    .argument('<artifact>', '产物文件名（如 decision-log.md）')
    .action(async (featureId: string, artifactName: string) => {
      const storage = getStorage();
      const config = getConfig();

      const content = await storage.read(`${config.specsDir}/${featureId}/${artifactName}`);
      if (!content) {
        console.error(`\n  ✗ 未找到产物：${featureId}/${artifactName}\n`);
        process.exitCode = 1;
        return;
      }
      if (content.includes('SOVEI_TEMPLATE_PLACEHOLDER')) {
        console.error(`\n  ✗ 产物仍是模板：${featureId}/${artifactName}\n`);
        process.exitCode = 1;
        return;
      }

      // 截断 4000 字符（与 buildContextPack 的 fromArtifact 一致）
      const truncated = content.slice(0, 4000);
      process.stdout.write(truncated);
      if (content.length > 4000) {
        process.stdout.write('\n\n<!-- truncated at 4000 chars -->\n');
      }
    });
}
