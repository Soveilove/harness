import { createHash } from 'node:crypto';
import type { StorageBackend } from '../storage/types.js';
import { parseJson } from '../storage/json.js';
import { DEFAULT_ARCHITECTURE_POLICY, recommendStrategy } from './policy.js';
import type {
  ArchitectureDebtEntry,
  ArchitecturePolicy,
  ArchitectureSnapshot,
  ModuleMetric,
  RefactoringStrategy,
} from './types.js';

const ARCHITECTURE_DIRECTORY = 'sovei-flow/project/architecture';
const POLICY_FILE = `${ARCHITECTURE_DIRECTORY}/health-policy.json`;
const SNAPSHOT_FILE = `${ARCHITECTURE_DIRECTORY}/module-metrics.json`;
const HISTORY_FILE = `${ARCHITECTURE_DIRECTORY}/architecture-history.jsonl`;
const DEBT_FILE = `${ARCHITECTURE_DIRECTORY}/debt-register.json`;
const DEBT_LOCK = `${ARCHITECTURE_DIRECTORY}/debt-register`;

export class ArchitectureRepository {
  constructor(private readonly storage: StorageBackend) {}

  async loadPolicy(): Promise<ArchitecturePolicy> {
    const content = await this.storage.read(POLICY_FILE);
    if (!content) {
      await this.storage.write(POLICY_FILE, JSON.stringify(DEFAULT_ARCHITECTURE_POLICY, null, 2));
      return DEFAULT_ARCHITECTURE_POLICY;
    }
    const configured = parseJson(content, POLICY_FILE) as Partial<ArchitecturePolicy>;
    return {
      ...DEFAULT_ARCHITECTURE_POLICY,
      ...configured,
      thresholds: {
        ...DEFAULT_ARCHITECTURE_POLICY.thresholds,
        ...configured.thresholds,
      },
      statusScores: {
        ...DEFAULT_ARCHITECTURE_POLICY.statusScores,
        ...configured.statusScores,
      },
    };
  }

  async saveSnapshot(snapshot: ArchitectureSnapshot): Promise<void> {
    await this.storage.write(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
    await this.storage.append(
      HISTORY_FILE,
      JSON.stringify({
        generatedAt: snapshot.generatedAt,
        policyVersion: snapshot.policyVersion,
        summary: snapshot.summary,
        hotspots: snapshot.modules.slice(0, 20).map((module) => ({
          path: module.path,
          score: module.score,
          status: module.status,
          signals: module.signals.map((signal) => signal.kind),
        })),
      }) + '\n',
    );
  }

  async loadSnapshot(): Promise<ArchitectureSnapshot | null> {
    const content = await this.storage.read(SNAPSHOT_FILE);
    return content ? parseJson(content, SNAPSHOT_FILE) as ArchitectureSnapshot : null;
  }

  async loadDebt(): Promise<ArchitectureDebtEntry[]> {
    const content = await this.storage.read(DEBT_FILE);
    return content ? parseJson(content, DEBT_FILE) as ArchitectureDebtEntry[] : [];
  }

  async accept(
    metric: ModuleMetric,
    reason: string,
    strategy?: RefactoringStrategy,
  ): Promise<ArchitectureDebtEntry> {
    return this.storage.withLock(DEBT_LOCK, async () => {
      const entries = await this.loadDebt();
      const id = this.candidateId(metric.path);
      const now = new Date().toISOString();
      const existing = entries.find((entry) => entry.id === id);
      const debt: ArchitectureDebtEntry = {
        id,
        modulePath: metric.path,
        title: `Evolve ${metric.path}`,
        status: 'accepted',
        healthStatus: metric.status,
        score: metric.score,
        signals: metric.signals.map((signal) => signal.kind),
        strategy: strategy ?? recommendStrategy(metric),
        reason,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const next = existing
        ? entries.map((entry) => entry.id === id ? debt : entry)
        : [...entries, debt];
      await this.storage.write(DEBT_FILE, JSON.stringify(next, null, 2));
      return debt;
    });
  }

  async dismiss(metric: ModuleMetric, reason: string): Promise<ArchitectureDebtEntry> {
    return this.storage.withLock(DEBT_LOCK, async () => {
      const entries = await this.loadDebt();
      const id = this.candidateId(metric.path);
      const now = new Date().toISOString();
      const existing = entries.find((entry) => entry.id === id);
      const debt: ArchitectureDebtEntry = {
        id,
        modulePath: metric.path,
        title: `Observe ${metric.path}`,
        status: 'dismissed',
        healthStatus: metric.status,
        score: metric.score,
        signals: metric.signals.map((signal) => signal.kind),
        strategy: existing?.strategy ?? recommendStrategy(metric),
        reason,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      const next = existing
        ? entries.map((entry) => entry.id === id ? debt : entry)
        : [...entries, debt];
      await this.storage.write(DEBT_FILE, JSON.stringify(next, null, 2));
      return debt;
    });
  }

  candidateId(modulePath: string): string {
    return `ARC-${createHash('sha1').update(modulePath).digest('hex').slice(0, 8).toUpperCase()}`;
  }
}
