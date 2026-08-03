import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { classifyArchitectureHealth } from './policy.js';
import type {
  ArchitecturePolicy,
  ArchitectureSignal,
  ArchitectureSnapshot,
  FunctionMetric,
  ModuleMetric,
} from './types.js';

const execFileAsync = promisify(execFile);

interface RawModule {
  absolutePath: string;
  relativePath: string;
  content: string;
  lines: string[];
  dependencies: string[];
  functions: FunctionMetric[];
  branchCount: number;
  responsibilityCount: number;
}

export class ArchitectureAnalyzer {
  constructor(
    private readonly rootPath: string,
    private readonly policy: ArchitecturePolicy,
  ) {}

  async scan(paths: string[] = ['src']): Promise<ArchitectureSnapshot> {
    const files = await this.collectFiles(paths);
    const churn = await this.readGitChurn();
    const rawModules = await Promise.all(files.map((file) => this.readModule(file)));
    const modulePaths = new Set(rawModules.map((module) => module.relativePath));

    for (const module of rawModules) {
      module.dependencies = module.dependencies
        .map((dependency) => this.resolveDependency(module.relativePath, dependency, modulePaths))
        .filter((dependency): dependency is string => Boolean(dependency));
    }

    const fanIn = this.calculateFanIn(rawModules);
    const cycles = this.findCycles(rawModules);
    const modules = rawModules.map((module) =>
      this.toMetric(
        module,
        fanIn.get(module.relativePath) ?? 0,
        churn.get(module.relativePath) ?? 0,
        cycles.get(module.relativePath) ?? [],
      ),
    );

    modules.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));

    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      rootPath: this.rootPath,
      policyVersion: this.policy.version,
      summary: {
        healthy: modules.filter((module) => module.status === 'healthy').length,
        watch: modules.filter((module) => module.status === 'watch').length,
        refactorCandidate: modules.filter((module) => module.status === 'refactor-candidate').length,
        refactorRequired: modules.filter((module) => module.status === 'refactor-required').length,
        totalModules: modules.length,
      },
      modules,
    };
  }

  private async collectFiles(paths: string[]): Promise<string[]> {
    const results: string[] = [];
    for (const inputPath of paths) {
      await this.walk(resolve(this.rootPath, inputPath), results);
    }
    return [...new Set(results)].sort();
  }

  private async walk(directory: string, results: string[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      if (this.shouldInclude(directory)) results.push(directory);
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && this.policy.excludeDirectories.includes(entry.name)) continue;
      const absolutePath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await this.walk(absolutePath, results);
      } else if (this.shouldInclude(absolutePath)) {
        results.push(absolutePath);
      }
    }
  }

  private shouldInclude(absolutePath: string): boolean {
    const normalized = this.normalizePath(relative(this.rootPath, absolutePath));
    if (!this.policy.includeExtensions.includes(extname(absolutePath))) return false;
    return !this.policy.excludePatterns.some((pattern) => normalized.includes(pattern));
  }

  private async readModule(absolutePath: string): Promise<RawModule> {
    const content = await readFile(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);
    return {
      absolutePath,
      relativePath: this.normalizePath(relative(this.rootPath, absolutePath)),
      content,
      lines,
      dependencies: this.extractImports(content),
      functions: this.extractFunctions(lines),
      branchCount: this.countBranches(content),
      responsibilityCount: this.countResponsibilities(content),
    };
  }

  private extractImports(content: string): string[] {
    const dependencies = new Set<string>();
    const patterns = [
      /(?:import|export)\s+(?:[^'\"]+?\s+from\s+)?['\"]([^'\"]+)['\"]/g,
      /require\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
      /import\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
    ];
    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern)) dependencies.add(match[1]);
    }
    return [...dependencies];
  }

  private resolveDependency(
    importer: string,
    dependency: string,
    modulePaths: Set<string>,
  ): string | null {
    if (!dependency.startsWith('.')) return null;
    const importerDirectory = importer.includes('/')
      ? importer.slice(0, importer.lastIndexOf('/'))
      : '';
    const absoluteBase = resolve(this.rootPath, importerDirectory, dependency);
    const relativeBase = this.normalizePath(relative(this.rootPath, absoluteBase));
    const sourceBase = relativeBase.replace(/\.(?:mjs|cjs|js)$/, '');
    const candidates = [
      relativeBase,
      ...this.policy.includeExtensions.map((extension) => `${relativeBase}${extension}`),
      ...this.policy.includeExtensions.map((extension) => `${relativeBase}/index${extension}`),
      ...this.policy.includeExtensions.map((extension) => `${sourceBase}${extension}`),
      ...this.policy.includeExtensions.map((extension) => `${sourceBase}/index${extension}`),
    ];
    return candidates.find((candidate) => modulePaths.has(candidate)) ?? null;
  }

  private extractFunctions(lines: string[]): FunctionMetric[] {
    const functions: FunctionMetric[] = [];
    const functionPattern =
      /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{)/;

    for (let index = 0; index < lines.length; index++) {
      const match = lines[index].match(functionPattern);
      if (!match || !lines[index].includes('{')) continue;
      let balance = 0;
      let seenOpening = false;
      let endLine = index;
      for (let cursor = index; cursor < lines.length; cursor++) {
        const sanitized = lines[cursor].replace(/(['\"`])(?:\\.|(?!\1).)*\1/g, '');
        const opens = (sanitized.match(/\{/g) ?? []).length;
        const closes = (sanitized.match(/\}/g) ?? []).length;
        if (opens > 0) seenOpening = true;
        balance += opens - closes;
        endLine = cursor;
        if (seenOpening && balance <= 0) break;
      }
      const functionMetric = {
        name: match[1] ?? match[2] ?? match[3] ?? '<anonymous>',
        startLine: index + 1,
        endLine: endLine + 1,
        lines: endLine - index + 1,
      };
      functions.push(functionMetric);
      if (endLine > index) index = endLine;
    }
    return functions.sort((left, right) => right.lines - left.lines);
  }

  private countBranches(content: string): number {
    const code = this.stripNonCode(content);
    return (
      code.match(/\b(?:if|else\s+if|for|while|case|catch)\b|\?\?|&&|\|\||\?(?=[^.:])/g) ?? []
    ).length;
  }

  private countResponsibilities(content: string): number {
    const code = this.stripNonCode(content);
    const markers = [
      /<template[\s>]|\b(?:render|jsx|tsx)\b/i,
      /<style[\s>]|\b(?:css|scss|less)\b/i,
      /\b(?:fetch|axios|request|useFetch|\$fetch)\b/i,
      /\b(?:store|pinia|redux|zustand|useState)\b/i,
      /\b(?:router|route|navigate|redirect)\b/i,
      /\b(?:watch|subscribe|addEventListener|onMounted|useEffect)\b/i,
      /\b(?:validate|schema|zod|yup|validator)\b/i,
      /\b(?:localStorage|sessionStorage|indexedDB|cookie)\b/i,
    ];
    return markers.filter((marker) => marker.test(code)).length;
  }

  private stripNonCode(content: string): string {
    return content
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ')
      .replace(/(['\"`])(?:\\.|(?!\1)[\s\S])*?\1/g, ' ')
      .replace(/\/(?![/*])(?:\\.|[^/\r\n])+\/[dgimsuvy]*/g, ' ');
  }

  private calculateFanIn(modules: RawModule[]): Map<string, number> {
    const fanIn = new Map<string, number>();
    for (const module of modules) {
      for (const dependency of module.dependencies) {
        fanIn.set(dependency, (fanIn.get(dependency) ?? 0) + 1);
      }
    }
    return fanIn;
  }

  private findCycles(modules: RawModule[]): Map<string, string[]> {
    const graph = new Map(modules.map((module) => [module.relativePath, module.dependencies]));
    const cycles = new Map<string, Set<string>>();
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const stack: string[] = [];

    const visit = (node: string): void => {
      if (visiting.has(node)) {
        const start = stack.indexOf(node);
        const cycle = stack.slice(start);
        for (const member of cycle) {
          const existing = cycles.get(member) ?? new Set<string>();
          cycle.filter((candidate) => candidate !== member).forEach((candidate) => existing.add(candidate));
          cycles.set(member, existing);
        }
        return;
      }
      if (visited.has(node)) return;
      visiting.add(node);
      stack.push(node);
      for (const dependency of graph.get(node) ?? []) visit(dependency);
      stack.pop();
      visiting.delete(node);
      visited.add(node);
    };

    for (const node of graph.keys()) visit(node);
    return new Map([...cycles].map(([node, members]) => [node, [...members].sort()]));
  }

  private toMetric(
    module: RawModule,
    fanIn: number,
    churn90Days: number,
    cycleMembers: string[],
  ): ModuleMetric {
    const lines = module.lines.length;
    const codeLines = module.lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*');
    }).length;
    const maxFunctionLines = module.functions[0]?.lines ?? 0;
    const branchesPerHundredLines = codeLines ? (module.branchCount / codeLines) * 100 : 0;
    const signals: ArchitectureSignal[] = [];
    const thresholds = this.policy.thresholds;

    this.addThresholdSignal(signals, 'large-file', lines, thresholds.fileLinesWarning,
      thresholds.fileLinesCritical, `File has ${lines} lines`);
    this.addThresholdSignal(signals, 'long-function', maxFunctionLines,
      thresholds.functionLinesWarning, thresholds.functionLinesCritical,
      `Longest function has ${maxFunctionLines} lines`);
    this.addThresholdSignal(signals, 'high-complexity', branchesPerHundredLines,
      thresholds.branchesPerHundredLinesWarning, thresholds.branchesPerHundredLinesCritical,
      `${branchesPerHundredLines.toFixed(1)} branches per 100 code lines`);
    this.addThresholdSignal(signals, 'high-churn', churn90Days,
      thresholds.churn90DaysWarning, thresholds.churn90DaysCritical,
      `${churn90Days} commits touched this file in 90 days`);
    this.addThresholdSignal(signals, 'high-fan-in', fanIn, thresholds.fanInWarning,
      thresholds.fanInCritical, `${fanIn} modules depend on this file`);
    this.addThresholdSignal(signals, 'high-fan-out', module.dependencies.length,
      thresholds.fanOutWarning, thresholds.fanOutCritical,
      `File depends on ${module.dependencies.length} internal modules`);
    this.addThresholdSignal(signals, 'mixed-responsibilities', module.responsibilityCount,
      thresholds.responsibilitiesWarning, thresholds.responsibilitiesCritical,
      `${module.responsibilityCount} responsibility categories detected`);
    if (cycleMembers.length) {
      signals.push({
        kind: 'cyclic-dependency',
        severity: 'critical',
        value: cycleMembers.length + 1,
        threshold: 1,
        message: `Dependency cycle with ${cycleMembers.join(', ')}`,
      });
    }

    const score = Math.min(100, signals.reduce((total, signal) => {
      const weight = signal.severity === 'critical' ? 20 : signal.severity === 'warning' ? 12 : 5;
      return total + weight;
    }, 0));

    return {
      path: module.relativePath,
      language: extname(module.relativePath).slice(1),
      lines,
      codeLines,
      branchCount: module.branchCount,
      maxFunctionLines,
      longestFunctions: module.functions.slice(0, 5),
      fanIn,
      fanOut: module.dependencies.length,
      churn90Days,
      responsibilityCount: module.responsibilityCount,
      dependencies: module.dependencies,
      cycleMembers,
      score,
      status: classifyArchitectureHealth(score, signals, this.policy),
      signals,
    };
  }

  private addThresholdSignal(
    signals: ArchitectureSignal[],
    kind: ArchitectureSignal['kind'],
    value: number,
    warning: number,
    critical: number,
    message: string,
  ): void {
    if (value < warning) return;
    signals.push({
      kind,
      severity: value >= critical ? 'critical' : 'warning',
      value,
      threshold: value >= critical ? critical : warning,
      message,
    });
  }

  private async readGitChurn(): Promise<Map<string, number>> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['log', '--since=90 days ago', '--name-only', '--pretty=format:'],
        { cwd: this.rootPath, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      );
      const churn = new Map<string, number>();
      for (const line of stdout.split(/\r?\n/)) {
        const path = this.normalizePath(line.trim());
        if (!path) continue;
        churn.set(path, (churn.get(path) ?? 0) + 1);
      }
      return churn;
    } catch {
      return new Map();
    }
  }

  private normalizePath(path: string): string {
    return path.split(sep).join('/');
  }
}
