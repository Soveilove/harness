/**
 * Lightweight DI Container
 * Inspired by NestJS DI but without the framework overhead.
 * Supports: provide, inject, singleton scoping.
 */
class DIContainer {
    registry = new Map();
    /** Register a value (singleton) */
    provide(token, value) {
        this.registry.set(token, { value });
    }
    /** Register a factory (lazy singleton) */
    provideFactory(token, factory) {
        this.registry.set(token, { value: undefined, factory });
    }
    /** Resolve a dependency */
    inject(token) {
        const entry = this.registry.get(token);
        if (!entry) {
            throw new Error(`Provider not registered: ${token.description}`);
        }
        if (entry.value === undefined && entry.factory) {
            entry.value = entry.factory();
        }
        return entry.value;
    }
    /** Check if a token is registered */
    has(token) {
        return this.registry.has(token);
    }
    /** Clear all registrations (for testing) */
    clear() {
        this.registry.clear();
    }
}
export const container = new DIContainer();
// Re-export TOKENS for convenience
export { TOKENS } from './tokens.js';
//# sourceMappingURL=container.js.map