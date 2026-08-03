import type {
  ArchitectureHealthStatus,
  ArchitecturePolicy,
  ArchitectureSignal,
  ModuleMetric,
} from './types.js';

export const DEFAULT_ARCHITECTURE_POLICY: ArchitecturePolicy = {
  version: '1.0.0',
  includeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.mjs', '.cjs'],
  excludeDirectories: [
    '.git',
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.next',
    '.nuxt',
    '.cache',
    '.turbo',
    'vendor',
  ],
  excludePatterns: [
    '.d.ts',
    '.min.js',
    '.generated.',
    '/generated/',
    '/fixtures/',
    '/snapshots/',
  ],
  thresholds: {
    fileLinesWarning: 800,
    fileLinesCritical: 2000,
    functionLinesWarning: 80,
    functionLinesCritical: 200,
    branchesPerHundredLinesWarning: 12,
    branchesPerHundredLinesCritical: 24,
    churn90DaysWarning: 8,
    churn90DaysCritical: 20,
    fanInWarning: 10,
    fanInCritical: 25,
    fanOutWarning: 12,
    fanOutCritical: 24,
    responsibilitiesWarning: 4,
    responsibilitiesCritical: 7,
  },
  statusScores: {
    watch: 20,
    refactorCandidate: 40,
    refactorRequired: 50,
  },
  requiredPressureDimensions: 2,
};

const PRESSURE_DIMENSIONS: Record<ArchitectureSignal['kind'], string> = {
  'large-file': 'size',
  'long-function': 'structure',
  'high-complexity': 'complexity',
  'high-churn': 'change',
  'high-fan-in': 'coupling',
  'high-fan-out': 'coupling',
  'cyclic-dependency': 'coupling',
  'mixed-responsibilities': 'responsibility',
};

export function countPressureDimensions(signals: ArchitectureSignal[]): number {
  return new Set(signals.map((signal) => PRESSURE_DIMENSIONS[signal.kind])).size;
}

export function classifyArchitectureHealth(
  score: number,
  signals: ArchitectureSignal[],
  policy: ArchitecturePolicy,
): ArchitectureHealthStatus {
  const dimensions = countPressureDimensions(signals);

  if (score < policy.statusScores.watch) return 'healthy';
  if (score < policy.statusScores.refactorCandidate) return 'watch';

  // Size alone is never enough to force a refactor. A large stable module can
  // remain observable without becoming delivery-blocking architecture work.
  if (dimensions < policy.requiredPressureDimensions) return 'watch';
  if (score < policy.statusScores.refactorRequired) return 'refactor-candidate';
  return 'refactor-required';
}

export function recommendStrategy(metric: Pick<ModuleMetric, 'signals'>):
  | 'extract-module'
  | 'branch-by-abstraction'
  | 'expand-migrate-contract'
  | 'stabilize-with-tests' {
  const kinds = new Set(metric.signals.map((signal) => signal.kind));
  if (kinds.has('cyclic-dependency') || kinds.has('high-fan-in')) {
    return 'branch-by-abstraction';
  }
  if (kinds.has('high-churn') && kinds.has('mixed-responsibilities')) {
    return 'expand-migrate-contract';
  }
  if (kinds.has('long-function') || kinds.has('large-file')) {
    return 'extract-module';
  }
  return 'stabilize-with-tests';
}
