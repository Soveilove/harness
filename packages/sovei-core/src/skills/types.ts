/**
 * External Skill runtime contracts.
 *
 * A third-party Skill can propose work, but it never owns Sovei workflow state
 * or the decision that an artifact is complete.
 */

export type SkillStatus = 'candidate' | 'enabled' | 'disabled' | 'incompatible';
export type SkillSourceType = 'git' | 'path' | 'registry';
export type SkillExecutionMode = 'native' | 'third-party' | 'fallback';

export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  source: {
    type: SkillSourceType;
    locator: string;
    ref?: string;
    commit?: string;
  };
  license?: string;
  supportedStages: string[];
  readOnly: true;
  protocolVersion: string;
}

export interface SkillBinding {
  stage: string;
  skillId: string;
  status: SkillStatus;
  fallback: 'native';
  timeoutMs?: number;
}

export interface SkillContextPack {
  featureId: string;
  stage: string;
  revision: number;
  artifacts: Record<string, string>;
  knowledgeSources: string[];
  allowedPaths: string[];
  readOnly: true;
}

export interface SkillRequest {
  requestId: string;
  manifest: SkillManifest;
  binding: SkillBinding;
  context: SkillContextPack;
  requestedAt: string;
}

export interface SkillArtifactProposal {
  name: string;
  content: string;
  evidence: string[];
}

export interface SkillResult {
  requestId: string;
  skillId: string;
  mode: 'third-party';
  proposals: SkillArtifactProposal[];
  notes: string[];
  completed: false;
  returnedAt: string;
}

export interface SkillExecutionReport {
  requestId: string;
  stage: string;
  mode: SkillExecutionMode;
  skillId: string | null;
  version: string | null;
  durationMs: number;
  fallbackReason: string | null;
  artifactNames: string[];
  validated: boolean;
}

export interface SkillAdapter {
  readonly manifest: SkillManifest;
  execute(request: SkillRequest): Promise<SkillResult>;
}

export interface SkillResolver {
  resolve(stage: string): SkillBinding | null;
  getAdapter(skillId: string): SkillAdapter | null;
}
