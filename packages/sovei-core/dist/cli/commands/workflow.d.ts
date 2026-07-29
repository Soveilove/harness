/**
 * Workflow Commands
 * 12 stage commands + bootstrap + reopen + status + list-stages
 * Each stage executes exactly one step and reports the next command.
 */
import type { Command } from 'commander';
import '../../stages/index.js';
export declare function registerWorkflowCommands(program: Command): void;
//# sourceMappingURL=workflow.d.ts.map