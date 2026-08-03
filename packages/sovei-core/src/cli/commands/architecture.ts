import type { Command } from 'commander';
import { ArchitectureAnalyzer } from '../../architecture/analyzer.js';
import { ArchitectureRepository } from '../../architecture/repository.js';
import type {
  ArchitectureDebtEntry,
  ArchitectureSnapshot,
  ModuleMetric,
  RefactoringStrategy,
} from '../../architecture/types.js';
import type { SoveiConfig } from '../../config/types.js';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';

function dependencies(): {
  config: SoveiConfig;
  repository: ArchitectureRepository;
} {
  const config = container.inject<SoveiConfig>(TOKENS.Config);
  const storage = container.inject<StorageBackend>(TOKENS.Storage);
  return { config, repository: new ArchitectureRepository(storage) };
}

function printSummary(snapshot: ArchitectureSnapshot): void {
  const summary = snapshot.summary;
  console.log('');
  console.log('  Architecture Health');
  console.log('  -------------------');
  console.log(`  Modules:             ${summary.totalModules}`);
  console.log(`  Healthy:             ${summary.healthy}`);
  console.log(`  Watch:               ${summary.watch}`);
  console.log(`  Refactor candidates: ${summary.refactorCandidate}`);
  console.log(`  Refactor required:   ${summary.refactorRequired}`);
  console.log(`  Generated:           ${snapshot.generatedAt}`);
  console.log('');
}

function printModule(metric: ModuleMetric, id?: string): void {
  const label = id ? `${id}  ${metric.path}` : metric.path;
  console.log(`  [${metric.status}] ${label}`);
  console.log(
    `    score=${metric.score} lines=${metric.lines} maxFn=${metric.maxFunctionLines}` +
    ` churn90=${metric.churn90Days} fanIn=${metric.fanIn} fanOut=${metric.fanOut}`,
  );
  for (const signal of metric.signals) {
    console.log(`    - ${signal.kind}: ${signal.message}`);
  }
  console.log('');
}

function findMetric(
  snapshot: ArchitectureSnapshot,
  repository: ArchitectureRepository,
  target: string,
): ModuleMetric | undefined {
  const normalized = target.replace(/\\/g, '/');
  return snapshot.modules.find((module) =>
    module.path === normalized || repository.candidateId(module.path) === target.toUpperCase(),
  );
}

