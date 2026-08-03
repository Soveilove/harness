/**
 * Multi-source Business Redline Scanner
 *
 * Three discovery sources with different confidence levels:
 * 1. Governance docs (high) - AGENTS.md, governance/, README constraint sections
 * 2. Spec files (high) - specs/ acceptance criteria, .cursorrules, CLAUDE.md
 * 3. Code surfaces (medium) - directory patterns + code-level guards
 *
 * For old projects without specs, code surfaces are the primary source.
 */

import type { StorageBackend } from '../storage/types.js';
import type { DirectoryNode } from './scanner.js';

export type RedlineCategory =
  | 'authentication'
  | 'billing'
  | 'permission'
  | 'data-integrity'
  | 'api-contract'
  | 'compliance'
  | 'general';

export type RedlineConfidence = 'high' | 'medium' | 'low';

export interface CandidateRedline {
  id: string;
  title: string;
  rule: string;
  enforcement: 'absolute' | 'approval-required';
  source: string;
  category: RedlineCategory;
  confidence: RedlineConfidence;
}

const SURFACE_KEYWORDS: Record<RedlineCategory, string[]> = {
  authentication: ['auth', 'login', 'session', 'token', 'jwt', 'passport', 'guard', 'credential'],
  billing: ['billing', 'payment', 'subscription', 'order', 'refund', 'charge', 'invoice', 'checkout', 'pay'],
  permission: ['permission', 'role', 'admin', 'access', 'authorize', 'rbac', 'acl'],
  'data-integrity': ['migration', 'schema', 'database', 'model', 'entity', 'repository'],
  'api-contract': ['api', 'route', 'controller', 'endpoint', 'middleware', 'interceptor'],
  compliance: ['audit', 'log', 'privacy', 'gdpr', 'consent', 'encrypt', 'sanitize'],
  general: [],
};

interface CodePattern {
  regex: RegExp;
  category: RedlineCategory;
  title: string;
  rule: string;
  enforcement: 'absolute' | 'approval-required';
}

