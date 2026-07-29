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
};
/** Console logger implementation */
export class ConsoleLogger {
    info(msg) { console.log(`  ℹ  ${msg}`); }
    warn(msg) { console.warn(`  ⚠  ${msg}`); }
    error(msg) { console.error(`  ✗  ${msg}`); }
    debug(msg) { if (process.env.DEBUG)
        console.log(`  ·  ${msg}`); }
}
//# sourceMappingURL=tokens.js.map