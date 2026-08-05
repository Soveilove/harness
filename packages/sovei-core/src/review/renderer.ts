/**
 * Review pack renderer.
 *
 * Produces two views from a single parsed reconciliation document:
 * - tech-review.md:  for tech lead (keeps file paths, technical details)
 * - product-review.md: for PM (pure business language, confirmation options)
 *
 * The source of truth is reconciliation.md; these files are derived views.
 */

import type { ReconciliationDoc } from './types.js';

function signoffLine(role: 'product' | 'tech', signed: boolean, by: string | null, at: string | null, reference: string | null): string {
  const checkbox = signed ? '[x]' : '[ ]';
  const label = role === 'product' ? '产品确认' : '技术确认';
  const parts = [label];
  if (by) parts.push(`签字: ${by}`);
  if (at) parts.push(`日期: ${at}`);
  if (reference) parts.push(`参考: ${reference}`);
  return `- ${checkbox} ${parts.join('  ')}`;
}

export function renderTechReview(doc: ReconciliationDoc): string {
  const lines: string[] = [];
  lines.push(`# 技术确认: ${doc.featureId} ${doc.title}`);
  lines.push('');
  lines.push('> 本文件由 reconciliation.md 渲染，仅供技术负责人审阅。');
  lines.push('> 事实来源是 reconciliation.md；修改请回源头，再重新生成。');
  lines.push('');

  if (doc.needTranslation) {
    lines.push('## 需求翻译');
    lines.push('');
    lines.push(doc.needTranslation);
    lines.push('');
  }

  if (doc.currentState) {
    lines.push('## 现状还原');
    lines.push('');
    lines.push(doc.currentState);
    lines.push('');
  }

  if (doc.solutions.length) {
    lines.push('## 方案与代价');
    lines.push('');
    for (const sol of doc.solutions) {
      lines.push(`### ${sol.name}`);
      lines.push(`- ${sol.description}`);
      if (sol.cost) lines.push(`- 代价: ${sol.cost}`);
      lines.push('');
    }
  }

  const techQuestions = doc.questions.filter((q) => q.role === 'tech');
  if (techQuestions.length) {
    lines.push('## 技术疑问');
    lines.push('');
    for (const q of techQuestions) {
      lines.push(`### ${q.id}: ${q.question}`);
      if (q.recommendation) lines.push(`- 推荐: ${q.recommendation}`);
      if (q.options.length) lines.push(`- 选项: ${q.options.join(' / ')}`);
      lines.push('');
    }
  }

  lines.push('## 签字');
  lines.push('');
  for (const s of doc.signoffs) {
    lines.push(signoffLine(s.role, s.signed, s.by, s.at, s.reference));
  }
  lines.push('');
  return lines.join('\n');
}

export function renderProductReview(doc: ReconciliationDoc): string {
  const lines: string[] = [];
  lines.push(`# 产品确认: ${doc.title}`);
  lines.push('');
  lines.push('> 本文件由 reconciliation.md 渲染，仅供产品负责人审阅。');
  lines.push('> 确认后在签字栏填写信息，或运行 sovei governance review-pack import 导入。');
  lines.push('');

  if (doc.needTranslation) {
    lines.push('## 这个需求会改变什么');
    lines.push('');
    lines.push(doc.needTranslation);
    lines.push('');
  }

  if (doc.currentState) {
    lines.push('## 上次做了什么（你可能不记得了）');
    lines.push('');
    lines.push(doc.currentState);
    lines.push('');
  }

  if (doc.solutions.length) {
    lines.push('## 可选方案');
    lines.push('');
    for (const sol of doc.solutions) {
      lines.push(`- **${sol.name}**: ${sol.description}`);
      if (sol.cost) lines.push(`  - 代价: ${sol.cost}`);
    }
    lines.push('');
  }

  const productQuestions = doc.questions.filter((q) => q.role === 'product');
  if (productQuestions.length) {
    lines.push('## 需要你确认');
    lines.push('');
    let idx = 1;
    for (const q of productQuestions) {
      lines.push(`${idx}. ${q.question}`);
      if (q.recommendation) lines.push(`   - 建议: ${q.recommendation}`);
      if (q.options.length) {
        for (const opt of q.options) {
          lines.push(`   [ ] ${opt}`);
        }
      }
      lines.push('');
      idx++;
    }
  }

  lines.push('## 签字');
  lines.push('');
  for (const s of doc.signoffs) {
    if (s.role === 'product') {
      lines.push(signoffLine(s.role, s.signed, s.by, s.at, s.reference));
    }
  }
  lines.push('');
  return lines.join('\n');
}