const CODE_PATTERNS: CodePattern[] = [
  {
    regex: /(?:router\.beforeEach|beforeRouteEnter|@UseGuards|@RequiresAuth|@Authenticated|middleware:\s*\[?auth)/i,
    category: 'authentication',
    title: 'Authentication guard detected',
    rule: 'Routes protected by authentication guards must not be bypassed',
    enforcement: 'absolute',
  },
  {
    regex: /(?:if\s*\(\s*!?(?:req\.)?(?:user|session|isAuthenticated|isLoggedIn))/i,
    category: 'authentication',
    title: 'Manual authentication check detected',
    rule: 'All sensitive operations must verify authenticated identity',
    enforcement: 'absolute',
  },
  {
    regex: /(?:@Transactional|transaction\.commit|transaction\.rollback|START\s+TRANSACTION)/i,
    category: 'billing',
    title: 'Transactional billing operation detected',
    rule: 'Billing mutations must use database transactions with rollback',
    enforcement: 'approval-required',
  },
  {
    regex: /(?:charge|refund|subscription|renewal|invoice)/i,
    category: 'billing',
    title: 'Billing surface detected',
    rule: 'Billing logic changes require business approval',
    enforcement: 'approval-required',
  },
  {
    regex: /(?:@Roles|@RequirePermission|@Authorize|can\(|authorize\(|hasPermission)/i,
    category: 'permission',
    title: 'Permission check detected',
    rule: 'Permission-protected actions must preserve their authorization requirements',
    enforcement: 'absolute',
  },
  {
    regex: /(?:NOT\s+NULL|FOREIGN\s+KEY|UNIQUE\s+CONSTRAINT|@PrimaryGeneratedColumn)/i,
    category: 'data-integrity',
    title: 'Database integrity constraint detected',
    rule: 'Database integrity constraints must not be weakened without migration',
    enforcement: 'absolute',
  },
  {
    regex: /(?:rateLimit|throttle|@Throttle|quota|RateLimiter)/i,
    category: 'api-contract',
    title: 'Rate limiting detected',
    rule: 'API rate limits must not be removed or weakened without load testing',
    enforcement: 'approval-required',
  },
];

const DOC_CONSTRAINT_PATTERNS = [
  /(?:^|\n)##\s+(?:Constraints|Redlines|Business Rules)/i,
  /(?:^|\n)###\s+(?:Constraints|Redlines|Business Rules)/i,
];

const DOC_LINE_PATTERNS = [
  /(?:禁止|不许|不能修改|必须|红线|绝对不|永远不)/,
  /(?:never\s+allow|must\s+not|forbidden|DO\s+NOT|business\s+rule|constraint)/i,
];

export class RedlineScanner {
  constructor(private storage: StorageBackend) {}

  async scan(directoryMap: DirectoryNode[]): Promise<CandidateRedline[]> {
    const candidates: CandidateRedline[] = [];
    const seen = new Set<string>();

    const add = (rl: Omit<CandidateRedline, "id">) => {
      const id = this.makeId(rl.category, rl.title);
      if (seen.has(id)) return;
      seen.add(id);
      candidates.push({ ...rl, id });
    };

    await this.scanGovernanceDocs(add);
    await this.scanSpecFiles(add);
    await this.scanCodeSurfaces(directoryMap, add);

    return candidates.sort((a, b) => {
      const byConfidence: Record<RedlineConfidence, number> = { high: 0, medium: 1, low: 2 };
      const diff = byConfidence[a.confidence] - byConfidence[b.confidence];
      if (diff !== 0) return diff;
      return a.category.localeCompare(b.category);
    });
  }

  // ── Source 1: Governance docs ──

  private async scanGovernanceDocs(
    add: (rl: Omit<CandidateRedline, "id">) => void,
  ): Promise<void> {
    const targets = [
      { path: 'AGENTS.md', weight: 'high' as const },
      { path: 'harness/project/governance', weight: 'high' as const },
      { path: 'README.md', weight: 'medium' as const },
    ];

    for (const target of targets) {
      try {
        const isDir = await this.storage.isDirectory(target.path);
        if (isDir) {
          const files = await this.storage.list(target.path);
          for (const file of files) {
            if (!/\.(md|json|txt)$/i.test(file)) continue;
            const c = await this.storage.read(target.path + '/' + file);
            if (c) await this.extractDocConstraints(c, target.path + "/" + file, target.weight, add);
          }
          continue;
        }
        const content = await this.storage.read(target.path);
        if (content) await this.extractDocConstraints(content, target.path, target.weight, add);
      } catch { /* skip */ }
    }
  }

  private async extractDocConstraints(
    content: string,
    sourcePath: string,
    confidence: RedlineConfidence,
    add: (rl: Omit<CandidateRedline, "id">) => void,
  ): Promise<void> {
    const lines = content.split(/\r?\n/);
    let inConstraintSection = false;
    let sectionEnd = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (DOC_CONSTRAINT_PATTERNS.some((p) => p.test(line))) {
        inConstraintSection = true;
        sectionEnd = i + 50;
        continue;
      }

      if (inConstraintSection && (i > sectionEnd || /^##\s/.test(line))) {
        inConstraintSection = false;
      }

      if (!inConstraintSection) continue;

      const clean = line.replace(/^[\/\s*#>-]+/, '').trim();
      if (clean.length < 8 || clean.length > 200) continue;
      if (clean.startsWith('|') || clean.startsWith('```')) continue;

      if (DOC_LINE_PATTERNS.some((p) => p.test(clean))) {
        add({
          title: clean.slice(0, 60),
          rule: clean,
          enforcement: 'absolute',
          source: sourcePath + ':' + (i + 1),
          category: this.categorizeByText(clean),
          confidence,
        });
      }
    }
  }

  // ── Source 2: Spec and convention files ──

  private async scanSpecFiles(
    add: (rl: Omit<CandidateRedline, "id">) => void,
  ): Promise<void> {
    const conventionFiles = ['.cursorrules', 'CLAUDE.md', 'CONTRIBUTING.md'];
    for (const file of conventionFiles) {
      try {
        const content = await this.storage.read(file);
        if (content) await this.extractDocConstraints(content, file, 'high', add);
      } catch { /* skip */ }
    }

    try {
      const specDirs = await this.storage.list('specs');
      for (const specDir of specDirs) {
        if (specDir === '.gitkeep') continue;
        const files = await this.storage.list('specs/' + specDir);
        for (const file of files) {
          if (!/\.(md|ya?ml)$/i.test(file)) continue;
          const content = await this.storage.read('specs/' + specDir + '/' + file);
          if (!content) continue;
          await this.extractSpecConstraints(content, 'specs/' + specDir + '/' + file, add);
        }
      }
    } catch { /* specs/ might not exist */ }
  }

  private async extractSpecConstraints(
    content: string,
    sourcePath: string,
    add: (rl: Omit<CandidateRedline, "id">) => void,
  ): Promise<void> {
    const lines = content.split(/\r?\n/);
    let inAC = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/#{1,4}\s+(?:Acceptance|AC|Must|Requirements?)/i.test(line)) {
        inAC = true;
        continue;
      }
      if (inAC && /^#{1,3}\s/.test(line)) {
        inAC = false;
      }
      if (!inAC) continue;

      const clean = line.replace(/^[\s*-]+/, '').trim();
      if (clean.length < 10 || clean.length > 200) continue;

      if (/\b(?:must|should)\b/i.test(clean)) {
        add({
          title: clean.slice(0, 60),
          rule: clean,
          enforcement: /must/i.test(clean) ? 'absolute' : 'approval-required',
          source: sourcePath + ':' + (i + 1),
          category: this.categorizeByText(clean),
          confidence: 'high',
        });
      }
    }
  }

  // ── Source 3: Code surfaces (primary for old projects) ──

  private async scanCodeSurfaces(
    directoryMap: DirectoryNode[],
    add: (rl: Omit<CandidateRedline, "id">) => void,
  ): Promise<void> {
    // Step 1: Identify business-critical files from directory structure
    const surfaceFiles: { path: string; category: RedlineCategory }[] = [];

    for (const node of directoryMap) {
      if (node.type !== "file") continue;
      const lower = node.path.toLowerCase();
      for (const [category, keywords] of Object.entries(SURFACE_KEYWORDS)) {
        if (keywords.some((kw) => lower.includes(kw))) {
          surfaceFiles.push({ path: node.path, category: category as RedlineCategory });
          break;
        }
      }
    }

    // Step 2: Create structural redlines for each detected surface category
    const foundCats = new Set(surfaceFiles.map((f) => f.category));

    if (foundCats.has('authentication')) {
      add({
        title: 'Authentication surface detected in code structure',
        rule: 'All authentication-related routes and middleware must require valid identity',
        enforcement: 'absolute',
        source: surfaceFiles.filter((f) => f.category === 'authentication').map((f) => f.path).join(', '),
        category: 'authentication',
        confidence: 'medium',
      });
    }

    if (foundCats.has('billing')) {
      add({
        title: 'Billing/payment surface detected in code structure',
        rule: 'Billing and payment logic changes require business approval',
        enforcement: 'approval-required',
        source: surfaceFiles.filter((f) => f.category === 'billing').map((f) => f.path).join(', '),
        category: 'billing',
        confidence: 'medium',
      });
    }

    if (foundCats.has('permission')) {
      add({
        title: 'Permission/authorization surface detected in code structure',
        rule: 'Permission checks must not be bypassed or weakened',
        enforcement: 'absolute',
        source: surfaceFiles.filter((f) => f.category === 'permission').map((f) => f.path).join(', '),
        category: 'permission',
        confidence: 'medium',
      });
    }

    if (foundCats.has('data-integrity')) {
      add({
        title: 'Database/schema surface detected in code structure',
        rule: 'Database schema changes require migration and integrity verification',
        enforcement: 'absolute',
        source: surfaceFiles.filter((f) => f.category === 'data-integrity').map((f) => f.path).join(', '),
        category: 'data-integrity',
        confidence: 'medium',
      });
    }

    // Step 3: Read business-critical files and detect code-level patterns
    const toScan = surfaceFiles.slice(0, 60);
    for (const file of toScan) {
      let content: string | null = null;
      try { content = await this.storage.read(file.path); } catch { continue; }
      if (!content) continue;

      for (const pattern of CODE_PATTERNS) {
        if (pattern.regex.test(content)) {
          add({
            title: pattern.title + ' (' + file.path.split('/').pop() + ')',
            rule: pattern.rule,
            enforcement: pattern.enforcement,
            source: file.path,
            category: pattern.category,
            confidence: 'medium',
          });
        }
      }
    }
  }

  // ── Helpers ──

  private categorizeByText(text: string): RedlineCategory {
    const lower = text.toLowerCase();
    if (/auth|login|session|token/.test(lower)) return 'authentication';
    if (/billing|payment|pay|charge|refund/.test(lower)) return 'billing';
    if (/permission|role|admin|access/.test(lower)) return 'permission';
    if (/database|schema|migration/.test(lower)) return 'data-integrity';
    if (/api|route|endpoint|contract/.test(lower)) return 'api-contract';
    if (/audit|log|privacy|encrypt/.test(lower)) return 'compliance';
    return 'general';
  }

  private makeId(category: string, title: string): string {
    const cat = category.toUpperCase().replace(/[^A-Z]/g, "_");
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40).toUpperCase() || 'RULE';
    return cat + "_" + slug;
  }
}

