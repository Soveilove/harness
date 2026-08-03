/**
 * Optional Provider Contracts
 *
 * These interfaces allow external embedding and LLM providers to be injected
 * for semantic retrieval, reranking, and batch processing. Core functionality
 * must work without any provider configured.
 */

export interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface LLMProvider {
  readonly id: string;
  readonly model: string;
  complete(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string>;
}

/** A scored retrieval result from either local text matching or semantic search. */
export interface ScoredItem<T> {
  item: T;
  score: number;
  source: 'local-text' | 'semantic' | 'llm-rerank';
}
