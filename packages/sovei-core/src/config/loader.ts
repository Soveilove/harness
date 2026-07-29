/**
 * Config Loader
 * Loads and validates Sovei configuration from the workspace.
 */

import type { SoveiConfig } from './types.js';
import { join } from 'node:path';

const DEFAULT_STAGE_ORDER = [
  'load', 'grill', 'wayfind', 'spec', 'scope', 'plan',
  'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
];

const DEFAULT_CONFIG: Omit<SoveiConfig, 'rootPath'> = {
  specsDir: 'specs',
  knowledgeDir: 'harness/project/knowledge',
  harnessDir: 'harness',
  project: {
    name: 'untitled',
    description: 'New project - configure me',
    techStack: {},
    started: new Date().toISOString().split('T')[0],
  },
  workflow: {
    version: '2.0.0',
    stageOrder: DEFAULT_STAGE_ORDER,
  },
};

export function loadConfig(rootPath: string): SoveiConfig {
  return {
    ...DEFAULT_CONFIG,
    rootPath,
  };
}

export function getFeaturePath(config: SoveiConfig, featureId: string): string {
  return join(config.specsDir, featureId);
}

export function getFeatureFullPath(config: SoveiConfig, featureId: string): string {
  return join(config.rootPath, config.specsDir, featureId);
}
