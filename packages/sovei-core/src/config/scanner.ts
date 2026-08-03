/**
 * Project Scanner
 *
 * For the "existing project onboarding" scenario.
 * Scans a codebase to bootstrap initial knowledge.
 */

import type { StorageBackend } from '../storage/types.js';
import { detectTechStack, generateSeeds, seedsToEntries, type DetectedStack } from './tech-stack.js';
import { RedlineScanner, type CandidateRedline } from './redline-scanner.js';
export type { CandidateRedline };
import type { KnowledgeEntry } from '../knowledge/schemas.js';

export interface ScanResult {
  techStack: DetectedStack;
  projectRoot: string;
  packageJson: any | null;
  packages: DiscoveredPackage[];
  entryPoints: string[];
  directoryMap: DirectoryNode[];
  detectedPatterns: string[];
  generatedKnowledge: Omit<KnowledgeEntry, 'id'>[];
  candidateRedlines: CandidateRedline[];
}

export interface DiscoveredPackage {
  path: string;
  name: string | null;
  techStack: DetectedStack;
  entryPoints: string[];
}

export interface DirectoryNode {
  path: string;
  type: 'dir' | 'file';
  depth: number;
  note?: string;
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  '.cache', '.turbo', 'coverage', '.vscode', '.idea',
  '__pycache__', '.pytest_cache', 'vendor', 'target',
]);

const KEY_FILES: Record<string, string> = {
  'package.json': 'Node.js package manifest',
  'tsconfig.json': 'TypeScript configuration',
  'vite.config.ts': 'Vite build configuration',
  'vite.config.js': 'Vite build configuration',
  'nuxt.config.ts': 'Nuxt framework configuration',
  'nuxt.config.js': 'Nuxt framework configuration',
  'next.config.js': 'Next.js configuration',
  'next.config.mjs': 'Next.js configuration',
  '.env': 'Environment variables',
  '.env.example': 'Environment variable template',
  'Dockerfile': 'Docker container build',
  'docker-compose.yml': 'Docker Compose orchestration',
  'README.md': 'Project documentation',
};

export class ProjectScanner {
  constructor(private storage: StorageBackend) {}

