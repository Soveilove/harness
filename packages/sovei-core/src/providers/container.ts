/**
 * Lightweight DI Container
 * Inspired by NestJS DI but without the framework overhead.
 * Supports: provide, inject, singleton scoping.
 */

import type { Token } from './tokens.js';

class DIContainer {
  private registry = new Map<Token, { value: unknown; factory?: () => unknown }>();

  /** Register a value (singleton) */
  provide<T>(token: Token, value: T): void {
    this.registry.set(token, { value });
  }

  /** Register a factory (lazy singleton) */
  provideFactory<T>(token: Token, factory: () => T): void {
    this.registry.set(token, { value: undefined, factory });
  }

  /** Resolve a dependency */
  inject<T>(token: Token): T {
    const entry = this.registry.get(token);
    if (!entry) {
      throw new Error(`Provider not registered: ${token.description}`);
    }
    if (entry.value === undefined && entry.factory) {
      entry.value = entry.factory();
    }
    return entry.value as T;
  }

  /** Check if a token is registered */
  has(token: Token): boolean {
    return this.registry.has(token);
  }

  /** Clear all registrations (for testing) */
  clear(): void {
    this.registry.clear();
  }
}

export const container = new DIContainer();

// Re-export TOKENS for convenience
export { TOKENS } from './tokens.js';
