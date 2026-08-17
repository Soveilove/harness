import type { StorageBackend } from '../storage/types.js';
import {
  createWorkflowStateV3,
  parseWorkflowStateV3,
  type WorkflowStateV3,
} from './state-v3.js';

export type WorkflowStateUpdater = (
  state: WorkflowStateV3,
) => WorkflowStateV3 | Promise<WorkflowStateV3>;

export class WorkflowStateStore {
  constructor(
    private readonly storage: StorageBackend,
    private readonly statePath: string,
    private readonly stageOrder: string[],
  ) {}

  async create(featureId: string): Promise<WorkflowStateV3> {
    const state = createWorkflowStateV3(featureId, this.stageOrder);
    const created = await this.storage.writeIfAbsent(this.statePath, this.serialize(state));
    if (!created) throw new Error(`Workflow state already exists: ${this.statePath}`);
    return state;
  }

  async read(): Promise<WorkflowStateV3> {
    const content = await this.storage.read(this.statePath);
    if (content === null) throw new Error(`Workflow state not found: ${this.statePath}`);
    return parseWorkflowStateV3(content, this.stageOrder);
  }

  async update(expectedRevision: number, updater: WorkflowStateUpdater): Promise<WorkflowStateV3> {
    return this.storage.withLock(this.statePath, async () => {
      const current = await this.read();
      if (current.revision !== expectedRevision) {
        throw new Error(
          `Stale workflow state revision: expected ${expectedRevision}, actual ${current.revision}`,
        );
      }
      const next = await updater(current);
      const validated = parseWorkflowStateV3(this.serialize(next), this.stageOrder);
      if (validated.revision !== expectedRevision + 1) {
        throw new Error(
          `Workflow state revision must increment by one: expected ${expectedRevision + 1}, actual ${validated.revision}`,
        );
      }
      await this.storage.write(this.statePath, this.serialize(validated));
      return validated;
    });
  }

  private serialize(state: WorkflowStateV3): string {
    return `${JSON.stringify(state, null, 2)}\n`;
  }
}
