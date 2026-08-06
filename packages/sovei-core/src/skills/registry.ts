import type {
  SkillAdapter,
  SkillBinding,
  SkillResolver,
} from './types.js';

/**
 * Resolves only explicitly registered adapters. Native bindings return null so
 * the caller can keep the existing Sovei stage implementation.
 */
export class SkillAdapterRegistry implements SkillResolver {
  private readonly bindings = new Map<string, SkillBinding>();
  private readonly adapters = new Map<string, SkillAdapter>();

  constructor(bindings: SkillBinding[] = []) {
    for (const binding of bindings) this.bindings.set(binding.stage, binding);
  }

  registerBinding(binding: SkillBinding): void {
    this.bindings.set(binding.stage, binding);
  }

  registerAdapter(adapter: SkillAdapter): void {
    this.adapters.set(adapter.manifest.id, adapter);
  }

  resolve(stage: string): SkillBinding | null {
    const binding = this.bindings.get(stage);
    if (!binding || binding.status !== 'enabled' || binding.skillId.startsWith('sovei/native/')) return null;
    return binding;
  }

  getAdapter(skillId: string): SkillAdapter | null {
    return this.adapters.get(skillId) ?? null;
  }
}
