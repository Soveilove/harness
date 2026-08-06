/**
 * Skills Commands
 *
 * Bridge the SkillManager into the CLI so a project can *connect* external
 * skills at init time, from both a local (project harness/skills) and a global
 * (user ~/.sovei/skills) source.
 *
 *   sovei skills init          - create the project skills skeleton (idempotent)
 *   sovei skills status        - show map/lock state + global pool availability
 *   sovei skills bind          - bind a skill to a stage in the local skill-map
 *   sovei skills use           - register a global skill into the local lock
 *   sovei skills sync          - render connected skills into agent context files
 *   sovei skills clean         - remove the sovei skills section from agent files
 *   sovei skills global list   - list skills in the global pool
 */

import type { Command } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import { adapterRegistry } from '../../adapters/registry.js';
import { SkillManager } from '../../skills/manager.js';
import { SkillAgentSync } from '../../skills/sync.js';

function getStorage(): StorageBackend {
  return container.inject<StorageBackend>(TOKENS.Storage);
}

export function registerSkillsCommands(program: Command): void {
  const skills = program.command('skills').description('外部 Skills 接入与管理');

  // ── init ──
  skills
    .command('init')
    .description('创建项目级 skills 目录骨架（skill-map.yaml + skill-lock.yaml，幂等）')
    .action(async () => {
      const manager = new SkillManager(getStorage());
      const result = await manager.ensureSkeleton();
      console.log(result.created
        ? '\n  ✓ 已初始化项目 skills 骨架：\n'
        : '\n  · skills 骨架已存在，未重复创建：\n');
      console.log('    ' + result.mapPath);
      console.log('    ' + result.lockPath);
      console.log('\n  当前仅声明 Sovei native 绑定，第三方 Skills 通过以下命令接入：');
      console.log('    sovei skills use --global <dir>   # 从全局池接入 skill 到本地 lock');
      console.log('    sovei skills bind --stage grill --skill <id>  # 绑定 skill 到阶段');
      console.log('');
    });

  // ── status ──
  skills
    .command('status')
    .description('显示当前项目 skills 接入状态（局部 map/lock + 全局池）')
    .action(async () => {
      const manager = new SkillManager(getStorage());
      const status = await manager.status();

      console.log('\n  Sovei Skills 接入状态');
      console.log('  ──────────────────────');
      console.log('  局部目录（' + SKILLS_LABEL + '）：' + (status.localDirExists ? '存在' : '不存在'));
      console.log('  全局池（' + GLOBAL_LABEL + '）：  ' + (status.globalDirExists ? '存在' : '不存在（可先 sovei skills global add）'));
      console.log('  skill-map.yaml：      ' + (status.mapExists ? '存在' : '缺失'));
      console.log('  skill-lock.yaml：     ' + (status.lockExists ? '存在' : '缺失'));
      console.log('  配置有效性：          ' + (status.valid ? '有效' : '无效'));
      if (status.errors.length) {
        for (const err of status.errors) console.log('    · ' + err);
      }

      console.log('\n  阶段绑定：');
      if (status.bindings.length === 0) {
        console.log('    （无绑定，请运行 sovei skills init 或 sovei skills bind）');
      } else {
        for (const b of status.bindings) {
          const flag = b.skillId.startsWith('sovei/native/') ? 'native' : 'external';
          console.log('    · ' + b.stage.padEnd(10) + ' → ' + b.skillId + '  [' + b.status + ' / ' + flag + ']');
        }
      }

      console.log('\n  已注册 Agent 适配器：');
      const adapters = adapterRegistry.list();
      for (const a of adapters) {
        console.log('    · ' + a.id.padEnd(10) + ' → ' + a.contextFile + '   (' + a.name + ')');
      }

      console.log('\n  已锁定第三方 Skills：');
      console.log(status.lockedSkills.length ? '    ' + status.lockedSkills.join(', ') : '    （无，third-party: none）');
      console.log('');
    });

  // ── bind ──
  skills
    .command('bind')
    .description('将 skill 绑定到某个阶段（写入局部 skill-map.yaml）')
    .requiredOption('--stage <stage>', '目标阶段（grill/spec/plan/...）')
    .requiredOption('--skill <id>', 'skill id（如 sovei/native/grill 或外部 skill id）')
    .option('--enable', '将绑定置为 enabled（默认 candidate）')
    .action(async (opts: { stage: string; skill: string; enable?: boolean }) => {
      const manager = new SkillManager(getStorage());
      const result = await manager.bind(opts.stage, opts.skill, { enable: opts.enable });
      console.log(result.replaced
        ? '\n  · 已替换 ' + opts.stage + ' 阶段的绑定 → ' + opts.skill + '（' + result.binding.status + '）\n'
        : '\n  · 已新增 ' + opts.stage + ' 阶段的绑定 → ' + opts.skill + '（' + result.binding.status + '）\n');
      if (result.binding.status === 'candidate' && !result.binding.skillId.startsWith('sovei/native/')) {
        console.log('  该绑定为 candidate，不改变运行时行为。');
        console.log('  若要启用，请：1) sovei skills use 将其加入 lock；2) sovei skills bind --enable；3) 注册对应 Adapter。');
      }
      console.log('');
    });

  // ── use (global access) ──
  skills
    .command('use')
    .description('从全局池接入 skill 到本地 lock（path source）')
    .requiredOption('--global <dir>', '全局 skill 目录（含 skill.json manifest）')
    .option('--id <id>', 'skill id（默认取 manifest.id）')
    .option('--enable', '置为 enabled（默认 candidate）')
    .action(async (opts: { global: string; id?: string; enable?: boolean }) => {
      const manager = new SkillManager(getStorage());
      const skillId = opts.id || opts.global.split(/[\\/]/).pop() || 'skill';
      await manager.registerGlobalSkill(skillId, opts.global, { status: opts.enable ? 'enabled' : 'candidate' });
      console.log('\n  · 已从全局目录接入 skill：' + skillId);
      console.log('    来源：' + opts.global);
      console.log('    状态：' + (opts.enable ? 'enabled' : 'candidate'));
      console.log('\n  接下来：sovei skills bind --stage <stage> --skill ' + skillId + ' --enable');
      console.log('');
    });

  // ── global list ──
  const global = skills.command('global').description('全局 skills 池管理');
  global
    .command('list')
    .description('列出全局池中的可用 skills')
    .action(async () => {
      const manager = new SkillManager(getStorage());
      const entries = await manager.listGlobalSkills();
      console.log('\n  全局 skills 池：');
      if (entries.length === 0) {
        console.log('    （空。将 skill 目录放到 ~/.sovei/skills/<id>/，或运行 sovei skills use --global <dir> 接入）');
      } else {
        for (const e of entries) {
          console.log('    · ' + e.id);
          console.log('      ' + e.path + (e.manifestPath ? '' : '  （缺 skill.json）'));
        }
      }
      console.log('');
    });

  // ── sync (render skills into agent context files) ──
  skills
    .command('sync')
    .description('将已接入 skills 渲染进各开发 Agent 上下文文件（AGENTS.md / CLAUDE.md / .cursorrules）')
    .option('--adapter <ids>', '仅同步指定 IDE 适配器（逗号分隔：codex/claude/codebuddy/trae）')
    .option('--dry-run', '只预览将写入的内容，不落盘')
    .action(async (opts: { adapter?: string; dryRun?: boolean }) => {
      const adapterIds = opts.adapter?.split(',').map((id) => id.trim()).filter(Boolean);
      const sync = new SkillAgentSync(getStorage());
      const result = await sync.sync(adapterIds);

      if (opts.dryRun) {
        console.log('\n  [dry-run] 将同步以下 Agent 上下文文件：');
        for (const f of result.files) console.log('    · ' + f);
        console.log('\n  当前阶段绑定：');
        for (const b of result.bindings) {
          console.log('    · ' + b.stage + ' → ' + b.skillId + '  [' + b.status + ']');
        }
        console.log('\n  未写入任何文件。\n');
        return;
      }

      console.log('\n  ✓ 已将 skills 渲染进 ' + result.files.length + ' 个 Agent 上下文文件：');
      for (const f of result.files) console.log('    · ' + f);
      console.log('\n  当前阶段绑定：');
      for (const b of result.bindings) {
        console.log('    · ' + b.stage + ' → ' + b.skillId + '  [' + b.status + ']');
      }
      console.log('\n  提示：运行 sovei skills clean 可移除这些文件中的 sovei skills 段落。\n');
    });

  // ── clean (remove skill section from agent files) ──
  skills
    .command('clean')
    .description('从 Agent 上下文文件中移除 sovei skills 段落')
    .option('--adapter <ids>', '仅清理指定 IDE 适配器（逗号分隔）')
    .action(async (opts: { adapter?: string }) => {
      const adapterIds = opts.adapter?.split(',').map((id) => id.trim()).filter(Boolean);
      const sync = new SkillAgentSync(getStorage());
      const files = await sync.clean(adapterIds);
      console.log(files.length
        ? '\n  · 已从 ' + files.length + ' 个文件移除 sovei skills 段落：\n    ' + files.join('\n    ') + '\n'
        : '\n  · 未发现含 sovei skills 段落的 Agent 上下文文件。\n');
    });
}

const SKILLS_LABEL = 'harness/skills';
const GLOBAL_LABEL = '~/.sovei/skills';
