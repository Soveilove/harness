/**
 * Adapter Commands
 * sovei adapters list           — 列出所有已注册适配器及安装状态
 * sovei adapters install        — 交互式选择并安装适配器指令
 *   --adapters <ids>            — 指定适配器 ID 列表（逗号分隔）
 *   --all                       — 安装全部适配器
 */

import type { Command } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import { adapterRegistry } from '../../adapters/registry.js';
import { installAdapters, checkAdapterInstalled } from '../../adapters/installer.js';

function getStorage(): StorageBackend {
  return container.inject(TOKENS.Storage);
}

export function registerAdapterCommands(program: Command): void {
  const adapters = program.command('adapters').description('IDE 适配器管理');

  // ── adapters list — 列出所有适配器及安装状态 ──
  adapters
    .command('list')
    .description('列出所有已注册 IDE 适配器及安装状态')
    .option('--json', '输出 JSON 格式')
    .action(async (opts: { json?: boolean }) => {
      const storage = getStorage();
      const all = adapterRegistry.list();

      const rows = await Promise.all(
        all.map(async (adapter) => ({
          id: adapter.id,
          name: adapter.name,
          contextFile: adapter.contextFile,
          hasQuickChannel: Boolean(adapter.quickChannelDirective),
          hasSlashCommand: Boolean(adapter.slashCommand),
          installed: await checkAdapterInstalled(adapter, storage),
        })),
      );

      if (opts.json) {
        console.log(JSON.stringify(rows, null, 2));
        return;
      }

      console.log('');
      console.log('  已注册 IDE 适配器：');
      console.log('');
      console.log('  ID          名称             上下文文件         快速通道    状态');
      console.log('  ──────────  ───────────────  ────────────────  ─────────  ──────');
      for (const row of rows) {
        const id = row.id.padEnd(12);
        const name = row.name.padEnd(16);
        const ctx = row.contextFile.padEnd(18);
        const qc = (row.hasQuickChannel ? '✓' : '—').padEnd(10);
        const status = row.installed ? '✓ 已安装' : '未安装';
        console.log(`  ${id}${name}${ctx}${qc}${status}`);
      }
      console.log('');
    });

  // ── adapters install — 安装适配器指令文件 ──
  adapters
    .command('install')
    .description('安装 IDE 适配器快速通道指令文件')
    .option('--adapters <ids>', '指定适配器 ID 列表（逗号分隔，如 trae,codebuddy）')
    .option('--all', '安装全部已注册适配器')
    .action(async (opts: { adapters?: string; all?: boolean }) => {
      const storage = getStorage();
      const allAdapters = adapterRegistry.list();

      // 确定要安装的适配器列表
      let selectedIds: string[];

      if (opts.all) {
        // 安装全部——但只选有 quickChannelDirective 的
        selectedIds = allAdapters
          .filter((a) => a.quickChannelDirective)
          .map((a) => a.id);
      } else if (opts.adapters) {
        selectedIds = opts.adapters
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
        // 验证 ID 有效
        for (const id of selectedIds) {
          try {
            adapterRegistry.get(id);
          } catch {
            console.error(`\n  ✗ 未知的适配器 ID：${id}\n`);
            console.error('  可用适配器：' + allAdapters.map((a) => a.id).join(', ') + '\n');
            process.exitCode = 1;
            return;
          }
        }
      } else {
        // 无参数——TTY 下弹出多选器；非交互环境回落为列表提示。
        const { selectAdapters } = await import('../adapter-selector.js');
        const installable = allAdapters
          .filter((a) => a.quickChannelDirective)
          .map((a) => ({ id: a.id, name: a.name, contextFile: a.contextFile }));
        const picked = await selectAdapters(installable);
        if (picked === null) {
          console.log('');
          console.log('  可安装的 IDE 适配器：');
          console.log('');
          installable.forEach((adapter, i) => {
            console.log(`  ${i + 1}. ${adapter.id} — ${adapter.name} (写入 ${adapter.contextFile})`);
          });
          console.log('');
          console.log('  当前为非交互环境。使用 --adapters <ids> 指定要安装的适配器（逗号分隔），或 --all 安装全部。');
          console.log('  示例: sovei adapters install --adapters trae,codebuddy');
          console.log('');
          return;
        }
        if (picked.length === 0) {
          console.log('\n  未选择任何适配器，已取消。\n');
          return;
        }
        selectedIds = picked;
      }

      const result = await installAdapters(selectedIds, storage);

      console.log('');
      for (const r of result.results) {
        if (r.installed) {
          console.log(`  ✓ ${r.adapterName} (${r.adapterId}) — 已安装`);
          for (const f of r.files) {
            console.log(`    · ${f}`);
          }
        } else {
          console.log(`  → ${r.adapterName} (${r.adapterId}) — ${r.skipped}`);
        }
      }
      console.log('');
      console.log(`  总计：${result.totalInstalled} 已安装，${result.totalSkipped} 跳过`);
      console.log('');
    });
}
