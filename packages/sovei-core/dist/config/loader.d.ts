/**
 * Config Loader
 * Loads and validates Sovei configuration from the workspace.
 */
import type { SoveiConfig } from './types.js';
export declare function loadConfig(rootPath: string): SoveiConfig;
export declare function getFeaturePath(config: SoveiConfig, featureId: string): string;
export declare function getFeatureFullPath(config: SoveiConfig, featureId: string): string;
//# sourceMappingURL=loader.d.ts.map