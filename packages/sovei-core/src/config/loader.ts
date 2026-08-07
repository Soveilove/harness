/**
 * Config Loader
 * Loads and validates Sovei configuration from the workspace.
 */

import type { SoveiConfig } from './types.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseProjectJson } from './json.js';

const DEFAULT_STAGE_ORDER = [
  'load', 'grill', 'wayfind', 'spec', 'scope', 'plan',
  'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
];

const DEFAULT_CONFIG: Omit<SoveiConfig, 'rootPath'> = {
  specsDir: 'specs',
  knowledgeDir: 'harness/project/knowledge',
  rulesDir: 'harness/project/rules',
  harnessDir: 'harness',
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
  const configPath = join(rootPath, 'harness', 'project', 'project.config.json');
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
    const unknown = configuredOrder.filter((stage) => !DEFAULT_STAGE_ORDER.includes(stage));
    if (
      unknown.length
      || configuredOrder.length !== DEFAULT_STAGE_ORDER.length
      || new Set(configuredOrder).size !== configuredOrder.length
      || DEFAULT_STAGE_ORDER.some((stage) => !configuredOrder.includes(stage))
    ) {
      throw new Error(`Invalid workflow.stageOrder in ${configPath}`);
    }
  }
  const configuredVersion = configured.workflow?.version;
  if (configuredVersion && configuredVersion !== DEFAULT_CONFIG.workflow.version) {
    process.stderr.write(
      `\n  \u26A0\uFE0F  workflow.version mismatch: project declares "${configuredVersion}", ` +
      `engine expects "${DEFAULT_CONFIG.workflow.version}"\n` +
      `     If this is intentional, update harness/project/project.config.json to match.\n` +
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
