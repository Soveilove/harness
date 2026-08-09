/**
 * Cross-Feature 相关性评分与过滤模块
 *
 * 提供基于 path/tag/domain 重叠度的粗粒度相关性评分，
 * 用于从大量 Feature 的 decision-log 中筛选 Top-N 最相关项。
 *
 * 评分算法：path 重叠 ×3 + tag 重叠 ×2 + domain 重叠 ×1
 */

/** Feature 元数据——从 decision-log 提取的结构化信息 */
export interface FeatureMeta {
  featureId: string;
  decisionLogPath: string;
  /** decision-log 首行标题 */
  title: string;
  /** 从 decision-log 提取的标签（通常是 ## 级别的小节标题关键词） */
  tags: string[];
  /** 从 decision-log 提取的领域关键词 */
  domains: string[];
  /** decision-log 中提到的文件路径 */
  paths: string[];
}

/** 评分后的 Feature——供宿主 AI 分派子 Agent 使用 */
export interface ScoredFeature {
  featureId: string;
  decisionLogPath: string;
  title: string;
  /** 相关性评分（越高越相关） */
  relevanceScore: number;
  tags: string[];
}

/** 领域关键词词典——用于从文本中识别领域 */
const DOMAIN_KEYWORDS = [
  'context', 'knowledge', 'cli', 'config', 'engine', 'workflow',
  'redline', 'governance', 'skill', 'artifact', 'spec', 'scope',
  'plan', 'task', 'implement', 'converge', 'verify', 'learn', 'sync',
  'quick', 'preflight', 'merge', 'workspace', 'adapter', 'storage',
  'rule', 'budget', 'subagent', 'drift', 'graph',
];

/**
 * 从 decision-log 内容提取 Feature 元数据。
 *
 * @param featureId Feature ID
 * @param decisionLogContent decision-log.md 的完整内容
 * @param currentPaths 当前 Feature 的路径列表（用于计算路径重叠）
 */
export function extractFeatureMeta(
  featureId: string,
  decisionLogContent: string,
  currentPaths?: string[],
): FeatureMeta {
  const lines = decisionLogContent.split('\n');

  // 提取标题：第一个 `# ` 开头的行
  const titleLine = lines.find((line) => line.startsWith('# '));
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : featureId;

  // 提取标签：`## ` 开头的小节标题关键词
  const tags: string[] = [];
  for (const line of lines) {
    if (line.startsWith('## ')) {
      const tag = line.replace(/^##\s+/, '').trim().toLowerCase();
      if (tag && tag.length > 2 && tag.length < 50) {
        tags.push(tag);
      }
    }
  }

  // 提取文件路径：匹配 src/xxx 或 packages/xxx 模式（含文件扩展名）
  const pathPattern = /(?:src\/|packages\/)[a-zA-Z0-9_\-\/.]+/g;
  const pathMatches = decisionLogContent.match(pathPattern) ?? [];
  const paths = [...new Set(pathMatches)].slice(0, 20);

  // 提取领域关键词
  const lowerContent = decisionLogContent.toLowerCase();
  const domains = DOMAIN_KEYWORDS.filter((keyword) =>
    lowerContent.includes(keyword),
  );

  // 如果有当前路径，也加入 paths 供匹配
  if (currentPaths) {
    for (const p of currentPaths) {
      const normalized = p.replace(/\\/g, '/').replace(/^\.\//, '');
      if (normalized && !paths.includes(normalized)) {
        paths.push(normalized);
      }
    }
  }

  return {
    featureId,
    decisionLogPath: `specs/${featureId}/decision-log.md`,
    title,
    tags: [...new Set(tags)].slice(0, 15),
    domains,
    paths,
  };
}

/**
 * 计算两个 FeatureMeta 之间的相关性评分。
 *
 * 评分规则：
 * - path 重叠：每个重叠 path × 3
 * - tag 重叠：每个重叠 tag × 2
 * - domain 重叠：每个重叠 domain × 1
 */
function scorePair(current: FeatureMeta, other: FeatureMeta): number {
  const currentPaths = new Set(current.paths.map(normalize));
  const otherPaths = new Set(other.paths.map(normalize));
  const pathOverlap = [...currentPaths].filter((p) => otherPaths.has(p)).length;

  const currentTags = new Set(current.tags);
  const otherTags = new Set(other.tags);
  const tagOverlap = [...currentTags].filter((t) => otherTags.has(t)).length;

  const currentDomains = new Set(current.domains);
  const otherDomains = new Set(other.domains);
  const domainOverlap = [...currentDomains].filter((d) => otherDomains.has(d)).length;

  return pathOverlap * 3 + tagOverlap * 2 + domainOverlap * 1;
}

function normalize(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
}

/**
 * 对其他 Feature 按与当前 Feature 的相关性评分排序，取 Top-N。
 *
 * @param current 当前 Feature 的元数据
 * @param others 其他所有 Feature 的元数据列表
 * @param limit 返回的最大数量（默认 5）
 * @returns 按相关性降序排列的 ScoredFeature 列表
 */
export function scoreCrossFeature(
  current: FeatureMeta,
  others: FeatureMeta[],
  limit: number = 5,
): ScoredFeature[] {
  const scored = others.map((other) => ({
    featureId: other.featureId,
    decisionLogPath: other.decisionLogPath,
    title: other.title,
    relevanceScore: scorePair(current, other),
    tags: other.tags,
  }));

  // 按评分降序排列，同分按 featureId 升序
  scored.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return a.featureId.localeCompare(b.featureId);
  });

  return scored.slice(0, limit);
}
