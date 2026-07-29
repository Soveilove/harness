/**
 * Stage Registry
 * Central registry for all stage plugins.
 * Stages register themselves at import time.
 */

import type { StageDefinition } from './define-stage.js';

class StageRegistry {
  private stages = new Map<string, StageDefinition>();

  register(def: StageDefinition): void {
    if (this.stages.has(def.name)) {
      throw new Error(`Stage already registered: ${def.name}`);
    }
    this.stages.set(def.name, def);
  }

  get(name: string): StageDefinition {
    const stage = this.stages.get(name);
    if (!stage) throw new Error(`Unknown stage: ${name}`);
    return stage;
  }

  has(name: string): boolean {
    return this.stages.has(name);
  }

  list(): string[] {
    return [...this.stages.keys()];
  }

  listAll(): StageDefinition[] {
    return [...this.stages.values()];
  }
}

export const stageRegistry = new StageRegistry();
