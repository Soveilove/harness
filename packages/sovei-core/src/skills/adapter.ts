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
export class MarkdownSkillAdapter implements SkillAdapter {
  readonly manifest: SkillManifest;
  private readonly skillBody: string;

  constructor(manifest: SkillManifest, skillContent: string) {
    this.manifest = manifest;
    this.skillBody = parseSkillFile(skillContent).body;
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
