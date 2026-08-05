/**
 * Reconciliation markdown parser.
 *
 * Extracts typed data from a structured reconciliation.md so renderers can
 * produce tech-review and product-review views without re-reading the source.
 * The parser is resilient: missing sections yield empty values, not errors.
 */

import type {
  ReconciliationDoc,
  ReconciliationQuestion,
  ReconciliationSolution,
  ConfirmationRole,
  ParsedSignoff,
} from './types.js';

/** Extract the text under a ## heading, up to the next ## or end of file. */
function extractSection(lines: string[], heading: string): string[] {
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return [];
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body;
}

/** Parse ### sub-sections inside a ## section body. */
function extractSubSections(body: string[]): Array<{ heading: string; content: string[] }> {
  const sections: Array<{ heading: string; content: string[] }> = [];
  let current: { heading: string; content: string[] } | null = null;
  for (const line of body) {
    if (/^###\s/.test(line)) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^###\s*/, '').trim(), content: [] };
    } else if (current) {
      current.content.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function parseSolutions(body: string[]): ReconciliationSolution[] {
  return extractSubSections(body).map((sub) => {
    const content = sub.content.join('\n').trim();
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    const desc: string[] = [];
    let cost = '';
    for (const line of lines) {
      if (/^[-*]\s*(?:cost|risk|代价|风险)\s*[:：]/i.test(line)) {
        cost = line.replace(/^[-*]\s*(?:cost|risk|代价|风险)\s*[:：]\s*/i, '');
      } else {
        desc.push(line.replace(/^[-*]\s*/, ''));
      }
    }
    return { name: sub.heading, description: desc.join(' '), cost };
  });
}

function parseQuestions(body: string[]): ReconciliationQuestion[] {
  const questions: ReconciliationQuestion[] = [];
  for (const sub of extractSubSections(body)) {
    const roleMatch = sub.heading.match(/^\[(product|tech)\]\s*/i);
    const role: ConfirmationRole = roleMatch ? (roleMatch[1].toLowerCase() as ConfirmationRole) : 'product';
    const restHeading = sub.heading.replace(/^\[(product|tech)\]\s*/i, '');
    const idMatch = restHeading.match(/^(Q\d+)\s*[:：]\s*(.*)/);
    const id = idMatch ? idMatch[1] : `Q${questions.length + 1}`;
    const questionText = idMatch ? idMatch[2] : restHeading;
    const content = sub.content.join('\n');
    const recMatch = content.match(/(?:recommendation|推荐)\s*[:：]\s*(.+)/i);
    const recommendation = recMatch ? recMatch[1].trim() : '';
    const optionsMatch = content.match(/(?:options|选项)\s*[:：]\s*(.+)/i);
    const options = optionsMatch
      ? optionsMatch[1].split(/[[\]]/).map((s) => s.trim()).filter(Boolean)
      : [];
    questions.push({ id, role, question: questionText, recommendation, options });
  }
  return questions;
}

function parseSignoffs(body: string[]): ParsedSignoff[] {
  const signoffs: ParsedSignoff[] = [];
  for (const line of body) {
    const match = line.match(/^[-*]\s*\[([ xX])\]\s*(product|tech|产品|技术)\s*[:：]\s*(.*)/i);
    if (!match) continue;
    const signed = match[1].toLowerCase() === 'x';
    const roleRaw = match[2].toLowerCase();
    const role: ConfirmationRole = roleRaw === '产品' || roleRaw === 'product' ? 'product' : 'tech';
    const rest = match[3];
    const byMatch = rest.match(/(?:by|签字)\s*[:：]\s*(\S+)/);
    const atMatch = rest.match(/(?:date|at|日期)\s*[:：]\s*(\S+)/);
    const refMatch = rest.match(/(?:ref|reference|参考)\s*[:：]\s*(\S+)/);
    signoffs.push({
      role,
      signed,
      by: byMatch ? byMatch[1] : null,
      at: atMatch ? atMatch[1] : null,
      reference: refMatch ? refMatch[1] : null,
    });
  }
  return signoffs;
}

export function parseReconciliation(markdown: string): ReconciliationDoc {
  const lines = markdown.split(/\r?\n/);

  const headerLine = lines.find((l) => /^#\s+Reconciliation/i.test(l)) ?? '';
  const headerParts = headerLine.replace(/^#\s+Reconciliation\s*[:：]?\s*/i, '').split(/\s+(.*)/);
  const featureId = headerParts[0] ?? '';
  const title = headerParts[1] ?? '';

  const needTranslation = extractSection(lines, 'Need Translation').join('\n').trim()
    || extractSection(lines, '需求翻译').join('\n').trim();

  const currentState = extractSection(lines, 'Current State').join('\n').trim()
    || extractSection(lines, '现状还原').join('\n').trim();

  const solutionsBody = extractSection(lines, 'Solutions').length
    ? extractSection(lines, 'Solutions')
    : extractSection(lines, '方案与代价');
  const solutions = parseSolutions(solutionsBody);

  const questionsBody = extractSection(lines, 'Questions').length
    ? extractSection(lines, 'Questions')
    : extractSection(lines, '需要确认的疑问');
  const questions = parseQuestions(questionsBody);

  const signoffBody = extractSection(lines, 'Sign-off').length
    ? extractSection(lines, 'Sign-off')
    : extractSection(lines, '签字');
  const signoffs = parseSignoffs(signoffBody);

  return { featureId, title, needTranslation, currentState, solutions, questions, signoffs };
}
