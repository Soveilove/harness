/**
 * Adapter Installer — 为选中的 IDE 适配器生成快速通道指令文件
 *
 * 每个 IDE 的指令机制不同：
 * - Claude Code: .claude/commands/*.md slash command + CLAUDE.md 追加指令
 * - CodeBuddy: .codebuddy/commands/*.md + AGENTS.md 追加指令
 * - Trae: .cursorrules 追加指令
 * - Codex: AGENTS.md 追加指令
 *
 * 安装幂等：通过标记段检查是否已安装，避免重复追加。
 */

import type { IDEAdapter } from './registry.js';
import { adapterRegistry } from './registry.js';
import type { StorageBackend } from '../storage/types.js';

/** 安装标记——用于检测是否已安装 */
const INSTALL_MARKER = '<!-- sovei-adapter-installed -->';

/** 单个适配器的安装结果 */
export interface AdapterInstallResult {
  adapterId: string;
  adapterName: string;
  installed: boolean;
  /** 生成的文件路径列表 */
  files: string[];
  /** 跳过原因（如已安装或 directive 为空） */
  skipped?: string;
}

/** 整体安装结果 */
export interface InstallResult {
  results: AdapterInstallResult[];
  totalInstalled: number;
  totalSkipped: number;
}

/**
 * 检查指定适配器是否已安装指令文件。
 * 通过检查 contextFile 中是否包含安装标记来判断。
 */
export async function checkAdapterInstalled(
  adapter: IDEAdapter,
  storage: StorageBackend,
): Promise<boolean> {
  if (!adapter.quickChannelDirective) return true; // 无指令视为已安装
  const content = await storage.read(adapter.contextFile);
  return content?.includes(INSTALL_MARKER) ?? false;
}

/**
 * 为选中的适配器安装快速通道指令文件。
 *
 * @param adapterIds 要安装的适配器 ID 列表
 * @param storage 存储后端
 * @returns 安装结果
 */
export async function installAdapters(
  adapterIds: string[],
  storage: StorageBackend,
): Promise<InstallResult> {
  const results: AdapterInstallResult[] = [];
  let totalInstalled = 0;
  let totalSkipped = 0;

  for (const id of adapterIds) {
    const adapter = adapterRegistry.get(id);
    const result = await installSingleAdapter(adapter, storage);
    results.push(result);
    if (result.installed) {
      totalInstalled++;
    } else {
      totalSkipped++;
    }
  }

  return { results, totalInstalled, totalSkipped };
}

/**
 * 安装单个适配器的指令文件。
 */
async function installSingleAdapter(
  adapter: IDEAdapter,
  storage: StorageBackend,
): Promise<AdapterInstallResult> {
  const files: string[] = [];

  // 未定义快速通道指令的适配器跳过（当前所有已注册适配器都有指令）
  if (!adapter.quickChannelDirective) {
    return {
      adapterId: adapter.id,
      adapterName: adapter.name,
      installed: false,
      files: [],
      skipped: '无快速通道指令定义',
    };
  }

  // 检查是否已安装（幂等）
  const alreadyInstalled = await checkAdapterInstalled(adapter, storage);
  if (alreadyInstalled) {
    return {
      adapterId: adapter.id,
      adapterName: adapter.name,
      installed: false,
      files: [],
      skipped: '已安装，跳过',
    };
  }

  // 1. 追加 quickChannelDirective 到 contextFile
  const existingContent = (await storage.read(adapter.contextFile)) ?? '';
  const directiveWithMarker = `${INSTALL_MARKER}\n${adapter.quickChannelDirective}`;
  const newContent = existingContent
    ? `${existingContent}\n${directiveWithMarker}`
    : directiveWithMarker;
  await storage.write(adapter.contextFile, newContent);
  files.push(adapter.contextFile);

  // 2. 若有 slashCommand 文件，创建它（向后兼容单个文件）
  if (adapter.slashCommand) {
    const slashPath = `${adapter.slashCommand.dir}/${adapter.slashCommand.filename}`;
    await storage.write(slashPath, adapter.slashCommand.content);
    files.push(slashPath);
  }

  // 2b. 若有 slashCommands 列表（P0-B: 12 阶段 slash command），创建它们
  if (adapter.slashCommands) {
    for (const sc of adapter.slashCommands) {
      const slashPath = `${sc.dir}/${sc.filename}`;
      await storage.write(slashPath, sc.content);
      files.push(slashPath);
    }
  }

  // 3. 若有 skillPackage（如 Codex），生成技能文件
  if (adapter.skillPackage) {
    for (const skill of adapter.skillPackage.skills) {
      const skillPath = `${adapter.skillPackage.dir}/${skill.filename}`;
      await storage.write(skillPath, skill.content);
      files.push(skillPath);
    }
  }

  return {
    adapterId: adapter.id,
    adapterName: adapter.name,
    installed: true,
    files,
  };
}