export function registerArchitectureCommands(program: Command): void {
  const architecture = program
    .command('architecture')
    .description('Evolutionary architecture health and debt management');

  architecture
    .command('scan')
    .description('Analyze code health and persist an architecture snapshot')
    .option('--paths <paths>', 'Comma-separated paths to scan', 'src')
    .option('--top <count>', 'Number of hotspots to print', '20')
    .option('--json', 'Print the full snapshot as JSON')
    .option('--no-save', 'Do not persist snapshot and history')
    .action(async (options: { paths: string; top: string; json?: boolean; save: boolean }) => {
      const { config, repository } = dependencies();
      const policy = await repository.loadPolicy();
      const analyzer = new ArchitectureAnalyzer(config.rootPath, policy);
      const paths = options.paths.split(',').map((path) => path.trim()).filter(Boolean);
      const snapshot = await analyzer.scan(paths);
      if (options.save) await repository.saveSnapshot(snapshot);

      if (options.json) {
        console.log(JSON.stringify(snapshot, null, 2));
        return;
      }

      printSummary(snapshot);
      const top = Math.max(1, Number.parseInt(options.top, 10) || 20);
      const hotspots = snapshot.modules
        .filter((module) => module.status !== 'healthy')
        .slice(0, top);
      if (!hotspots.length) {
        console.log('  No architecture pressure detected.');
        console.log('');
        return;
      }
      console.log('  Hotspots');
      console.log('  --------');
      hotspots.forEach((module) => printModule(module, repository.candidateId(module.path)));
      console.log('  Inspect: sovei architecture inspect <path-or-ARC-id>');
      console.log('  Accept:  sovei architecture accept <path-or-ARC-id> --reason "..."');
      console.log('');
    });

  architecture
    .command('status')
    .description('Show the latest architecture snapshot and debt register')
    .option('--top <count>', 'Number of hotspots to print', '20')
    .action(async (options: { top: string }) => {
      const { repository } = dependencies();
      const snapshot = await repository.loadSnapshot();
      if (!snapshot) throw new Error('No architecture snapshot. Run architecture scan first.');
      const debt = await repository.loadDebt();
      const debtByPath = new Map(debt.map((entry) => [entry.modulePath, entry]));
      printSummary(snapshot);
      const top = Math.max(1, Number.parseInt(options.top, 10) || 20);
      snapshot.modules
        .filter((module) => module.status !== 'healthy')
        .slice(0, top)
        .forEach((module) => {
          printModule(module, repository.candidateId(module.path));
          const entry = debtByPath.get(module.path);
          if (entry) console.log(`    debt=${entry.status} strategy=${entry.strategy}`);
        });

      if (debt.length) printDebt(debt);
    });

  architecture
    .command('inspect')
    .argument('<target>', 'Module path or ARC id')
    .description('Inspect one module and its architecture signals')
    .action(async (target: string) => {
      const { repository } = dependencies();
      const snapshot = await repository.loadSnapshot();
      if (!snapshot) throw new Error('No architecture snapshot. Run architecture scan first.');
      const metric = findMetric(snapshot, repository, target);
      if (!metric) throw new Error(`Architecture module not found: ${target}`);
      printModule(metric, repository.candidateId(metric.path));
      if (metric.longestFunctions.length) {
        console.log('  Longest functions');
        for (const fn of metric.longestFunctions) {
          console.log(`    ${fn.name}: lines ${fn.startLine}-${fn.endLine} (${fn.lines})`);
        }
        console.log('');
      }
      if (metric.dependencies.length) {
        console.log('  Internal dependencies');
        metric.dependencies.forEach((dependency) => console.log(`    ${dependency}`));
        console.log('');
      }
    });

  architecture
    .command('accept')
    .argument('<target>', 'Module path or ARC id')
    .requiredOption('--reason <reason>', 'Why this debt should be governed')
    .option(
      '--strategy <strategy>',
      'extract-module | branch-by-abstraction | expand-migrate-contract | stabilize-with-tests',
    )
    .description('Accept a hotspot into the architecture debt register')
    .action(async (
      target: string,
      options: { reason: string; strategy?: RefactoringStrategy },
    ) => {
      const { repository } = dependencies();
      const snapshot = await repository.loadSnapshot();
      if (!snapshot) throw new Error('No architecture snapshot. Run architecture scan first.');
      const metric = findMetric(snapshot, repository, target);
      if (!metric) throw new Error(`Architecture module not found: ${target}`);
      const entry = await repository.accept(metric, options.reason, options.strategy);
      console.log('');
      console.log(`  Accepted ${entry.id}: ${entry.modulePath}`);
      console.log(`  Strategy: ${entry.strategy}`);
      console.log('  This records debt; it does not perform an automatic rewrite.');
      console.log('');
    });

  architecture
    .command('dismiss')
    .argument('<target>', 'Module path or ARC id')
    .requiredOption('--reason <reason>', 'Why this signal is acceptable or irrelevant')
    .description('Dismiss a hotspot while preserving the decision')
    .action(async (target: string, options: { reason: string }) => {
      const { repository } = dependencies();
      const snapshot = await repository.loadSnapshot();
      if (!snapshot) throw new Error('No architecture snapshot. Run architecture scan first.');
      const metric = findMetric(snapshot, repository, target);
      if (!metric) throw new Error(`Architecture module not found: ${target}`);
      const entry = await repository.dismiss(metric, options.reason);
      console.log(`\n  Dismissed ${entry.id}: ${entry.reason}\n`);
    });

  architecture
    .command('check')
    .description('CI-friendly architecture fitness check against current source')
    .option('--fail-on <level>', 'candidate | required', 'required')
    .option('--paths <paths>', 'Comma-separated paths to scan', 'src')
    .option('--update-snapshot', 'Persist the fresh CI snapshot and history')
    .action(async (options: { failOn: 'candidate' | 'required'; paths: string; updateSnapshot?: boolean }) => {
      if (!['candidate', 'required'].includes(options.failOn)) {
        throw new Error("--fail-on must be 'candidate' or 'required'");
      }
      const { config, repository } = dependencies();
      const policy = await repository.loadPolicy();
      const analyzer = new ArchitectureAnalyzer(config.rootPath, policy);
      const paths = options.paths.split(',').map((path) => path.trim()).filter(Boolean);
      const snapshot = await analyzer.scan(paths);
      if (options.updateSnapshot) await repository.saveSnapshot(snapshot);
      const failures = snapshot.modules.filter((module) =>
        options.failOn === 'candidate'
          ? module.status === 'refactor-candidate' || module.status === 'refactor-required'
          : module.status === 'refactor-required',
      );
      if (!failures.length) {
        console.log('\n  Architecture fitness check passed.\n');
        return;
      }
      failures.forEach((module) => printModule(module, repository.candidateId(module.path)));
      console.error(`  Architecture fitness check failed: ${failures.length} module(s).`);
      process.exitCode = 2;
    });
}

function printDebt(entries: ArchitectureDebtEntry[]): void {
  console.log('  Debt register');
  console.log('  -------------');
  for (const entry of entries) {
    console.log(
      `  ${entry.id} [${entry.status}] ${entry.modulePath} strategy=${entry.strategy}`,
    );
  }
  console.log('');
}
