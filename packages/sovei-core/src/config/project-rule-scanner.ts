import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { StorageBackend } from '../storage/types.js';
import type { ProjectRule, RuleConfidence } from '../rules/schemas.js';

const NORMATIVE_TEXT = /(?:必须|不得|禁止|不要|应当|应该|优先|使用|保持|须|勿|must|must not|do not|never|always|required|prefer|use|preserve|enforce|禁止|不允许)/i;
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.nuxt', '.output', 'specs', 'sovei-flow']);
const RULES_DIRECTORY_EXTENSIONS = new Set(['.md', '.mdc', '.txt']);
const RULES_DOCUMENT_EXTENSIONS = new Set(['.md', '.mdc', '.txt']);

// 按章节切片时，一个章节最多保留的规范语句数（防止章节内堆满命令示例/目录项）
const MAX_STATEMENTS_PER_SECTION = 8;
// 全文扫描时最多保留的规范语句数
const MAX_TOTAL_STATEMENTS = 120;
// 单条规范语句最大长度
const MAX_STATEMENT_LENGTH = 200;

type RuleSourceKind = 'codex' | 'cursor' | 'claude-code' | 'doc';

interface RuleSource {
  path: string;
  kind: RuleSourceKind;
}

// Sovei 自生成文档的标志段落标题（无论文件位置，命中即跳过整个章节，避免自我指涉噪声）。
// 适用于 AGENTS.md 中的 Sovei Workflow 声明，也适用于任何被注入的工作流说明。
const SOVEI_SELF_SECTIONS: RegExp[] = [
  /sovei\s+workflow/i,
  /sovei\s+workflow\s+stages/i,
  /key\s+commands/i,
  /confirmation\s+gates/i,
  /reconciliation/i,
  /sovei\s+context\s+build/i,
];

// 章节标题命中即视为"说明性/非规范"章节，不提取（避免把命令示例、目录项当规范）。
const NON_NORMATIVE_SECTION_RE = /(?:getting\s+started|introduction|overview|安装|简介|概览|快速开始|getting\s+started|目录|table\s+of\s+contents|toc|用法|usage|cli|命令|参考|reference|changelog|更新日志|contributing\s+guide\s+overview)/i;

/**
 * 判断是否为团队规范文档（区别于 agent 规则文件和 Sovei 自身声明）。
 * 命中 doc/、docs/、CONTRIBUTING.md、STYLEGUIDE.md 等路径。
 */
function isTeamRuleDoc(path: string): boolean {
  const lower = path.replace(/\\/g, '/').toLowerCase();
  const name = posix.basename(lower);
  if (name === 'contributing.md' || name === 'styleguide.md' || name === 'style-guide.md' || name === 'convention.md') return true;
  return /(^|\/)(?:doc|docs|documentation|guideline|guide|conventions)\//.test(lower) && RULES_DOCUMENT_EXTENSIONS.has(posix.extname(name));
}

function classifyRuleSource(path: string): RuleSourceKind | null {
  const normalized = path.replace(/\\/g, '/');
  const lower = normalized.toLowerCase();
  const name = posix.basename(lower);
  const extension = posix.extname(lower);

  if (name === 'agents.md') return 'codex';
  if (name === 'claude.md' || lower.includes('/.claude/rules/') || lower.startsWith('.claude/rules/')) {
    return name === 'claude.md' || RULES_DIRECTORY_EXTENSIONS.has(extension) ? 'claude-code' : null;
  }
  if (name === '.cursorrules' || lower.includes('/.cursor/rules/') || lower.startsWith('.cursor/rules/')) {
    return name === '.cursorrules' || RULES_DIRECTORY_EXTENSIONS.has(extension) ? 'cursor' : null;
  }
  if (isTeamRuleDoc(path)) return 'doc';
  return null;
}

async function findInstructionFiles(storage: StorageBackend, directory = '', depth = 0, results: RuleSource[] = []): Promise<RuleSource[]> {
  if (depth > 8 || results.length >= 100) return results;
  for (const entry of await storage.listEntries(directory)) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) await findInstructionFiles(storage, path, depth + 1, results);
    } else {
      const kind = classifyRuleSource(path);
      if (kind) results.push({ path, kind });
      if (results.length >= 100) break;
    }
  }
  return results;
}

