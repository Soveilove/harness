/**
 * Project Scanner
 *
 * For the "existing project onboarding" scenario.
 * Scans a codebase to bootstrap initial knowledge.
 */

import type { StorageBackend } from '../storage/types.js';
import { minimatch } from 'minimatch';
import { parse as parseYaml } from 'yaml';
import { detectTechStack, generateSeeds, seedsToEntries, type DetectedStack } from './tech-stack.js';
import { RedlineScanner, type CandidateRedline } from './redline-scanner.js';
import { BusinessMapScanner, type BusinessMap } from './business-map-scanner.js';
import { parseProjectJson } from './json.js';
import { VERSION } from './version.js';
export type { CandidateRedline };
import type { KnowledgeEntry } from '../knowledge/schemas.js';

export const PROJECT_SCANNER_VERSION = VERSION;

export interface ScanCoverage {
  maxDepth: number;
  maxEntries: number;
  filesDiscovered: number;
  directoriesDiscovered: number;
  /** 因命中过滤规则（构建产物/静态资源/哈希 chunk）被排除、不参与分析的条目数 */
  filteredDiscovered: number;
  truncated: boolean;
  reasons: string[];
}

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
  businessMap: BusinessMap;
  coverage: ScanCoverage;
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
  // 依赖与构建工具
  'node_modules', '.git', '.hg', '.svn', '.yarn', '.pnp', '.pnp.js', '.cache', '.turbo', '.pnpm-store',
  // 构建产物目录
  'dist', 'build', 'out', 'release', 'coverage', '.next', '.nuxt', '.output', '.svelte-kit',
  'target', 'vendor', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache',
  // IDE / 本地环境
  '.vscode', '.idea', '.vs', '.DS_Store', '.env.local',
  // 生成代码目录（自动生成的类型/客户端等，非手写业务源码）
  'generated', '__generated__', 'gen', 'proto-gen', 'generated-code', 'codegen', 'graphql-generated',
]);

/**
 * 命中即整体跳过该目录及其子树（按路径段判断，避免误伤同名的业务目录）。
 * 覆盖：
 *  - 后端框架承载前端构建产物的挂载点：server/views、xxx/views/assets 等
 *  - 前端静态资源根：public/（Vite 默认）、dist 已在 SKIP_DIRS
 * 注意：不能排除 src/views（Vue 业务页面目录）等真实业务目录。
 */
const SKIP_DIR_PATTERNS: RegExp[] = [
  /(?:^|\/)server\/views(?:\/|$)/i,     // Koa/Express 渲染的前端产物
  /(?:^|\/)(?:public|static|assets)\/(?:assets|chunks|images|imgs)(?:\/|$)/i, // 产物资源子目录
];

/** 哈希命名的构建 chunk / 压缩产物：如 index-C6asO8Wa.js、app-abc123.css、vendor.chunk.js */
const BUILD_CHUNK_RE = /(?:^|\/)[\w.-]+(?:[-_])[A-Fa-f0-9]{7,}(?:\.[\w-]+)?\.(?:js|mjs|cjs|css|map|png|jpg|jpeg|gif|webp|svg|woff2?)$/;

/** 静态资源 / 配置文件 / 类型声明产物，不参与业务能力与红线候选 */
const NON_BUSINESS_FILE_RE = /\.(?:map|min\.js|min\.css|css|scss|less|sass|d\.ts|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|otf|pdf|zip|tar|gz|lock|log)$/i;

/**
 * 常见 monorepo 包目录。`discoverPackages` 除了读取 workspace 配置声明外，
 * 也把这些顶层目录作为兜底扫描，保证无 workspace 配置的项目仍能发现包。
 */
