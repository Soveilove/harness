/**
 * DI Tokens (NestJS-inspired)
 * Symbol-based injection tokens for type-safe dependency injection.
 */

export const TOKENS = {
  Storage: Symbol('Storage'),
  KnowledgeStore: Symbol('KnowledgeStore'),
  EventStore: Symbol('EventStore'),
  ArtifactRepo: Symbol('ArtifactRepo'),
  WorkflowEngine: Symbol('WorkflowEngine'),
  Logger: Symbol('Logger'),
  Config: Symbol('Config'),
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];

/** Simple logger interface */
export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

/** Console logger implementation */
export class ConsoleLogger implements Logger {
  info(msg: string): void { console.log(`  ℹ  ${msg}`); }
  warn(msg: string): void { console.warn(`  ⚠  ${msg}`); }
  error(msg: string): void { console.error(`  ✗  ${msg}`); }
  debug(msg: string): void { if (process.env.DEBUG) console.log(`  ·  ${msg}`); }
}
