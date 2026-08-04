/**
 * Context Commands
 * sovei context build <feature> --stage <stage> [--adapter <id>] [--query <text>]
 * sovei context status
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
    .option('--json', '输出 JSON 而非 Markdown')
    .action(async (feature: string, opts: { stage: string; adapter?: string; query?: string; paths?: string; json?: boolean }) => {
      const storage = getStorage();
      const config = getConfig();
      const featurePath = getFeaturePath(config, feature);

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

      // Load Feature artifacts
      const artifacts = new ArtifactRepository(storage, featurePath);
      const artifactNames = await artifacts.list();
      const artifactContents: Array<{ name: string; content: string }> = [];
      for (const name of artifactNames.filter((n) => n.endsWith('.md'))) {
        const content = await artifacts.read(name);
        if (content && !content.includes('SOVEI_TEMPLATE_PLACEHOLDER')) {
          artifactContents.push({ name, content });
        }
      }

      // Load or build snapshot
      const snapshot = await loadSnapshot(storage);
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
        snapshot: freshSnapshot,
      });

      if (opts.json) {
        console.log(JSON.stringify(pack, null, 2));
      } else {
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
}
