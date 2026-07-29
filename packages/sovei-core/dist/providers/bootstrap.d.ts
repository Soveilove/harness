/**
 * Bootstrap - Initialize the DI container with all providers.
 * Called at application startup (CLI or programmatic).
 */
import { container } from './container.js';
import { TOKENS } from './tokens.js';
import type { SoveiConfig } from '../config/types.js';
import type { Logger } from './tokens.js';
export declare function bootstrap(rootPath: string, logger?: Logger): SoveiConfig;
export { container, TOKENS };
//# sourceMappingURL=bootstrap.d.ts.map