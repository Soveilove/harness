/**
 * MarkdownSkillAdapter - Reads a vendored SKILL.md file and exposes its
 * markdown body as a prompt-injection proposal.
 *
 * This adapter does NOT execute a sub-agent. It simply reads the skill
 * content so the WorkflowEngine can prepend it to the native stage prompt.
 */

import type {
  SkillAdapter,
  SkillManifest,
  SkillRequest,
  SkillResult,
} from './types.js';
import { parse as parseYaml } from 'yaml';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Parsed structure of a SKILL.md file. */
export interface ParsedSkillFile {
  name: string;
  description: string;
  disableModelInvocation: boolean;
  body: string;
}

/**
 * Parse a SKILL.md file into frontmatter metadata and markdown body.
 *
 * The file format is:
 * ```
 * ---
 * name: skill-name
 * description: ...
 * disable-model-invocation: true   (optional)
 * ---
 * Markdown body content...
 * ```
 */
export function parseSkillFile(content: string): ParsedSkillFile {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { name: '', description: '', disableModelInvocation: false, body: content.trim() };
  }
  const raw = parseYaml(match[1]) as Record<string, unknown>;
  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    disableModelInvocation: raw['disable-model-invocation'] === true,
    body: match[2].trim(),
  };
}

/** Proposal name used for prompt injection. */
export const PROMPT_INJECTION_PROPOSAL = 'prompt-injection';

/**
 * Adapter that wraps a vendored SKILL.md file. The `execute` method returns
 * the skill body as a proposal so the caller (WorkflowEngine) can inject it
 * into the stage prompt.
 */
/**
 * Auto-load `references/*.md` files sitting next to the SKILL.md and append
 * them to the injected body. Many third-party skills (e.g. softaworks
 * lesson-learned) reference a `references/` catalog that the agent must have
 * loaded for the skill to be effective. We inline them so prompt injection
 * stays self-contained.
 */
export function loadReferenceFiles(skillDir: string): string {
  const refsDir = join(skillDir, 'references');
  if (!existsSync(refsDir)) return '';
  let refs: string[] = [];
  try {
    refs = readdirSync(refsDir)
      .filter((f) => f.endsWith('.md'))
      .sort();
  } catch {
    return '';
  }
  const sections: string[] = [];
  for (const ref of refs) {
    try {
      const content = readFileSync(join(refsDir, ref), 'utf8').trim();
      if (!content) continue;
      sections.push(`## Reference: ${ref}\n\n${content}`);
    } catch {
      // ignore unreadable reference file
    }
  }
  return sections.length ? `\n\n---\n\n${sections.join('\n\n')}` : '';
}

export class MarkdownSkillAdapter implements SkillAdapter {
  readonly manifest: SkillManifest;
  private readonly skillBody: string;

  /**
   * @param manifest Skill manifest (id/name/version/source)
   * @param skillContent Raw SKILL.md text
   * @param skillDir Optional directory containing references/ to inline
   */
  constructor(manifest: SkillManifest, skillContent: string, skillDir?: string) {
    this.manifest = manifest;
    const body = parseSkillFile(skillContent).body;
    const refs = skillDir ? loadReferenceFiles(skillDir) : '';
    this.skillBody = body + refs;
  }

  /** Extract just the body text (for direct use without a full request cycle). */
  getSkillBody(): string {
    return this.skillBody;
  }

  async execute(request: SkillRequest): Promise<SkillResult> {
    return {
      requestId: request.requestId,
      skillId: this.manifest.id,
      mode: 'third-party',
      proposals: [
        {
          name: PROMPT_INJECTION_PROPOSAL,
          content: this.skillBody,
          evidence: [],
        },
      ],
      notes: [`Loaded from ${this.manifest.source.locator}`],
      completed: false,
      returnedAt: new Date().toISOString(),
    };
  }
}
