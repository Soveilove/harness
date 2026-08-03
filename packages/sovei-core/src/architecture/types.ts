export type ArchitectureHealthStatus =
  | 'healthy'
  | 'watch'
  | 'refactor-candidate'
  | 'refactor-required'
  | 'migration-in-progress'
  | 'stabilized';

export type ArchitectureSignalKind =
  | 'large-file'
  | 'long-function'
  | 'high-complexity'
  | 'high-churn'
  | 'high-fan-in'
  | 'high-fan-out'
  | 'cyclic-dependency'
  | 'mixed-responsibilities';

export interface ArchitectureSignal {
  kind: ArchitectureSignalKind;
  severity: 'info' | 'warning' | 'critical';
  value: number;
  threshold: number;
  message: string;
}

export interface FunctionMetric {
  name: string;
  startLine: number;
  endLine: number;
  lines: number;
}

export interface ModuleMetric {
  path: string;
  language: string;
  lines: number;
  codeLines: number;
  branchCount: number;
  maxFunctionLines: number;
  longestFunctions: FunctionMetric[];
  fanIn: number;
  fanOut: number;
  churn90Days: number;
  responsibilityCount: number;
  dependencies: string[];
  cycleMembers: string[];
  score: number;
  status: ArchitectureHealthStatus;
  signals: ArchitectureSignal[];
}

export interface ArchitectureSummary {
  healthy: number;
  watch: number;
  refactorCandidate: number;
  refactorRequired: number;
  totalModules: number;
}

export interface ArchitectureSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  rootPath: string;
  policyVersion: string;
  summary: ArchitectureSummary;
  modules: ModuleMetric[];
}

export type RefactoringStrategy =
  | 'extract-module'
  | 'branch-by-abstraction'
  | 'expand-migrate-contract'
  | 'stabilize-with-tests';

export interface ArchitectureDebtEntry {
  id: string;
  modulePath: string;
  title: string;
  status: 'accepted' | 'dismissed' | 'in-progress' | 'resolved';
  healthStatus: ArchitectureHealthStatus;
  score: number;
  signals: ArchitectureSignalKind[];
  strategy: RefactoringStrategy;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArchitecturePolicy {
  version: string;
  includeExtensions: string[];
  excludeDirectories: string[];
  excludePatterns: string[];
  thresholds: {
    fileLinesWarning: number;
    fileLinesCritical: number;
    functionLinesWarning: number;
    functionLinesCritical: number;
    branchesPerHundredLinesWarning: number;
    branchesPerHundredLinesCritical: number;
    churn90DaysWarning: number;
    churn90DaysCritical: number;
    fanInWarning: number;
    fanInCritical: number;
    fanOutWarning: number;
    fanOutCritical: number;
    responsibilitiesWarning: number;
    responsibilitiesCritical: number;
  };
  statusScores: {
    watch: number;
    refactorCandidate: number;
    refactorRequired: number;
  };
  requiredPressureDimensions: number;
}
