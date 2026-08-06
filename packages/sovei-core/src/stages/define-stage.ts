/**
 * Stage Plugin System
 * Inspired by Vite plugins (lifecycle hooks) + Vue defineComponent (typed factory)
 *
 * Each stage is a self-contained plugin with:
 * - Typed input/output contracts (Zod)
 * - Lifecycle hooks: preExecute → execute → postExecute → cleanup
 * - Artifact requirements and production declarations
 */

import type { z } from 'zod';
import type { WorkflowState } from '../engine/types.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import type { ArtifactRepository } from '../artifacts/repository.js';
import type { Logger } from '../providers/tokens.js';
import type { SkillExecutionReport } from '../skills/types.js';

/** Context passed to every stage hook */
export interface StageContext {
  featureId: string;
  featurePath: string;
  workflowState: WorkflowState;
  knowledge: KnowledgeStore;
  artifacts: ArtifactRepository;
  logger: Logger;
}

/** Contract defining what a stage requires and produces */
export interface StageContract {
  /** Artifacts that must exist before this stage runs */
  requiredArtifacts: string[];
  /** Artifacts this stage produces */
  producesArtifacts: string[];
}

/** Result of a stage execution */
export interface StageResult {
  stage: string;
  artifactsWritten: string[];
  nextStage: string | null;
  blockers: string[];
  knowledgeSourcesUsed: string[];
  prompt?: string; // AI agent prompt contract
  skillExecutionReport?: SkillExecutionReport; // actual skill source used
}

/** A pre-execute hook can block execution */
export interface PreExecuteResult {
  block?: boolean;
  reason?: string;
}

/** Stage definition (the plugin) */
export interface StageDefinition {
  name: string;
  description: string;
  contract: StageContract;

  /** Execute before the stage: validate preconditions, load knowledge */
  preExecute?(ctx: StageContext): Promise<PreExecuteResult | void>;

  /** Core execution: returns the prompt contract for the AI agent */
  execute(ctx: StageContext): Promise<StageResult>;

  /** Execute after the stage: validate produced artifacts, update state */
  postExecute?(ctx: StageContext, result: StageResult): Promise<void>;

  /** Cleanup: update indexes, trigger knowledge extraction */
  cleanup?(ctx: StageContext): Promise<void>;
}

/**
 * Factory function for defining stages.
 * Like Vue's defineComponent() - provides type inference and validation.
 */
export function defineStage(def: StageDefinition): StageDefinition {
  // Validate at definition time
  if (!def.name) throw new Error('Stage must have a name');
  if (!def.description) throw new Error('Stage must have a description');
  if (!def.contract) throw new Error('Stage must have a contract');
  if (typeof def.execute !== 'function') throw new Error('Stage must have an execute function');
  return def;
}
