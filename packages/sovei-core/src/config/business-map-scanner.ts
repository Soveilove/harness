/**
 * Built-in business topology scanner.
 *
 * It produces an auditable candidate map from repository evidence. The map is
 * intentionally not activated as stable knowledge until a human reviews it.
 */

import { posix } from 'node:path';
import type { StorageBackend } from '../storage/types.js';
import type { CandidateRedline } from './redline-scanner.js';
import type { DirectoryNode, ScanCoverage } from './scanner.js';

export type BusinessMapConfidence = 'high' | 'medium' | 'low';

export interface BusinessCapability {
  id: string;
  name: string;
  description: string;
  entrySurfaces: string[];
  contracts: string[];
  upstreamCapabilities: string[];
  downstreamCapabilities: string[];
  externalDependencies: string[];
  redlineCandidateIds: string[];
  codeEvidence: string[];
  confidence: BusinessMapConfidence;
  reviewStatus: 'candidate';
}

export interface BusinessMapCoverage {
  repository: ScanCoverage;
  candidateSourceFiles: number;
  contentFilesScanned: number;
  maxContentFiles: number;
  truncated: boolean;
  reasons: string[];
}

export interface BusinessMap {
  schemaVersion: 1;
  scannerVersion: string;
  generatedAt: string;
  lifecycle: 'candidate';
  generator: {
    mode: 'builtin-static-analysis';
    externalGraphProvider: null;
  };
  coverage: BusinessMapCoverage;
  capabilities: BusinessCapability[];
  unmappedEvidence: string[];
}

interface CapabilitySeed {
  key: string;
  name: string;
  description: string;
}

interface MutableCapability extends CapabilitySeed {
  entrySurfaces: Set<string>;
  contracts: Set<string>;
  upstreamCapabilities: Set<string>;
  downstreamCapabilities: Set<string>;
  externalDependencies: Set<string>;
  redlineCandidateIds: Set<string>;
  codeEvidence: Set<string>;
}

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|vue|svelte|py|java|kt|go|rs|rb|php)$/i;
const ENTRY_SURFACE = /(?:^|\/)(?:pages?|views?|routes?|controllers?|commands?|cli)(?:\/|$)/i;
const CONTRACT_SURFACE = /(?:^|\/)(?:api|contracts?|dto|schemas?|types?|interfaces?|services?)(?:\/|$)|(?:\.dto|\.schema|\.types?|\.api|\.service)\./i;
const GENERIC_SEGMENTS = new Set([
  'src', 'lib', 'app', 'apps', 'packages', 'components', 'composables', 'hooks',
  'utils', 'shared', 'common', 'core', 'index', 'main', 'test', 'tests', '__tests__',
]);

const SEMANTIC_CAPABILITIES: Array<{ pattern: RegExp; seed: CapabilitySeed; redlineCategories: string[] }> = [
  { pattern: /auth|login|session|token|credential/i, seed: { key: 'authentication', name: '身份认证', description: '登录、会话、令牌与身份校验' }, redlineCategories: ['authentication'] },
  { pattern: /billing|payment|subscription|order|refund|checkout|invoice/i, seed: { key: 'billing', name: '计费与交易', description: '订单、支付、订阅、退款与账务处理' }, redlineCategories: ['billing', 'data-integrity'] },
  { pattern: /permission|role|admin|access|rbac|acl/i, seed: { key: 'authorization', name: '权限治理', description: '角色、权限与访问控制' }, redlineCategories: ['permission'] },
  { pattern: /user|account|profile|member/i, seed: { key: 'account', name: '用户与账户', description: '用户资料、账户和会员状态' }, redlineCategories: ['authentication', 'permission'] },
  { pattern: /artwork|content|post|article|document/i, seed: { key: 'content', name: '内容管理', description: '内容创建、读取、更新与生命周期管理' }, redlineCategories: ['api-contract', 'data-integrity'] },
  { pattern: /generate|generation|model|prompt|aivideo|image/i, seed: { key: 'generation', name: '生成任务', description: '模型调用、生成任务与结果处理' }, redlineCategories: ['api-contract', 'compliance'] },
  { pattern: /asset|media|upload|download|storage|file/i, seed: { key: 'asset', name: '资产与媒体', description: '文件、媒体、上传下载与存储' }, redlineCategories: ['data-integrity', 'compliance'] },
  { pattern: /publish|release|share|distribution/i, seed: { key: 'publishing', name: '发布与分发', description: '发布、分享与分发流程' }, redlineCategories: ['api-contract', 'permission'] },
  { pattern: /search|discover|feed|recommend/i, seed: { key: 'discovery', name: '搜索与发现', description: '搜索、推荐、信息流与内容发现' }, redlineCategories: ['api-contract'] },
  { pattern: /notification|message|email|sms|webhook/i, seed: { key: 'notification', name: '消息通知', description: '站内信、邮件、短信与回调通知' }, redlineCategories: ['api-contract', 'compliance'] },
];

