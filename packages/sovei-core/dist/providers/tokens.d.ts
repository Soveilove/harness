/**
 * DI Tokens (NestJS-inspired)
 * Symbol-based injection tokens for type-safe dependency injection.
 */
export declare const TOKENS: {
    readonly Storage: symbol;
    readonly KnowledgeStore: symbol;
    readonly EventStore: symbol;
    readonly ArtifactRepo: symbol;
    readonly WorkflowEngine: symbol;
    readonly Logger: symbol;
    readonly Config: symbol;
};
export type Token = (typeof TOKENS)[keyof typeof TOKENS];
/** Simple logger interface */
export interface Logger {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debug(msg: string): void;
}
/** Console logger implementation */
export declare class ConsoleLogger implements Logger {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debug(msg: string): void;
}
//# sourceMappingURL=tokens.d.ts.map