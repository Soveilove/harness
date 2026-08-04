import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { StorageBackend } from '../storage/types.js';
import type { ProjectRule } from '../rules/schemas.js';

const NORMATIVE_TEXT = /(?:必须|不得|禁止|不要|应当|应该|优先|使用|保持|must|must not|do not|never|always|required|prefer|use|preserve)/i;
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.nuxt', '.output']);
const RULES_DIRECTORY_EXTENSIONS = new Set(['.md', '.mdc', '.txt']);

type RuleSourceKind = 'codex' | 'cursor' | 'claude-code';

interface RuleSource {
  path: string;
  kind: RuleSourceKind;
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

function extractStatements(content: string): { statements: string[]; metadata: Record<string, unknown> } {
  const { body, metadata } = splitFrontmatter(content);
  const statements = body.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(?:#|```|<!--|-->)/.test(line))
    .map((line) => {
      const listItem = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);
      return { text: (listItem?.[1] ?? line).trim(), isListItem: Boolean(listItem) };
    })
    .filter(({ text, isListItem }) => text.length <= 600 && (isListItem || NORMATIVE_TEXT.test(text)))
    .map(({ text }) => text)
    .slice(0, 100);
  return { statements, metadata };
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
    provenance: { kind: 'adapted', sources: [input.source] },
  };
}

/**
 * Extract deterministic candidates from an existing repository.
 * Results are never active: legacy conventions require human review before enforcement.
 */
export async function scanProjectRuleCandidates(storage: StorageBackend): Promise<ProjectRule[]> {
  const candidates: ProjectRule[] = [];

  for (const source of await findInstructionFiles(storage)) {
    const content = await storage.read(source.path);
    if (!content) continue;
    const { statements, metadata } = extractStatements(content);
    const scope = scopeFor(source, metadata);
    for (const statement of statements) {
      candidates.push(candidate({
        id: idFor('INSTRUCTION', source.path, statement),
        title: statement.length > 72 ? statement.slice(0, 69) + '...' : statement,
        instruction: statement,
        rationale: `从现有 ${source.kind} 规则文件 ${source.path} 适配，激活前需确认仍代表当前规范。`,
        appliesTo: { ...scope, stages: [] },
        verification: [{ type: 'review', description: `核对 ${source.path} 与当前代码和团队约定是否一致` }],
        tags: ['legacy-adaptation', source.kind, 'agent-rule-file'],
        source: source.path,
      }));
    }
  }

  return candidates.sort((a, b) => a.id.localeCompare(b.id));
}