export class BusinessMapScanner {
  constructor(
    private readonly storage: StorageBackend,
    private readonly scannerVersion: string,
  ) {}

  async scan(
    directoryMap: DirectoryNode[],
    redlines: CandidateRedline[],
    repositoryCoverage: ScanCoverage,
    maxContentFiles = 500,
  ): Promise<BusinessMap> {
    const sourceFiles = directoryMap
      .filter((node) => node.type === 'file' && SOURCE_FILE.test(node.path))
      .map((node) => node.path)
      .sort();
    const selectedFiles = sourceFiles.slice(0, Math.max(0, maxContentFiles));
    const capabilities = new Map<string, MutableCapability>();
    const fileCapabilities = new Map<string, string>();
    const unmappedEvidence: string[] = [];

    for (const filePath of selectedFiles) {
      const seed = this.inferCapability(filePath);
      if (!seed) {
        if (unmappedEvidence.length < 100) unmappedEvidence.push(filePath);
        continue;
      }
      fileCapabilities.set(filePath, seed.key);
      const capability = this.getOrCreate(capabilities, seed);
      capability.codeEvidence.add(filePath);
      if (ENTRY_SURFACE.test(filePath)) capability.entrySurfaces.add(filePath);
      if (CONTRACT_SURFACE.test(filePath)) capability.contracts.add(filePath);
    }

    for (const filePath of selectedFiles) {
      const sourceKey = fileCapabilities.get(filePath);
      if (!sourceKey) continue;
      const source = capabilities.get(sourceKey)!;
      const content = await this.storage.read(filePath);
      if (!content) continue;

      for (const dependency of this.extractImports(content)) {
        if (!dependency.startsWith('.')) {
          source.externalDependencies.add(dependency.split('/').slice(0, dependency.startsWith('@') ? 2 : 1).join('/'));
          continue;
        }
        const targetPath = posix.normalize(posix.join(posix.dirname(filePath), dependency));
        const targetSeed = this.inferCapability(targetPath);
        if (!targetSeed || targetSeed.key === sourceKey) continue;
        this.getOrCreate(capabilities, targetSeed);
        source.downstreamCapabilities.add(targetSeed.key);
        capabilities.get(targetSeed.key)!.upstreamCapabilities.add(sourceKey);
      }

      for (const contract of this.extractApiContracts(content)) source.contracts.add(contract);
    }

    for (const capability of capabilities.values()) {
      const semantic = SEMANTIC_CAPABILITIES.find((item) => item.seed.key === capability.key);
      const categories = new Set(semantic?.redlineCategories ?? []);
      for (const redline of redlines) {
        if (categories.has(redline.category) || capability.codeEvidence.has(redline.source)) {
          capability.redlineCandidateIds.add(redline.id);
        }
      }
    }

    const contentTruncated = sourceFiles.length > selectedFiles.length;
    const reasons = [...repositoryCoverage.reasons];
    if (contentTruncated) reasons.push(`业务地图内容扫描达到 ${maxContentFiles} 个源码文件上限`);

    return {
      schemaVersion: 1,
      scannerVersion: this.scannerVersion,
      generatedAt: new Date().toISOString(),
      lifecycle: 'candidate',
      generator: { mode: 'builtin-static-analysis', externalGraphProvider: null },
      coverage: {
        repository: repositoryCoverage,
        candidateSourceFiles: sourceFiles.length,
        contentFilesScanned: selectedFiles.length,
        maxContentFiles,
        truncated: repositoryCoverage.truncated || contentTruncated,
        reasons: [...new Set(reasons)],
      },
      capabilities: [...capabilities.values()]
        .map((capability) => this.finalize(capability))
        .sort((left, right) => left.id.localeCompare(right.id)),
      unmappedEvidence,
    };
  }

