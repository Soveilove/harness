/**
 * Version Check — 启动时检测 npm 最新版本，输出更新提示。
 *
 * 两类提示（N6）：
 * 1. 提示更新：有新版本可用（简单通知）
 * 2. 建议更新有新能力支持：新版本引入了当前版本没有的能力（更有说服力）
 *
 * 设计约束：
 * - 零运行时依赖：使用 Node 内置 https 模块
 * - 不阻塞命令执行：网络检查有超时，失败静默跳过
 * - 缓存：24h TTL，避免每次命令都请求 npm
 * - 输出到 stderr：不污染 --json 等 stdout 消费
 */

import https from 'node:https';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org/@soveilove/sovei/latest';
const CACHE_DIR = join(homedir(), '.sovei-cache');
const CACHE_FILE = join(CACHE_DIR, 'version-check.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const NETWORK_TIMEOUT_MS = 3000;

interface VersionCache {
  lastCheck: number;
  latestVersion: string;
}

/**
 * 能力注册表——每个版本引入的新能力。
 * 发布新版本时在此追加，version-check 据此判断是否显示"新能力建议"提示。
 */
const CAPABILITY_REGISTRY: Array<{ version: string; capabilities: string[] }> = [
  {
    version: '2.6.0',
    capabilities: [
      'Feature 拆分为子变更并行开发 (feature split / sub-change)',
      'init 产物改名 sovei-flow + 一键迁移脚本 (project migrate)',
      'skills 基座：预置 vue2/vue3/react/cli/python/quant 技能模板',
      'Codex 桌面版技能包适配 (sovei-workflow skill)',
      'agents 与 skills 分开存放',
      '版本更新提示机制',
    ],
  },
  {
    version: '2.5.10',
    capabilities: [
      'feature archive / feature summary 聚合命令',
      '上下文包膨胀治理 + 子 Agent 契约',
    ],
  },
];

/**
 * 简单 semver 比较：a > b 返回 1，a < b 返回 -1，相等返回 0。
 * 支持 prerelease 标签（prerelease 视为低于 release）。
 */
function compareVersions(a: string, b: string): number {
  const parseVer = (v: string): { parts: number[]; pre: string } => {
    const [main, pre] = v.split('-');
    const parts = main.split('.').map((n) => parseInt(n, 10) || 0);
    return { parts, pre: pre || '' };
  };
  const va = parseVer(a);
  const vb = parseVer(b);
  for (let i = 0; i < 3; i++) {
    const diff = (va.parts[i] || 0) - (vb.parts[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  // Same main version: release > prerelease
  if (va.pre && !vb.pre) return -1;
  if (!va.pre && vb.pre) return 1;
  if (va.pre && vb.pre) return va.pre < vb.pre ? -1 : va.pre > vb.pre ? 1 : 0;
  return 0;
}

/** 从 npm registry 获取最新版本 */
function fetchLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      NPM_REGISTRY_URL,
      { timeout: NETWORK_TIMEOUT_MS },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data) as { version?: string };
            if (json.version) {
              resolve(json.version);
            } else {
              reject(new Error('No version field in npm response'));
            }
          } catch {
            reject(new Error('Failed to parse npm response'));
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Network timeout'));
    });
  });
}

/** 读取缓存 */
function readCache(): VersionCache | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const content = readFileSync(CACHE_FILE, 'utf8');
    return JSON.parse(content) as VersionCache;
  } catch {
    return null;
  }
}

/** 写入缓存 */
function writeCache(version: string): void {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(
      CACHE_FILE,
      JSON.stringify({ lastCheck: Date.now(), latestVersion: version } satisfies VersionCache),
    );
  } catch {
    // Cache write failure is non-fatal
  }
}

/** 收集 (current, latest] 范围内的新能力 */
function collectNewCapabilities(current: string, latest: string): string[] {
  const caps: string[] = [];
  for (const entry of CAPABILITY_REGISTRY) {
    if (
      compareVersions(entry.version, current) > 0 &&
      compareVersions(entry.version, latest) <= 0
    ) {
      caps.push(...entry.capabilities);
    }
  }
  return caps;
}

export interface VersionNotification {
  type: 'update' | 'capability';
  currentVersion: string;
  latestVersion: string;
  capabilities?: string[];
  message: string;
}

/** 格式化"提示更新"消息 */
function formatUpdateMessage(current: string, latest: string): string {
  return [
    '',
    '[Sovei] 更新可用',
    `  当前版本: ${current}`,
    `  最新版本: ${latest}`,
    '  更新命令: npm install -g @soveilove/sovei',
    '',
  ].join('\n');
}

/** 格式化"建议更新有新能力支持"消息 */
function formatCapabilityMessage(current: string, latest: string, caps: string[]): string {
  const capList = caps.map((c, i) => `  ${i + 1}. ${c}`).join('\n');
  return [
    '',
    '[Sovei] 新版本可用，建议更新以获取新能力',
    `  当前版本: ${current}  →  最新版本: ${latest}`,
    '  新能力:',
    capList,
    '  更新命令: npm install -g @soveilove/sovei',
    '',
  ].join('\n');
}

/**
 * 检查版本更新，返回提示信息（若无需更新返回 null）。
 * 带缓存：24h 内不重复请求 npm。
 */
export async function checkVersionUpdate(
  currentVersion: string,
): Promise<VersionNotification | null> {
  const cache = readCache();
  let latestVersion: string;

  if (cache && Date.now() - cache.lastCheck < CACHE_TTL_MS) {
    latestVersion = cache.latestVersion;
  } else {
    try {
      latestVersion = await fetchLatestVersion();
      writeCache(latestVersion);
    } catch {
      // Network failed; use cache if available, else skip silently
      if (cache) {
        latestVersion = cache.latestVersion;
      } else {
        return null;
      }
    }
  }

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return null; // Already up to date
  }

  const newCaps = collectNewCapabilities(currentVersion, latestVersion);
  if (newCaps.length > 0) {
    return {
      type: 'capability',
      currentVersion,
      latestVersion,
      capabilities: newCaps,
      message: formatCapabilityMessage(currentVersion, latestVersion, newCaps),
    };
  }

  return {
    type: 'update',
    currentVersion,
    latestVersion,
    message: formatUpdateMessage(currentVersion, latestVersion),
  };
}

/** 用于测试：清除缓存文件 */
export function clearVersionCache(): void {
  try {
    if (existsSync(CACHE_FILE)) {
      writeFileSync(CACHE_FILE, '');
    }
  } catch {
    // non-fatal
  }
}

/** 用于测试：直接写入缓存 */
export function setVersionCache(latestVersion: string): void {
  writeCache(latestVersion);
}
