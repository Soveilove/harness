/**
 * Config Loader
 * Loads and validates Sovei configuration from the workspace.
 */

import type { SoveiConfig } from './types.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseProjectJson } from './json.js';

const DEFAULT_STAGE_ORDER = [
  'explore', 'load', 'grill', 'wayfind', 'spec', 'scope', 'plan',
  'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
];

const DEFAULT_CONFIG: Omit<SoveiConfig, 'rootPath'> = {
  specsDir: 'specs',
  knowledgeDir: 'sovei-flow/project/knowledge',
  rulesDir: 'sovei-flow/project/rules',
  harnessDir: 'sovei-flow',
  project: {
    name: 'untitled',
    description: 'New project - configure me',
    techStack: {},
    started: new Date().toISOString().split('T')[0],
  },
  workflow: {
    version: '3.0.0',
    stageOrder: DEFAULT_STAGE_ORDER,
  },
};

export function loadConfig(rootPath: string): SoveiConfig {
  const configPath = join(rootPath, 'sovei-flow', 'project', 'project.config.json');
  let configured: Partial<SoveiConfig> = {};
  try {
    configured = parseProjectJson<Partial<SoveiConfig>>(readFileSync(configPath, 'utf8'), configPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error(`Invalid project configuration at ${configPath}: ${(error as Error).message}`);
    }
  }
  const configuredOrder = configured.workflow?.stageOrder;
  if (configuredOrder) {
    // Relaxed validation: allow configs that predate 'explore' (12-stage) for
    // backward compat. Only reject unknown stages and duplicates.
    const unknown = configuredOrder.filter((stage) => !DEFAULT_STAGE_ORDER.includes(stage));
    if (unknown.length || new Set(configuredOrder).size !== configuredOrder.length) {
      throw new Error(
        `Invalid workflow.stageOrder in ${configPath}: unknown stages [${unknown.join(', ')}] or duplicates. ` +
        `Expected a subset of: ${DEFAULT_STAGE_ORDER.join(', ')}`,
      );
    }
  }
  const configuredVersion = configured.workflow?.version;
  if (configuredVersion && configuredVersion !== DEFAULT_CONFIG.workflow.version) {
    process.stderr.write(
      `\n  \u26A0\uFE0F  workflow.version mismatch: project declares "${configuredVersion}", ` +
      `engine expects "${DEFAULT_CONFIG.workflow.version}"\n` +
      `     If this is intentional, update sovei-flow/project/project.config.json to match.\n` +
      `     If unsure, run: sovei project init --force\n\n`,
    );
  }

  return {
    ...DEFAULT_CONFIG,
    ...configured,
    rootPath,
    project: { ...DEFAULT_CONFIG.project, ...configured.project },
    workflow: {
      ...DEFAULT_CONFIG.workflow,
      ...configured.workflow,
      stageOrder: configuredOrder ?? DEFAULT_STAGE_ORDER,
    },
  };
}

export function getFeaturePath(config: SoveiConfig, featureId: string): string {
  return join(config.specsDir, featureId);
}

export function getFeatureFullPath(config: SoveiConfig, featureId: string): string {
  return join(config.rootPath, config.specsDir, featureId);
}