  private inferCapability(filePath: string): CapabilitySeed | null {
    const normalized = filePath.toLowerCase();
    const semantic = SEMANTIC_CAPABILITIES.find((item) => item.pattern.test(normalized));
    if (semantic) return semantic.seed;

    const segments = normalized.replace(/\.[^.]+$/, '').split('/');
    const markerIndex = segments.findIndex((segment) =>
      ['features', 'feature', 'modules', 'module', 'domains', 'domain', 'pages', 'views', 'controllers', 'services'].includes(segment),
    );
    const preferred = markerIndex >= 0 ? segments[markerIndex + 1] : this.segmentAfterSource(segments);
    const key = this.cleanKey(preferred ?? segments.at(-1) ?? '');
    if (!key || GENERIC_SEGMENTS.has(key)) return null;
    return { key, name: key, description: `从代码目录自动识别的 ${key} 业务能力` };
  }

  private segmentAfterSource(segments: string[]): string | undefined {
    const sourceIndex = segments.lastIndexOf('src');
    if (sourceIndex >= 0) return segments[sourceIndex + 1];
    return undefined;
  }

  private cleanKey(value: string): string {
    return value
      .replace(/(?:controller|service|store|repository|handler|router|route|api|types?|schema|dto)$/i, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private getOrCreate(capabilities: Map<string, MutableCapability>, seed: CapabilitySeed): MutableCapability {
    const existing = capabilities.get(seed.key);
    if (existing) return existing;
    const created: MutableCapability = {
      ...seed,
      entrySurfaces: new Set(), contracts: new Set(), upstreamCapabilities: new Set(),
      downstreamCapabilities: new Set(), externalDependencies: new Set(),
      redlineCandidateIds: new Set(), codeEvidence: new Set(),
    };
    capabilities.set(seed.key, created);
    return created;
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
    return [...dependencies].sort();
  }

  private extractApiContracts(content: string): string[] {
    const contracts = new Set<string>();
    const endpointPattern = /['\"]((?:\/api\/|https?:\/\/)[^'\"\s?]+)[^'\"]*['\"]/g;
    for (const match of content.matchAll(endpointPattern)) contracts.add(match[1]);
    return [...contracts].sort();
  }

  private finalize(capability: MutableCapability): BusinessCapability {
    const evidenceCount = capability.codeEvidence.size;
    const hasBehaviorEvidence = capability.entrySurfaces.size > 0 || capability.contracts.size > 0;
    const confidence: BusinessMapConfidence = evidenceCount >= 3 && hasBehaviorEvidence
      ? 'high'
      : evidenceCount >= 2 || hasBehaviorEvidence ? 'medium' : 'low';
    const sorted = (items: Set<string>, limit = 100) => [...items].sort().slice(0, limit);
    return {
      id: capability.key,
      name: capability.name,
      description: capability.description,
      entrySurfaces: sorted(capability.entrySurfaces),
      contracts: sorted(capability.contracts),
      upstreamCapabilities: sorted(capability.upstreamCapabilities),
      downstreamCapabilities: sorted(capability.downstreamCapabilities),
      externalDependencies: sorted(capability.externalDependencies),
      redlineCandidateIds: sorted(capability.redlineCandidateIds),
      codeEvidence: sorted(capability.codeEvidence),
      confidence,
      reviewStatus: 'candidate',
    };
  }
}
