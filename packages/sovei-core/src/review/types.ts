/**
 * Reconciliation types.
 *
 * The agent generates reconciliation.md following a structured markdown format.
 * The parser extracts typed data from it; renderers produce tech-review.md
 * (for tech lead) and product-review.md (for PM) as two views of the same source.
 */

export type ConfirmationRole = 'product' | 'tech';

export interface ReconciliationQuestion {
  id: string;
  role: ConfirmationRole;
  question: string;
  recommendation: string;
  options: string[];
}

export interface ReconciliationSolution {
  name: string;
  description: string;
  cost: string;
}

export interface ReconciliationDoc {
  featureId: string;
  title: string;
  needTranslation: string;
  currentState: string;
  solutions: ReconciliationSolution[];
  questions: ReconciliationQuestion[];
  signoffs: Array<{ role: ConfirmationRole; signed: boolean; by: string | null; at: string | null; reference: string | null }>;
}

export interface ParsedSignoff {
  role: ConfirmationRole;
  signed: boolean;
  by: string | null;
  at: string | null;
  reference: string | null;
}