const STANDARD_PACKAGE_DIRS = ['packages', 'apps', 'libs', 'modules', 'services', 'components'];

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

  /**
   * @param changedFiles 可选。增量 rescan 时仅重扫这些文件，复用既有候选（需稳定 ID）。
   */
  async scan(maxDepth = 20, maxEntries = 50_000, maxBusinessFiles = 3000, changedFiles?: string[]): Promise<ScanResult> {
    const pkgContent = await this.storage.read('package.json');
    let packageJson: any = null;
    if (pkgContent) {
      try { packageJson = parseProjectJson(pkgContent, 'package.json'); }
      catch { packageJson = null; }
    }

    const tsContent = await this.storage.read('tsconfig.json');
    let tsconfig: any = null;
    if (tsContent) {
      try { tsconfig = parseProjectJson(tsContent, 'tsconfig.json'); }
      catch { tsconfig = null; }
    }

    const coverage: ScanCoverage = {
      maxDepth,
      maxEntries,
      filesDiscovered: 0,
      directoriesDiscovered: 0,
      filteredDiscovered: 0,
      truncated: false,
      reasons: [],
    };
    const directoryMap = await this.scanDirectory('.', 0, coverage);
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
    const candidateRedlines = await redlineScanner.scan(directoryMap, changedFiles);
    const businessMap = await new BusinessMapScanner(this.storage, PROJECT_SCANNER_VERSION)
      .scan(directoryMap, candidateRedlines, coverage, maxBusinessFiles, changedFiles);
    return {
      techStack, projectRoot: '.', packageJson, packages, entryPoints, directoryMap,
      detectedPatterns, generatedKnowledge, candidateRedlines, businessMap, coverage,
    };
  }

  private async scanDirectory(dirPath: string, depth: number, coverage: ScanCoverage): Promise<DirectoryNode[]> {
    if (depth >= coverage.maxDepth || this.totalEntries(coverage) >= coverage.maxEntries) return [];
    const nodes: DirectoryNode[] = [];
    let entries;
    try { entries = await this.storage.listEntries(dirPath); } catch { return []; }

    for (const entry of entries) {
      if (this.totalEntries(coverage) >= coverage.maxEntries) {
        coverage.truncated = true;
        coverage.reasons.push(`目录扫描达到 ${coverage.maxEntries} 个条目上限`);
        break;
      }
      const name = entry.name;
      if (SKIP_DIRS.has(name) || (name.startsWith('.') && name !== '.env' && name !== '.env.example')) continue;
      const fullPath = dirPath === '.' ? name : dirPath + '/' + name;

      // 目录命中产物/生成目录模式 → 整体跳过该子树
      if (entry.isDirectory && SKIP_DIR_PATTERNS.some((p) => p.test(fullPath))) {
        coverage.filteredDiscovered++;
        continue;
      }

      // 文件命中构建产物 / 哈希 chunk / 静态资源 → 排除出分析范围（code-map / 红线 / 能力图都不再污染）
      if (!entry.isDirectory && (BUILD_CHUNK_RE.test(fullPath) || NON_BUSINESS_FILE_RE.test(fullPath))) {
        coverage.filteredDiscovered++;
        continue;
      }

      const note = KEY_FILES[name];
      nodes.push({ path: fullPath, type: entry.isDirectory ? 'dir' : 'file', depth, note });
      if (entry.isDirectory) coverage.directoriesDiscovered++;
      else coverage.filesDiscovered++;
      if (entry.isDirectory && depth < coverage.maxDepth - 1) {
        const children = await this.scanDirectory(fullPath, depth + 1, coverage);
        nodes.push(...children);
      } else if (entry.isDirectory && depth === coverage.maxDepth - 1) {
        coverage.truncated = true;
        coverage.reasons.push(`目录扫描达到深度上限 ${coverage.maxDepth}`);
      }
    }
    coverage.reasons = [...new Set(coverage.reasons)];
    return nodes;
  }

  private totalEntries(coverage: ScanCoverage): number {
    return coverage.filesDiscovered + coverage.directoriesDiscovered;
  }

  private async isDirectory(p: string): Promise<boolean> {
    return this.storage.isDirectory(p);
  }

  private async discoverPackages(directoryMap: DirectoryNode[]): Promise<DiscoveredPackage[]> {
    const globs = await this.collectWorkspaceGlobs();
    const matches = (path: string): boolean => {
      if (globs.some((glob) => minimatch(path, glob))) return true;
      // 兜底：标准包目录下的任意 package.json（支持一层或多层嵌套）
      return STANDARD_PACKAGE_DIRS.some((dir) => {
        const prefix = dir + '/';
        return path.startsWith(prefix) && path.endsWith('/package.json') && path !== dir + '/package.json';
      });
    };
    const manifestPaths = directoryMap
      .filter((node) => node.type === 'file' && node.path.endsWith('/package.json') && matches(node.path))
      .map((node) => node.path)
      .sort();
    const packages: DiscoveredPackage[] = [];

    for (const manifestPath of manifestPaths) {
      const content = await this.storage.read(manifestPath);
      if (!content) continue;
      let manifest: any;
      try { manifest = parseProjectJson(content, manifestPath); }
      catch { manifest = null; }
      if (!manifest) continue;

      const packagePath = manifestPath.slice(0, -'/package.json'.length);
      const tsconfigContent = await this.storage.read(packagePath + '/tsconfig.json');
      let tsconfig: any = null;
      if (tsconfigContent) {
        try { tsconfig = parseProjectJson(tsconfigContent, packagePath + '/tsconfig.json'); }
        catch { tsconfig = null; }
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

  /**
   * 收集 workspace 包 glob 模式，来源按优先级：
   *   1. 根 package.json 的 workspaces 字段（npm/yarn）
   *   2. pnpm-workspace.yaml 的 packages 列表
   *   3. lerna.json 的 packages 列表
   * 每个模式都追加 '/package.json' 以便直接匹配 manifest 路径。
   */
  private async collectWorkspaceGlobs(): Promise<string[]> {
    const globs = new Set<string>();
    const addGlobs = (patterns: unknown): void => {
      if (!Array.isArray(patterns)) return;
      for (const p of patterns) {
        if (typeof p !== 'string' || !p.trim()) continue;
        const normalized = p.replace(/\/+$/, '');
        globs.add(normalized + '/package.json');
      }
    };

    // 1. 根 package.json workspaces
    const rootPkg = await this.storage.read('package.json');
    if (rootPkg) {
      try {
        const parsed = parseProjectJson<{ workspaces?: unknown }>(rootPkg, 'package.json');
        if (parsed?.workspaces) addGlobs(parsed.workspaces);
      } catch { /* ignore malformed root manifest */ }
    }

    // 2. pnpm-workspace.yaml
    try {
      const pnpmWs = await this.storage.read('pnpm-workspace.yaml');
      if (pnpmWs) {
        const parsed = parseYaml(pnpmWs) as { packages?: unknown };
        if (parsed?.packages) addGlobs(parsed.packages);
      }
    } catch { /* ignore */ }

    // 3. lerna.json
    try {
      const lerna = await this.storage.read('lerna.json');
      if (lerna) {
        const parsed = parseProjectJson<{ packages?: unknown }>(lerna, 'lerna.json');
        if (parsed?.packages) addGlobs(parsed.packages);
      }
    } catch { /* ignore */ }

    return [...globs];
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
    // 目录名精确匹配（不命中子串，避免 docs/specs、server/views 等目录误判）
    const hasDir = (name: string) => dirMap.some((n) => n.type === 'dir' && this.lastSegment(n.path) === name);
    const hasPath = (s: string) => dirMap.some((n) => n.path.includes(s));
    if (hasDir('components')) patterns.push('Component-based architecture');
    if (hasDir('store') || hasDir('stores')) patterns.push('Centralized state management');
    if (hasDir('api') || hasDir('services')) patterns.push('Dedicated API/service layer');
    if (hasDir('composables') || hasDir('hooks')) patterns.push('Composables/hooks pattern');
    if (hasDir('utils') || hasDir('lib')) patterns.push('Utility library');
    if (hasDir('types') || hasDir('interfaces')) patterns.push('Dedicated type definitions');
    // 测试套件：仅当存在真实测试目录（含 _test 文件或专测目录）才算，specs/ 文档目录不算
    const hasTestFiles = dirMap.some((n) => n.type === 'file' && /(?:\.(?:test|spec)\.|\.test-|_test\.)[cm]?[jt]sx?$/i.test(n.path));
    if (hasTestFiles || hasDir('__tests__') || hasDir('test') || hasDir('tests')) patterns.push('Test suite present');
    if (hasDir('views') || hasDir('pages')) patterns.push('View/page-based routing');
    if (dirMap.some((n) => n.type === 'dir' && n.path === 'packages')) patterns.push('Monorepo structure');
    return patterns;
  }

  private lastSegment(path: string): string {
    return path.split('/').pop() || path;
  }
}