  async scan(maxDepth = 4): Promise<ScanResult> {
    const pkgContent = await this.storage.read('package.json');
    let packageJson: any = null;
    if (pkgContent) {
      try { packageJson = JSON.parse(pkgContent); }
      catch { packageJson = this.looseParse(pkgContent); }
    }

    const tsContent = await this.storage.read('tsconfig.json');
    let tsconfig: any = null;
    if (tsContent) {
      try { tsconfig = JSON.parse(tsContent); }
      catch { tsconfig = this.looseParse(tsContent); }
    }

    const directoryMap = await this.scanDirectory('.', 0, maxDepth);
    const packages = await this.discoverPackages(directoryMap);
    const techStack = this.mergeTechStacks([
      detectTechStack(packageJson, tsconfig),
      ...packages.map((pkg) => pkg.techStack),
    ]);
    const entryPoints = [...new Set([
      ...this.findEntryPoints(packageJson, directoryMap),
      ...packages.flatMap((pkg) => pkg.entryPoints),
    ])].sort();
    const detectedPatterns = this.detectPatterns(directoryMap, techStack);

    const seeds = generateSeeds(techStack);
    const generatedKnowledge = seedsToEntries(seeds);

    // Add code-map knowledge
    const now = new Date().toISOString();
    const codeMapLines: string[] = ['# 自动生成的代码地图', '', '> 由 sovei project onboard 生成。', '', '## 技术栈', ''];
    for (const [key, value] of Object.entries(techStack)) {
      if (value) codeMapLines.push('- **' + key + '**: ' + value);
    }
    codeMapLines.push('', '## 软件包', '');
    if (packages.length === 0) codeMapLines.push('- （无）');
    for (const pkg of packages) {
      codeMapLines.push('- ' + pkg.path + (pkg.name ? ' (`' + pkg.name + '`)' : ''));
      for (const entry of pkg.entryPoints) codeMapLines.push('  - 入口：' + entry);
    }
    codeMapLines.push('', '## 入口', '');
    for (const entry of entryPoints) codeMapLines.push('- ' + entry);
    codeMapLines.push('', '## 目录结构', '');
    for (const node of directoryMap) {
      const indent = '  '.repeat(node.depth);
      const note = node.note ? '  // ' + node.note : '';
      codeMapLines.push(indent + (node.type === 'dir' ? '[D] ' : '[F] ') + node.path.split('/').pop() + note);
    }

    generatedKnowledge.push({
      type: 'code-map',
      title: 'Project Code Map',
      content: codeMapLines.join('\n'),
      lifecycle: 'candidate',
      evidence: [{ feature: 'project-onboard', date: now, description: 'Auto-generated from scan', verified: false }],
      tags: ['code-map', 'auto-generated'],
      scope: 'project',
      createdAt: now, updatedAt: now, promotedAt: null, deprecatedReason: null,
    });

    // Add architecture knowledge
    if (detectedPatterns.length > 0) {
      const archLines: string[] = ['# 自动检测的架构', '', '> 由 sovei project onboard 生成。', ''];
      if (packageJson?.name) archLines.push('## 项目：' + packageJson.name, '');
      archLines.push('## 检测到的模式', '');
      for (const p of detectedPatterns) archLines.push('- ' + p);
      archLines.push('', '## 入口', '');
      for (const e of entryPoints) archLines.push('- ' + e);

      generatedKnowledge.push({
        type: 'architecture',
        title: 'Detected Project Architecture',
        content: archLines.join('\n'),
        lifecycle: 'candidate',
        evidence: [{ feature: 'project-onboard', date: now, description: 'Auto-detected from scan', verified: false }],
        tags: ['architecture', 'auto-detected'],
        scope: 'project',
        createdAt: now, updatedAt: now, promotedAt: null, deprecatedReason: null,
      });
    }


    // Multi-source redline scan: governance docs, spec files, code surfaces
    const redlineScanner = new RedlineScanner(this.storage);
    const candidateRedlines = await redlineScanner.scan(directoryMap);
    return { techStack, projectRoot: '.', packageJson, packages, entryPoints, directoryMap, detectedPatterns, generatedKnowledge, candidateRedlines };
  }

  private async scanDirectory(dirPath: string, depth: number, maxDepth: number): Promise<DirectoryNode[]> {
    if (depth >= maxDepth) return [];
    const nodes: DirectoryNode[] = [];
    let entries;
    try { entries = await this.storage.listEntries(dirPath); } catch { return []; }

    for (const entry of entries) {
      const name = entry.name;
      if (SKIP_DIRS.has(name) || (name.startsWith('.') && name !== '.env' && name !== '.env.example')) continue;
      const fullPath = dirPath === '.' ? name : dirPath + '/' + name;
      const note = KEY_FILES[name];
      nodes.push({ path: fullPath, type: entry.isDirectory ? 'dir' : 'file', depth, note });
      if (entry.isDirectory && depth < maxDepth - 1) {
        const children = await this.scanDirectory(fullPath, depth + 1, maxDepth);
        nodes.push(...children);
      }
    }
    return nodes;
  }

