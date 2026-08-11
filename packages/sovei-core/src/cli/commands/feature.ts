/**
 * Feature Commands
 * archive — 将已完成 Feature 的过程产物折叠到 _archive/ 子目录
 *
 * 顶层只保留被 context build / cross-feature / workflow 引擎直接依赖的持久文件。
 * 过程产物（各阶段中间 .md 文件）移到 _archive/，减少目录杂乱和上下文膨胀。
 */

import type { Command } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import type { SoveiConfig } from '../../config/types.js';
import { getFeaturePath } from '../../config/loader.js';

/** 持久文件白名单——这些文件留在顶层不归档 */
const PERSISTENT_FILES = new Set([
  'decision-log.md',
  'sync-report.md',
  'load-summary.md',
  'wayfinder.md',
]);

interface ArchiveResult {
  archived: string[];
  skipped: string[];
  retained: string[];
}

function getStorage(): StorageBackend {
  return container.inject<StorageBackend>(TOKENS.Storage);
}

function getConfig(): SoveiConfig {
  return container.inject<SoveiConfig>(TOKENS.Config);
}

/**
 * 将已完成 Feature 的过程产物移动到 _archive/ 子目录。
 * 幂等：已在 _archive/ 中的文件跳过，不覆盖。
 */
export async function archiveFeature(
  storage: StorageBackend,
  featurePath: string,
  featureId: string,
): Promise<ArchiveResult> {
  const archived: string[] = [];
  const skipped: string[] = [];
  const retained: string[] = [];

  // 检查 Feature 目录存在（storage.exists 只检查文件，用 list 判断目录是否有内容）
  const allFiles = await storage.list(featurePath);
  const dirExists = allFiles.length > 0 || await storage.isDirectory(featurePath);
  if (!dirExists) {
    throw new Error(`Feature 目录不存在: ${featurePath}`);
  }

  // 检查工作流状态为 completed
  const stateContent = await storage.read(`${featurePath}/workflow-state.yaml`);
  if (!stateContent) {
    throw new Error('无法读取工作流状态: workflow-state.yaml 不存在');
  }
  const statusMatch = stateContent.match(/^status:\s*(\S+)/m);
  const status = statusMatch ? statusMatch[1] : null;
  if (status !== 'completed') {
    throw new Error(`只能归档已完成的 Feature（当前状态: ${status ?? 'unknown'}）`);
  }

  // 列出顶层文件（非递归，不含子目录）——复用前面已查的 allFiles

  for (const file of allFiles) {
    // 非 .md 文件保留在顶层（.yaml、.jsonl、.json 等）
    if (!file.endsWith('.md')) {
      retained.push(file);
      continue;
    }

    // 持久文件白名单保留在顶层
    if (PERSISTENT_FILES.has(file)) {
      retained.push(file);
      continue;
    }

    // 检查 _archive/ 是否已有同名文件
    const archivePath = `${featurePath}/_archive/${file}`;
    const alreadyArchived = await storage.exists(archivePath);
    if (alreadyArchived) {
      skipped.push(file);
      continue;
    }

    // 读取内容 → 写入 _archive/ → 删除原文件
    const content = await storage.read(`${featurePath}/${file}`);
    if (content !== null) {
      await storage.write(archivePath, content);
      await storage.delete(`${featurePath}/${file}`);
      archived.push(file);
    }
  }

  return { archived, skipped, retained };
}

export function registerFeatureCommands(program: Command): void {
  const feature = program.command('feature').description('Feature 生命周期管理');

  // ── archive ──
  feature
    .command('archive')
    .description('将已完成 Feature 的过程产物归档到 _archive/ 子目录')
    .argument('<id>', 'Feature ID')
    .action(async (featureId: string) => {
      const storage = getStorage();
      const config = getConfig();
      const featurePath = getFeaturePath(config, featureId);

      try {
        const result = await archiveFeature(storage, featurePath, featureId);

        console.log('');
        console.log('  ✓ Feature ' + featureId + ' 归档完成');
        console.log('');

        if (result.archived.length > 0) {
          console.log('  已归档（' + result.archived.length + ' 个文件）:');
          for (const f of result.archived) {
            console.log('    → ' + f);
          }
          console.log('');
        }

        if (result.skipped.length > 0) {
          console.log('  已跳过（已在 _archive/ 中）:');
          for (const f of result.skipped) {
            console.log('    · ' + f);
          }
          console.log('');
        }

        console.log('  保留在顶层（' + result.retained.length + ' 个文件）:');
        for (const f of result.retained) {
          console.log('    ★ ' + f);
        }
        console.log('');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('\n  ✗ ' + message + '\n');
        process.exitCode = 1;
      }
    });
}