function idFor(kind: string, source: string, text: string): string {
  const hash = createHash('sha1').update(`${kind}\0${source}\0${text}`).digest('hex').slice(0, 10).toUpperCase();
  return `ADAPTED_${kind}_${hash}`;
}

function inheritedScopeFor(source: string): string[] {
  const directory = posix.dirname(source.replace(/\\/g, '/'));
  if (/(^|\/)doc(?:s)?($|\/)/i.test(directory)) return ['**/*'];
  return directory === '.' ? ['**/*'] : [`${directory}/**/*`];
}

function splitFrontmatter(content: string): { body: string; metadata: Record<string, unknown> } {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { body: content, metadata: {} };
  try {
    const parsed = parseYaml(match[1]);
    return {
      body: content.slice(match[0].length),
      metadata: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {},
    };
  } catch {
    return { body: content.slice(match[0].length), metadata: {} };
  }
}

function metadataPatterns(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return values.map((item) => String(item).trim()).filter(Boolean);
}

function scopeFor(source: RuleSource, metadata: Record<string, unknown>): { paths: string[]; excludePaths: string[] } {
  const configured = metadataPatterns(source.kind === 'cursor' ? metadata.globs : metadata.paths);
  if (!configured.length) {
    const isRulesDirectory = /(^|\/)\.(?:cursor|claude)\/rules\//i.test(source.path);
    return { paths: isRulesDirectory ? ['**/*'] : inheritedScopeFor(source.path), excludePaths: [] };
  }
  const paths = configured.filter((pattern) => !pattern.startsWith('!'));
  const excludePaths = configured.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1));
  return { paths: paths.length ? paths : ['**/*'], excludePaths };
}

/**
 * 按章节切片：以 markdown 标题（#/##/###）为粒度切分。
 * - 命中 Sovei 自身段落标题 → 整章跳过（排除自我指涉噪声）。
 * - 命中非规范章节标题 → 整章跳过（排除目录项/命令示例/引言）。
 * 返回每个章节的规范语句候选（章节级语义提取，而非逐行硬切）。
 */
function extractStatementsBySection(content: string): Array<{ section: string; statements: string[] }> {
  const { body } = splitFrontmatter(content);
  const lines = body.split(/\r?\n/);
  const sections: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } = { title: '(preamble)', lines: [] };

  for (const rawLine of lines) {
    const heading = rawLine.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      sections.push(current);
      current = { title: heading[2].trim(), lines: [] };
    } else {
      current.lines.push(rawLine);
    }
  }
  sections.push(current);

  const result: Array<{ section: string; statements: string[] }> = [];
  for (const section of sections) {
    if (SOVEI_SELF_SECTIONS.some((re) => re.test(section.title))) continue;
    if (NON_NORMATIVE_SECTION_RE.test(section.title)) continue;
    const statements = extractStatements(section.lines);
    if (statements.length) result.push({ section: section.title, statements });
  }
  return result;
}

