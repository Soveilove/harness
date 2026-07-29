/**
 * Lightweight DI Container
 * Inspired by NestJS DI but without the framework overhead.
 * Supports: provide, inject, singleton scoping.
 */
import type { Token } from './tokens.js';
declare class DIContainer {
    private registry;
    /** Register a value (singleton) */
    provide<T>(token: Token, value: T): void;
    /** Register a factory (lazy singleton) */
    provideFactory<T>(token: Token, factory: () => T): void;
    /** Resolve a dependency */
    inject<T>(token: Token): T;
    /** Check if a token is registered */
    has(token: Token): boolean;
    /** Clear all registrations (for testing) */
    clear(): void;
}
export declare const container: DIContainer;
export { TOKENS } from './tokens.js';
//# sourceMappingURL=container.d.ts.map