  /** Best-effort JSON parse that strips comments and trailing commas */
  private looseParse(content: string): any {
    try {
      // Strip single-line comments
      const cleaned = content
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleaned);
    } catch { return null; }
  }

  private async isDirectory(p: string): Promise<boolean> {
    return this.storage.isDirectory(p);
  }

  private async discoverPackages(directoryMap: DirectoryNode[]): Promise<DiscoveredPackage[]> {
    const manifestPaths = directoryMap
      .filter((node) => node.type === 'file' && /^packages\/[^/]+\/package\.json$/.test(node.path))
      .map((node) => node.path)
      .sort();
    const packages: DiscoveredPackage[] = [];

    for (const manifestPath of manifestPaths) {
      const content = await this.storage.read(manifestPath);
      if (!content) continue;
      let manifest: any;
      try { manifest = JSON.parse(content); }
      catch { manifest = this.looseParse(content); }
      if (!manifest) continue;

      const packagePath = manifestPath.slice(0, -'/package.json'.length);
      const tsconfigContent = await this.storage.read(packagePath + '/tsconfig.json');
      let tsconfig: any = null;
      if (tsconfigContent) {
        try { tsconfig = JSON.parse(tsconfigContent); }
        catch { tsconfig = this.looseParse(tsconfigContent); }
      }

      packages.push({
        path: packagePath,
        name: typeof manifest.name === 'string' ? manifest.name : null,
        techStack: detectTechStack(manifest, tsconfig),
        entryPoints: this.findPackageEntryPoints(packagePath, manifest, directoryMap),
      });
    }

    return packages;
  }

  private mergeTechStacks(stacks: DetectedStack[]): DetectedStack {
    const result: DetectedStack = {};
    const keys: (keyof DetectedStack)[] = ['framework', 'language', 'state', 'build', 'packageManager', 'testRunner'];
    for (const key of keys) {
      const values = [...new Set(stacks.map((stack) => stack[key]).filter((value): value is string => Boolean(value)))].sort();
      if (values.length) result[key] = values.join(', ');
    }
    return result;
  }

  private findPackageEntryPoints(packagePath: string, packageJson: any, dirMap: DirectoryNode[]): string[] {
    const entries = this.findDeclaredEntryPoints(packageJson)
      .map((entry) => packagePath + '/' + entry.replace(/^\.\//, ''));
    const common = ['src/main.ts', 'src/main.js', 'src/index.ts', 'src/index.js'];
    for (const entry of common) {
      const qualified = packagePath + '/' + entry;
      if (dirMap.some((node) => node.path === qualified)) entries.push(qualified);
    }
    return [...new Set(entries)].sort();
  }

  private findDeclaredEntryPoints(packageJson: any): string[] {
    const entries: string[] = [];
    if (typeof packageJson?.main === 'string') entries.push(packageJson.main);
    if (typeof packageJson?.module === 'string') entries.push(packageJson.module);
    if (typeof packageJson?.bin === 'string') entries.push(packageJson.bin);
    if (packageJson?.bin && typeof packageJson.bin === 'object') {
      for (const value of Object.values(packageJson.bin)) {
        if (typeof value === 'string') entries.push(value);
      }
    }
    return entries;
  }

  private findEntryPoints(packageJson: any, dirMap: DirectoryNode[]): string[] {
    const entries = this.findDeclaredEntryPoints(packageJson);
    const common = ['src/main.ts', 'src/main.js', 'src/index.ts', 'src/index.js', 'src/app.ts', 'src/app.js', 'app.ts', 'app.js', 'src/main.vue', 'src/App.vue', 'pages/index.vue'];
    for (const e of common) { if (dirMap.some((n) => n.path === e)) entries.push(e); }
    if (dirMap.some((n) => n.path === 'pages' || n.path === 'app/pages')) entries.push('pages/ (file-based routing)');
    return [...new Set(entries)].sort();
  }

  private detectPatterns(dirMap: DirectoryNode[], stack: DetectedStack): string[] {
    const patterns: string[] = [];
    const has = (s: string) => dirMap.some((n) => n.path.includes(s));
    if (has('components')) patterns.push('Component-based architecture');
    if (has('store') || has('stores')) patterns.push('Centralized state management');
    if (has('api') || has('services')) patterns.push('Dedicated API/service layer');
    if (has('composables') || has('hooks')) patterns.push('Composables/hooks pattern');
    if (has('utils') || has('lib')) patterns.push('Utility library');
    if (has('types') || has('interfaces')) patterns.push('Dedicated type definitions');
    if (has('test') || has('__tests__') || has('spec')) patterns.push('Test suite present');
    if (has('views') || has('pages')) patterns.push('View/page-based routing');
    if (dirMap.some((n) => n.path === 'packages' && n.type === 'dir')) patterns.push('Monorepo structure');
    return patterns;
  }
}