function extractStatements(lines: string[]): string[] {
  const statements: string[] = [];
  let total = 0;
  for (const line of lines) {
    if (total >= MAX_TOTAL_STATEMENTS) break;
    const trimmed = line.trim();
    if (!trimmed || /^(?:#|```|<!--|-->)/.test(trimmed)) continue;
    // 跳过行内代码块内容（避免把配置示例当规范）
    if (/^\s*[`].*[`]\s*$/.test(trimmed) && !NORMATIVE_TEXT.test(trimmed)) continue;
    const listItem = trimmed.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);
    const text = (listItem?.[1] ?? trimmed).trim();
    const isListItem = Boolean(listItem);
    if (!text || text.length > MAX_STATEMENT_LENGTH) continue;
    if (isListItem || NORMATIVE_TEXT.test(text)) {
      statements.push(text);
      total++;
    }
    if (statements.length >= MAX_STATEMENTS_PER_SECTION) break;
  }
  return statements;
}

// 用于交叉验证的配置文件（存在即读取内容，检测文档规范是否已被配置落实）
const CONFIG_FILES = [
  'commitlint.config.js', 'commitlint.config.cjs', 'commitlint.config.mjs',
  '.commitlintrc.json', '.commitlintrc.js',
  '.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.cjs', 'prettier.config.js',
  '.eslintrc', '.eslintrc.json', '.eslintrc.js', 'eslint.config.js', 'eslint.config.mjs',
  'package.json', 'husky.config.js', '.lintstagedrc', '.lintstagedrc.json',
];

/**
 * 交叉验证：读取项目根部的工程配置文件（commitlint / prettier / eslint / husky /
 * package.json 等），若文档规范能在其中找到对应证据，标记 confidence: high。
 * 这里采用启发式关键词匹配，返回命中的配置证据。
 */
async function crossValidateConfig(storage: StorageBackend): Promise<string[]> {
  const evidence = new Set<string>();
  for (const file of CONFIG_FILES) {
    const content = await storage.read(file);
    if (!content) continue;
    const lower = content.toLowerCase();
    if (/commitlint|type-enum|header-max-length|body-max-length|footer-max-length/.test(lower)) evidence.add('commitlint');
    if (/prettier|singlequote|trailingcomma|semi|printwidth|singleQuote|printWidth/.test(lower)) evidence.add('prettier');
    if (/husky|lint-staged|pre-commit|commit-msg|pre-commit\.sh/.test(lower)) evidence.add('husky');
    if (/eslint|@typescript-eslint/.test(lower)) evidence.add('eslint');
  }
  return [...evidence];
}

function candidate(input: Omit<ProjectRule, 'lifecycle' | 'enforcement' | 'tags' | 'provenance'> & {
  source: string;
  tags: string[];
}): ProjectRule {
  return {
    id: input.id,
    title: input.title,
    instruction: input.instruction,
    rationale: input.rationale,
    lifecycle: 'candidate',
    enforcement: 'required',
    appliesTo: input.appliesTo,
    verification: input.verification,
    tags: input.tags,
    confidence: input.confidence,
    provenance: { kind: 'adapted', sources: [input.source] },
  };
}

/**
 * Extract deterministic candidates from an existing repository.
 * Results are never active: legacy conventions require human review before enforcement.
 *
 * 改进（相对早期版本）：
 * - 扩展来源：识别 doc/、docs/、CONTRIBUTING.md、STYLEGUIDE.md 等团队规范文档。
 * - 章节级切片：按 markdown 标题提取，排除 Sovei 自身工作流声明与非规范章节。
 * - 交叉验证：命中配置文件证据的规范标记 confidence: high。
 */
export async function scanProjectRuleCandidates(storage: StorageBackend): Promise<ProjectRule[]> {
  const candidates: ProjectRule[] = [];

  const configEvidence = await crossValidateConfig(storage);
  for (const source of await findInstructionFiles(storage)) {
    const content = await storage.read(source.path);
    if (!content) continue;
    const { metadata } = splitFrontmatter(content);
    const scope = scopeFor(source, metadata);

    // 章节级切片
    const sections = extractStatementsBySection(content);
    for (const { section, statements } of sections) {
      for (const statement of statements) {
        const confidence: RuleConfidence = configEvidence.length ? 'high' : 'medium';
        candidates.push(candidate({
          id: idFor(source.kind, source.path, `${section}::${statement}`),
          title: statement.length > 72 ? statement.slice(0, 69) + '...' : statement,
          instruction: statement,
          rationale: `从现有 ${source.kind} 规则来源 ${source.path} 章节「${section}」适配，激活前需确认仍代表当前规范。`,
          appliesTo: { ...scope, stages: [] },
          verification: [{ type: 'review', description: `核对 ${source.path} 章节「${section}」与当前代码和团队约定是否一致` }],
          tags: ['legacy-adaptation', source.kind, 'rule-source'],
          confidence,
          source: source.path,
        }));
      }
    }
  }

  // 同一文档章节内若出现完全相同的语句，idFor 输入相同会生成重复 id；
  // 去重（保留首个出现），避免写入 adapted.rules.json 后违反 id 唯一性约束。
  const seen = new Set<string>();
  const deduped = candidates.filter((rule) => {
    if (seen.has(rule.id)) return false;
    seen.add(rule.id);
    return true;
  });

  return deduped.sort((a, b) => a.id.localeCompare(b.id));
}
