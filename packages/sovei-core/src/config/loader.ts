/**
 * Config Loader
 * Loads and validates Sovei configuration from the workspace.
 */

import type { SoveiConfig } from './types.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseProjectJson } from './json.js';

const DEFAULT_STAGE_ORDER = [
  'explore', 'grill', 'wayfind', 'spec', 'scope', 'plan',
  'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
];

const DEFAULT_CONFIG: Omit<SoveiConfig, 'rootPath'> = {
  specsDir: 'specs',
  knowledgeDir: 'sovei-flow/project/knowledge',
  rulesDir: 'sovei-flow/project/rules',
  harnessDir: 'sovei-flow',
  project: {
    name: 'untitled',
    description: 'New project - configure me',
    techStack: {},
    started: new Date().toISOString().split('T')[0],
  },
  workflow: {
    version: '4.0.0',
    stageOrder: DEFAULT_STAGE_ORDER,
  },
};

export function loadConfig(rootPath: string): SoveiConfig {
  const configPath = join(rootPath, 'sovei-flow', 'project', 'project.config.json');
  let configured: Partial<SoveiConfig> = {};
  try {
    configured = parseProjectJson<Partial<SoveiConfig>>(readFileSync(configPath, 'utf8'), configPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error(`Invalid project configuration at ${configPath}: ${(error as Error).message}`);
    }
  }
  const configuredOrder = configured.workflow?.stageOrder;
  if (configuredOrder) {
    // Relaxed validation: allow configs that predate 'explore' (12-stage) for
    // backward compat. Only reject unknown stages and duplicates.
    const unknown = configuredOrder.filter((stage) => !DEFAULT_STAGE_ORDER.includes(stage));
    if (unknown.length || new Set(configuredOrder).size !== configuredOrder.length) {
      throw new Error(
        `Invalid workflow.stageOrder in ${configPath}: unknown stages [${unknown.join(', ')}] or duplicates. ` +
        `Expected a subset of: ${DEFAULT_STAGE_ORDER.join(', ')}`,
      );
    }
  }
  const configuredVersion = configured.workflow?.version;
  if (configuredVersion && configuredVersion !== DEFAULT_CONFIG.workflow.version) {
    process.stderr.write(
      `\n  \u26A0\uFE0F  workflow.version mismatch: project declares "${configuredVersion}", ` +
      `engine expects "${DEFAULT_CONFIG.workflow.version}"\n` +
      `     If this is intentional, update sovei-flow/project/project.config.json to match.\n` +
      `     If unsure, run: sovei project init --force\n\n`,
    );
  }

  return {
    ...DEFAULT_CONFIG,
    ...configured,
    rootPath,
    project: { ...DEFAULT_CONFIG.project, ...configured.project },
    workflow: {
      ...DEFAULT_CONFIG.workflow,
      ...configured.workflow,
      stageOrder: configuredOrder ?? DEFAULT_STAGE_ORDER,
    },
  };
}

export function getFeaturePath(config: SoveiConfig, featureId: string): string {
  return join(config.specsDir, featureId);
}

export function getFeatureFullPath(config: SoveiConfig, featureId: string): string {
  return join(config.rootPath, config.specsDir, featureId);
}

/**
 * Feature ID 命名规范：`NNN-<slug>`
 * - NNN：三位数字序号（由 CLI 扫描 specs/ 分配）
 * - slug：2-4 个词的 kebab-case（小写字母/数字/连字符）
 * 拒绝空格、中文、大写、下划线，从入口根除历史上出现过的畸形目录名。
 */
export const FEATURE_ID_PATTERN = /^[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** slug（去掉 NNN- 前缀后的部分）应为 2-4 个 kebab 词。 */
const SLUG_WORD_RANGE = { min: 1, max: 4 };

/**
 * 校验 Feature ID 是否符合 `NNN-<slug>` 规范。返回 null 表示合法，否则返回错误原因。
 * 单独抽出便于 CLI 与 engine 共用同一份规则。
 */
export function validateFeatureId(featureId: string): string | null {
  if (!FEATURE_ID_PATTERN.test(featureId)) {
    return `Feature ID '${featureId}' 不符合规范 NNN-<slug>（三位序号 + kebab-case slug，禁止空格/中文/大写/下划线）`;
  }
  const slug = featureId.slice(4); // 去掉 "NNN-"
  const words = slug.split('-').filter(Boolean);
  if (words.length < SLUG_WORD_RANGE.min || words.length > SLUG_WORD_RANGE.max) {
    return `slug '${slug}' 应为 ${SLUG_WORD_RANGE.min}-${SLUG_WORD_RANGE.max} 个词，当前为 ${words.length} 个`;
  }
  return null;
}

/**
 * 校验并规范化一个 slug（不含 NNN 前缀），返回小写 kebab slug 或抛错。
 * 供 CLI 在拿到 AI 给出的 slug 后与扫描到的下一个序号拼接。
 */
export function normalizeSlug(slug: string): string {
  const cleaned = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleaned)) {
    throw new Error(
      `slug '${slug}' 非法：只允许小写字母、数字、连字符（kebab-case），禁止空格/中文/大写/下划线`,
    );
  }
  const words = cleaned.split('-').filter(Boolean);
  if (words.length < SLUG_WORD_RANGE.min || words.length > SLUG_WORD_RANGE.max) {
    throw new Error(`slug '${slug}' 应为 ${SLUG_WORD_RANGE.min}-${SLUG_WORD_RANGE.max} 个词，当前为 ${words.length} 个`);
  }
  return cleaned;
}

/**
 * 从已有的 Feature 目录名列表中推导下一个三位序号（形如 '032'）。
 * 借鉴 spec-kit 的 create-new-feature.sh：取现存最大 NNN + 1。
 */
export function nextFeatureSequence(existingIds: string[]): string {
  let max = 0;
  for (const id of existingIds) {
    const m = /^([0-9]{3})-/.exec(id);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return String(max + 1).padStart(3, '0');
}
