/**
* Project Commands
* init     - New project: create structure + seed knowledge based on tech stack
* onboard  - Existing project: scan codebase, detect stack, bootstrap knowledge
* status   - Show current project status
 * map      - Show business topology (capabilities, dependencies, evidence)
 */

import type { Command } from 'commander';
import { ChangeControlRepository } from '../../change-control/repository.js';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import type { SoveiConfig } from '../../config/types.js';
import type { Logger } from '../../providers/tokens.js';
import { KnowledgeStore } from '../../knowledge/store.js';
import { FilesystemStorage } from '../../storage/filesystem.js';
import { ProjectScanner } from '../../config/scanner.js';
import { VERSION } from '../../config/version.js';
import { detectTechStack, generateSeeds, seedsToEntries, type DetectedStack } from '../../config/tech-stack.js';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { emptyRulesDocument, ProjectRulesRepository, DEFAULT_RULES_FILE } from '../../rules/repository.js';
import { adaptProjectRules } from '../../rules/adaptation.js';

function getStorage(): StorageBackend {
  return container.inject<StorageBackend>(TOKENS.Storage);
}
function getConfig(): SoveiConfig {
  return container.inject<SoveiConfig>(TOKENS.Config);
}
function getLogger(): Logger {
  return container.inject<Logger>(TOKENS.Logger);
}

function generateId(type: string, title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const hash = createHash('sha1').update(`${type}\0${title}`).digest('hex').slice(0, 8);
  return type + '-' + slug + '-' + hash;
}

function printStack(stack: DetectedStack): void {
  console.log('  技术栈：');
  for (const [key, value] of Object.entries(stack)) {
    if (value) console.log('    ' + key + ': ' + value);
  }
}

/**
 * 写入 onboard 扫描产出的三类证据文件（业务地图 / 红线候选 / 知识条目），
 * 并确保 governance 基础设施存在。
 *
 * 无论 `--evidence-only` 还是完整 onboard 都会调用本函数，保证 Agent 拿到的是
 * 真实落盘的证据，而不是只能靠读源码硬推。
 *
 * 返回写入的业务地图路径与候选红线数量，供调用方打印。
 */
async function writeEvidenceFiles(
  storage: StorageBackend,
  currentConfig: SoveiConfig,
  result: Awaited<ReturnType<ProjectScanner['scan']>>,
): Promise<{ businessMapPath: string; seedPath: string; candidateRedlines: number }> {
  // Ensure governance infrastructure exists (same as project init)
  if (!(await storage.exists('harness/project/governance/redlines.json'))) {
    await storage.write('harness/project/governance/redlines.json', '[]');
    console.log('  · 已创建 harness/project/governance/redlines.json');
  }

  // Write generated knowledge entries
  const knowledgeStore = new KnowledgeStore(storage, 'harness/project/knowledge');
  await knowledgeStore.load();
  let added = 0;
  let updated = 0;
  let preserved = 0;
  for (const entry of result.generatedKnowledge) {
    const fullEntry = { ...entry, id: generateId(entry.type, entry.title) };
    const existing = knowledgeStore.selectById(fullEntry.id);
    if (existing?.lifecycle === 'candidate') {
      knowledgeStore.dispatch({ type: 'UPDATE', id: fullEntry.id, patch: fullEntry as any });
      updated++;
    } else if (existing) {
      preserved++;
    } else {
      knowledgeStore.dispatch({ type: 'ADD', entry: fullEntry as any });
      added++;
    }
  }
  await knowledgeStore.persist();
  console.log('  · 已新增 ' + added + ' 条，刷新 ' + updated + ' 条，保留 ' + preserved + ' 条已审核知识');

  // Business topology is generated as a typed candidate. Humans review it;
  // they do not have to reconstruct capabilities and dependencies manually.
  const businessMapPath = 'harness/project/codegraph/business-map.json';
  await storage.write(businessMapPath, JSON.stringify(result.businessMap, null, 2));
  console.log('  · 已写入 ' + businessMapPath + '（' + result.businessMap.capabilities.length + ' 项候选业务能力）');
  if (result.businessMap.coverage.truncated) {
    console.log('    业务地图为部分覆盖：' + result.businessMap.coverage.reasons.join('；'));
  }
  console.log('  · 查看业务拓扑：sovei project map');

  // Write candidate redlines to seed file for human review (never auto-activate)
  const seedPath = 'harness/project/governance/redlines-seed.json';
  const seedData = {
    schemaVersion: 1 as const,
    generatedAt: new Date().toISOString(),
    scannerVersion: VERSION,
    redlines: (result.candidateRedlines ?? []).map((rl) => ({
      id: rl.id,
      title: rl.title,
      rule: rl.rule,
      enforcement: rl.enforcement,
      source: rl.source,
      category: rl.category,
      confidence: rl.confidence,
    })),
  };
  await storage.write(seedPath, JSON.stringify(seedData, null, 2));
  console.log('  · 已写入 ' + seedPath + '（' + seedData.redlines.length + ' 条候选，未激活）');
  // Refresh the human-review view so candidates are readable in redlines.md
  const viewPath = await new ChangeControlRepository(storage).refreshRedlinesView();
  console.log('  · 已刷新人工审查视图 ' + viewPath);

  return {
    businessMapPath,
    seedPath,
    candidateRedlines: seedData.redlines.length,
  };
}

export function registerProjectCommands(program: Command): void {
  const project = program.command('project').description('项目管理命令');

  // ── init (new project) ──
  project
   .command('init')
   .description('初始化新项目：创建目录结构并按技术栈写入种子知识')
   .argument('<path>', '项目路径')
    .option('--blank', '空白初始化（不写入种子知识）')
    .option('--name <name>', '项目名称')
    .option('--framework <framework>', '技术栈框架（vue/react/svelte/express）')
    .option('--language <language>', '技术栈语言（typescript/javascript）')
    .option('--state <state>', '状态管理（pinia/redux/zustand）')
    .option('--build <build>', '构建工具（vite/webpack）')
    .option('--force', '替换现有 Sovei 项目声明')
    .action(async (targetPath: string, opts: {
      blank?: boolean; name?: string; framework?: string; language?: string; state?: string; build?: string; force?: boolean;
    }) => {
      const logger = getLogger();
      const resolvedTarget = resolve(targetPath);
      const projectName = opts.name || resolvedTarget.split(/[\\/]/).pop() || 'untitled';

      // Build detected stack from options
      const stack: DetectedStack = {
        framework: opts.framework,
        language: opts.language,
        state: opts.state,
        build: opts.build,
      };

      console.log('\n  正在初始化 Sovei 项目：' + resolvedTarget + '\n');

      // Create directory structure
      const dirs = ['specs', 'harness/project/knowledge', 'harness/project/codegraph', 'harness/project/rules', 'harness/project/governance', 'harness/templates'];
      const storage = new FilesystemStorage(resolvedTarget);
      if (await storage.exists('harness/project/project.config.json') && !opts.force) {
        throw new Error('Sovei project already exists at target. Use --force to replace its declaration.');
      }
      for (const dir of dirs) {
        await storage.write(dir + '/.gitkeep', '');
        console.log('  · 已创建 ' + dir + '/');
      }

      // Create project.config.json
      const projectConfig = {
        project: { name: projectName, description: 'New project', techStack: stack, started: new Date().toISOString().split('T')[0] },
        workflow: { version: '2.0.0' },
      };
      await storage.write('harness/project/project.config.json', JSON.stringify(projectConfig, null, 2));
      console.log('  · 已创建 harness/project/project.config.json');

      // Write AGENTS.md with Sovei declaration
      const agentsMd = [
        '# ' + projectName,
        '',
        '## Sovei Workflow',
        '',
        'This project uses [Sovei](https://github.com/sovei) for structured development workflows.',
        '',
        '### Key Commands',
        '- `sovei context build --stage <stage> --feature <feature>`: Get stage prompt + context pack',
        '- `sovei context build --stage spec --feature <feature> --cross-feature`: Include other features decision logs',
        '- `sovei workflow <stage> <feature>`: Prepare a workflow stage',
        '- `sovei workflow <stage> <feature> --complete`: Complete a stage and advance',
        '- `sovei workflow confirm <feature> --stage <stage> --role <role> --by <name> --reference <ref>`: Confirm a gate',
        '- `sovei workflow bootstrap <feature>`: Start a new feature',
        '- `sovei project onboard --evidence-only`: Collect evidence for agent analysis (existing projects)',
        '- `sovei governance review-pack generate <feature>`: Render tech-review.md + product-review.md from reconciliation.md',
        '- `sovei governance review-pack import <feature> --product <file> --by <name> --reference <ref>`: Import PM confirmation',
        '',
        '### Workflow Stages',
        '',
        '```',
        'load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync',
        '```',
        '',
        '### Confirmation Gates',
        '',
        '- After **spec** (S2/S3 risk): product + tech confirmation required before scope',
        '- After **verify** (always): product + tech confirmation required before learn',
        '- Override: `sovei workflow override-confirm <feature> --stage <stage> --role <role> --by <name> --reason <reason>`',
        '',
        '### Reconciliation',
        '',
        'The spec stage produces `reconciliation.md` — a structured alignment document that:',
        '1. Translates PM requirements into technical understanding',
        '2. Restores current state (why code is the way it is, referencing prior feature decisions)',
        '3. Lists solutions and their costs',
        '4. Extracts questions for product and tech confirmation',
        '',
        'Run `sovei governance review-pack generate <feature>` to render tech-review.md and product-review.md from it.',
        '',
      ].join('\n');
      await storage.write('AGENTS.md', agentsMd);
      console.log('  · 已创建 AGENTS.md（Sovei 声明）');

      // Create knowledge files
      const knowledgeTypes = ['pitfall', 'rule', 'decision', 'code-map', 'architecture', 'preference', 'constitution'];
      for (const type of knowledgeTypes) {
        const knowledgePath = 'harness/project/knowledge/' + type + '.json';
        if (!(await storage.exists(knowledgePath))) {
          await storage.write(knowledgePath, '[]');
          console.log('  · 已创建 ' + knowledgePath);
        }
      }
      if (!(await storage.exists('harness/project/governance/redlines.json'))) {
        await storage.write('harness/project/governance/redlines.json', '[]');
        console.log('  · 已创建 harness/project/governance/redlines.json');
      }
      if (!(await storage.exists(DEFAULT_RULES_FILE))) {
        const rulesRepository = new ProjectRulesRepository(storage);
        await rulesRepository.writeDocument(DEFAULT_RULES_FILE, emptyRulesDocument());
        console.log('  · 已创建 ' + DEFAULT_RULES_FILE + '（空 Rules 容器，未生成默认规范）');
      }

      // Seed knowledge based on tech stack (unless --blank)
      if (!opts.blank) {
        const seeds = generateSeeds(stack);
        if (seeds.length > 0) {
          const entries = seedsToEntries(seeds);
          const knowledgeStore = new KnowledgeStore(storage, 'harness/project/knowledge');
          await knowledgeStore.load();
          for (const entry of entries) {
            const fullEntry = { ...entry, id: generateId(entry.type, entry.title) };
            if (!knowledgeStore.selectById(fullEntry.id)) {
              knowledgeStore.dispatch({ type: 'ADD', entry: fullEntry as any });
            }
          }
          await knowledgeStore.persist();
          console.log('  · 已按技术栈写入 ' + seeds.length + ' 条种子知识');
          printStack(stack);
        }
      }

      console.log('\n  ✓ 项目已初始化。\n');
      console.log('  后续步骤：');
      console.log('    1. 编辑 harness/project/project.config.json');
      if (!opts.blank && stack.framework) {
        console.log('    2. 如项目已有 Agent/IDE Rules，运行：sovei rules adapt');
        console.log('    3. 审查种子知识：sovei knowledge list');
        console.log('    4. 开始 Feature：sovei workflow bootstrap 001-my-feature');
      } else {
        console.log('    2. 如项目已有 Agent/IDE Rules，运行：sovei rules adapt');
        console.log('    3. 添加知识：sovei knowledge add --type pitfall --title "..." --content "..." --feature manual');
        console.log('    4. 开始 Feature：sovei workflow bootstrap 001-my-feature');
      }
      console.log('');
    });

  // ── onboard (existing project) ──
  project
    .command('onboard')
    .description('扫描已有项目并初始化知识')
    .option('--depth <n>', '最大扫描深度', '4')
    .option('--max-entries <n>', '目录扫描最大条目数', '20000')
    .option('--max-business-files <n>', '业务地图最大源码读取数', '500')
    .option('--evidence-only', 'collect evidence without generating candidates')
    .option('--dry-run', '只扫描并打印报告，不写盘')
    .action(async (opts: { depth: string; maxEntries: string; maxBusinessFiles: string; dryRun?: boolean; evidenceOnly?: boolean }) => {
      const storage = getStorage();
      const currentConfig = getConfig();
      const logger = getLogger();
      const maxDepth = parseInt(opts.depth, 10) || 4;
      const maxEntries = parseInt(opts.maxEntries, 10) || 20_000;
      const maxBusinessFiles = parseInt(opts.maxBusinessFiles, 10) || 500;

      console.log('\n  正在扫描项目以完成初始化……\n');

      // Run scanner
      const scanner = new ProjectScanner(storage);
      const result = await scanner.scan(maxDepth, maxEntries, maxBusinessFiles);

      // Print detected info
      console.log('  ── 检测到的技术栈 ──');
      printStack(result.techStack);
      console.log('');

      console.log('  ── 发现的软件包 ──');
      if (result.packages.length > 0) {
        for (const pkg of result.packages) {
          console.log('    · ' + pkg.path + (pkg.name ? ' (' + pkg.name + ')' : ''));
          for (const entry of pkg.entryPoints) {
            console.log('      入口：' + entry);
          }
        }
      } else {
        console.log('    （未检测到）');
      }
      console.log('');

      console.log('  ── 入口 ──');
      if (result.entryPoints.length > 0) {
        for (const entry of result.entryPoints) {
          console.log('    · ' + entry);
        }
      } else {
        console.log('    （未检测到）');
      }
      console.log('');

      console.log('  ── 检测到的模式 ──');
      if (result.detectedPatterns.length > 0) {
        for (const pattern of result.detectedPatterns) {
          console.log('    · ' + pattern);
        }
      } else {
        console.log('    （未检测到）');
      }
      console.log('');

      console.log('  ── 目录结构（深度 ' + maxDepth + '）──');
      for (const node of result.directoryMap.slice(0, 50)) {
        const indent = '    ' + '  '.repeat(node.depth);
        const icon = node.type === 'dir' ? '[D]' : '[F]';
        const note = node.note ? '  // ' + node.note : '';
        console.log(indent + icon + ' ' + node.path.split('/').pop() + note);
      }
      if (result.directoryMap.length > 50) {
        console.log('    ……另有 ' + (result.directoryMap.length - 50) + ' 项');
      }
      console.log('');

      console.log('  ── 扫描覆盖 ──');
      console.log('    文件：' + result.coverage.filesDiscovered);
      console.log('    目录：' + result.coverage.directoriesDiscovered);
      console.log('    状态：' + (result.coverage.truncated ? '部分覆盖' : '完整覆盖'));
      for (const reason of result.coverage.reasons) console.log('    · ' + reason);
      console.log('');

      if (opts.dryRun) {
        console.log('  --dry-run：仅扫描并打印报告，未写入任何文件。\n');
        return;
      }

      if (opts.evidenceOnly) {
        // Evidence-only 模式也会真正落盘三类证据文件，Agent 拿到的是可读的真实证据。
        const evidence = await writeEvidenceFiles(storage, currentConfig, result);
        console.log('');
        console.log('  ================================================================');
        console.log('  AGENT ONBOARDING GUIDE');
        console.log('  ================================================================');
        console.log('');
        console.log('  You are an AI agent analyzing an existing codebase with Sovei.');
        console.log('  Sovei has collected evidence but CANNOT understand business semantics.');
        console.log('  YOUR JOB: read the evidence, read the code, and write back findings.');
        console.log('');
        console.log('  ## Evidence Files (generated above)');
        console.log('');
        console.log('  1. ' + evidence.businessMapPath);
        console.log('     - Auto-detected capabilities from directory structure + imports');
        console.log('     - WARNING: contains noise (test files as capabilities, etc.)');
        console.log('     - Read it, then verify each capability against actual code');
        console.log('');
        console.log('  2. ' + evidence.seedPath);
        console.log('     - Regex-detected redline candidates (may be empty or noisy)');
        console.log('');
        console.log('  3. harness/project/knowledge/*.json');
        console.log('     - Auto-generated candidate knowledge entries');
        console.log('');
        console.log('  ## Step 1: Read and Clean Business Map');
        console.log('');
        console.log('  Read harness/project/codegraph/business-map.json.');
        console.log('  For each capability:');
        console.log('    - Read the codeEvidence files to verify it is a real business capability');
        console.log('    - REJECT if: test files, single-letter names, no real code, test fixtures');
        console.log('    - CONFIRM if: real business logic exists in the code');
        console.log('    - MERGE if: two capabilities are actually the same thing');
        console.log('    - SPLIT if: one capability is doing too many things');
        console.log('');
        console.log('  ## Step 2: Identify Business Redlines');
        console.log('');
        console.log('  Read the actual source code (not tests). Look for:');
        console.log('    - Authentication/authorization guards');
        console.log('    - Billing/payment/transaction logic');
        console.log('    - Data integrity constraints (migrations, schema, null checks)');
        console.log('    - API contracts that external systems depend on');
        console.log('    - Compliance requirements (audit logs, encryption, privacy)');
        console.log('  For each finding, ask: would breaking this cause real harm?');
        console.log('  If yes, it is a business redline.');
        console.log('');
        console.log('  ## Step 3: Write Findings via CLI');
        console.log('');
        console.log('  For each confirmed business redline:');
        console.log('    sovei governance redline add <ID> --title "..." --rule "..." --enforcement absolute --rationale "..."');
        console.log('');
        console.log('  For each confirmed business knowledge (pitfall, rule, architecture):');
        console.log('    sovei knowledge add --type <type> --title "..." --content "..." --feature onboard');
        console.log('');
        console.log('  For each REJECTED capability, note it but do not write anything.');
        console.log('');
        console.log('  ## Step 4: Write Summary Report');
        console.log('');
        console.log('  Write harness/project/onboard-report.md with:');
        console.log('    - Confirmed business capabilities (with evidence)');
        console.log('    - Rejected candidates (with reasons)');
        console.log('    - Identified redlines (with rationale)');
        console.log('    - Open questions for human review');
        console.log('');
        console.log('  ## Important Rules');
        console.log('');
        console.log('  - You are generating CANDIDATES only. Nothing is activated automatically.');
        console.log('  - Read REAL source code, not test files, to verify capabilities.');
        console.log('  - Test files (*.test.*, *.spec.*) are NOT business capabilities.');
        console.log('  - If unsure whether something is a redline, add it with --enforcement approval-required.');
        console.log('');
        console.log('  After completing all steps, a human should review:');
        console.log('    sovei governance redline list');
        console.log('    sovei knowledge list --lifecycle candidate');
        console.log('    cat harness/project/onboard-report.md');
        console.log('');
        console.log('  Only after human review, start feature development:');
        console.log('    sovei workflow bootstrap 001-first-feature');
        console.log('');
        return;
      }

      // Write project.config.json from detected info
      const projectConfig = {
        project: {
          name: currentConfig.project.name !== 'untitled'
            ? currentConfig.project.name
            : result.packageJson?.name || 'onboarded-project',
          description: currentConfig.project.description !== 'New project - configure me'
            ? currentConfig.project.description
            : result.packageJson?.description || 'Onboarded from existing codebase',
          techStack: { ...currentConfig.project.techStack, ...result.techStack },
          started: currentConfig.project.started || result.packageJson?.createdAt || new Date().toISOString().split('T')[0],
        },
        workflow: currentConfig.workflow,
      };
      await storage.write('harness/project/project.config.json', JSON.stringify(projectConfig, null, 2));
      console.log('  · 已更新 harness/project/project.config.json');

      // Existing projects are adapted into candidates only. Re-running onboard is
      // idempotent and preserves rules that have already been reviewed.
      const rulesRepository = new ProjectRulesRepository(storage, currentConfig.rulesDir);
      const adaptedRules = await adaptProjectRules(storage, rulesRepository);
      console.log(adaptedRules.written
        ? '  · 已适配 ' + adaptedRules.total + ' 条项目规范候选（未自动激活）'
        : '  · 未发现项目原有 Agent/IDE Rules，未生成规范候选');

      // 三类证据文件（业务地图 / 红线候选 / 知识条目）统一落盘
      await writeEvidenceFiles(storage, currentConfig, result);

      // Display candidate redlines grouped by category and confidence
      if (result.candidateRedlines && result.candidateRedlines.length > 0) {
        console.log('');
        console.log('  · 检测到 ' + result.candidateRedlines.length + ' 条候选业务红线：');
        console.log('');
        // Group by confidence then category
        const byConfidence: Record<string, typeof result.candidateRedlines> = { high: [], medium: [], low: [] };
        for (const rl of result.candidateRedlines) {
          (byConfidence[rl.confidence] ||= []).push(rl);
        }
        for (const conf of ['high', 'medium', 'low']) {
          const items = byConfidence[conf];
          if (!items || !items.length) continue;
          console.log('    [' + conf + ' 置信度]');
          for (const rl of items.slice(0, 8)) {
            console.log('      ' + rl.category + ': ' + rl.title);
            console.log('        规则：' + rl.rule.slice(0, 100));
            console.log('        来源：' + rl.source);
          }
          if (items.length > 8) {
            console.log('      ……另有 ' + (items.length - 8) + ' 条');
          }
          console.log('');
        }
        console.log('  审查并导入：');
        console.log('    sovei governance redline list');
        console.log('    sovei governance redline add <id> --title "..." --rule "..."');
        console.log('    sovei governance redline import <file>');
        console.log('');
      } else {
        console.log('');
        console.log('  未检测到候选业务红线，可手动添加：');
        console.log('    sovei governance redline add BILLING_REQUIRED --title "..." --rule "..."');
        console.log('');
      }

      console.log('\n  ✓ 项目初始化扫描完成。\n');
      console.log('  所有生成知识均为 candidate 生命周期。');
      console.log('  业务地图和业务红线已自动生成候选；人工仅需审核、接受、驳回或修正。');
      console.log('  审查并在验证模式后晋级：');
      console.log('    sovei knowledge list --lifecycle candidate');
      console.log('    sovei knowledge promote <id> --feature <feature> --description "verified"');
      console.log('');
      console.log('  开始跟踪工作：');
      console.log('    sovei workflow bootstrap 001-first-feature');
      console.log('');
    });

  // ── status ──
  project
    .command('status')
    .description('显示当前项目状态')
    .action(async () => {
      const storage = getStorage();
      const config = getConfig();

      console.log('\n  Sovei 项目状态');
      console.log('  ────────────────────────');
      console.log('  根目录：      ' + config.rootPath);

      // Read project.config.json for real project info
      const projContent = await storage.read('harness/project/project.config.json');
      if (projContent) {
        try {
          const proj = JSON.parse(projContent);
          console.log('  项目：        ' + proj.project.name);
          console.log('  描述：        ' + proj.project.description);
          const stack = proj.project.techStack || {};
          const stackParts = Object.entries(stack).filter(([, v]) => v).map(([k, v]) => k + '=' + v);
          console.log('  技术栈：      ' + (stackParts.length ? stackParts.join(', ') : '—'));
          console.log('  开始日期：    ' + (proj.project.started || '—'));
        } catch {
          console.log('  项目：        （配置无效）');
        }
      } else {
        console.log('  项目：        （尚未配置，请运行 "sovei project init" 或 "sovei project onboard"）');
      }
      console.log('  工作流：      v' + config.workflow.version);

      // List specs
      const specs = await storage.list('specs');
      const realSpecs = specs.filter((s) => s !== '.gitkeep');
      if (realSpecs.length > 0) {
        console.log('');
        console.log('  活动 Feature：');
        for (const spec of realSpecs) {
          console.log('    · ' + spec);
        }
      }

      // Count knowledge
      const knowledgeFiles = await storage.list(config.knowledgeDir);
      let totalKnowledge = 0;
      const byLifecycle: Record<string, number> = {};
      for (const file of knowledgeFiles) {
        if (!file.endsWith('.json')) continue;
        const content = await storage.read(config.knowledgeDir + '/' + file);
        if (content) {
          try {
            const entries = JSON.parse(content) as any[];
            totalKnowledge += entries.length;
            for (const e of entries) {
              byLifecycle[e.lifecycle] = (byLifecycle[e.lifecycle] || 0) + 1;
            }
          } catch { /* skip */ }
        }
      }
      console.log('  知识：        ' + totalKnowledge + ' 条');
      if (totalKnowledge > 0) {
        const parts = Object.entries(byLifecycle).map(([k, v]) => k + '=' + v);
        console.log('               ' + parts.join(', '));
      }

      // Count redlines
      const redlineContent = await storage.read('harness/project/governance/redlines.json');
      let activeRedlines = 0;
      let totalRedlines = 0;
      if (redlineContent) {
        try {
          const redlines = JSON.parse(redlineContent) as any[];
          totalRedlines = redlines.length;
          activeRedlines = redlines.filter((r) => r.active).length;
        } catch { /* skip */ }
      }
      console.log('  红线：        ' + activeRedlines + ' 条已启用' + (totalRedlines > activeRedlines ? '（' + (totalRedlines - activeRedlines) + ' 条未启用）' : '') + (activeRedlines === 0 ? '；可运行 sovei governance redline add 添加' : ''));

      const projectRules = await new ProjectRulesRepository(storage, config.rulesDir).load();
      console.log('  项目规范：    ' + projectRules.filter((rule) => rule.lifecycle === 'active').length + ' 条已激活，' + projectRules.filter((rule) => rule.lifecycle === 'candidate').length + ' 条待审');

      // Check workspaces
      const wsContent = await storage.read('harness/project/workspaces.json');
      if (wsContent) {
        try {
          const ws = JSON.parse(wsContent);
          if (ws.workspaces && ws.workspaces.length > 0) {
            console.log('');
            console.log('  Workspaces:');
            for (const w of ws.workspaces) {
              const icon = w.role === 'hub' ? '★' : '○';
              console.log('    ' + icon + ' ' + w.id + ' (' + w.role + ') → ' + w.path);
            }
          }
        } catch { /* skip */ }
      }

      console.log('');
    });

  // ── map (business topology) ──
  project
    .command('map')
    .description('显示项目业务拓扑：能力、依赖与代码证据')
    .option('--detail <id>', '查看指定能力的详细信息')
    .action(async (opts: { detail?: string }) => {
      const storage = getStorage();
      const content = await storage.read('harness/project/codegraph/business-map.json');
      if (!content) {
        throw new Error('业务地图不存在。请先运行 sovei project onboard 生成。');
      }
      let map: {
        generatedAt: string;
        lifecycle: string;
        coverage: { truncated: boolean; reasons: string[]; candidateSourceFiles: number; contentFilesScanned: number };
        capabilities: Array<{
          id: string; name: string; description: string; confidence: string;
          entrySurfaces: string[]; contracts: string[];
          upstreamCapabilities: string[]; downstreamCapabilities: string[];
          externalDependencies: string[]; redlineCandidateIds: string[];
          codeEvidence: string[];
        }>;
        unmappedEvidence: string[];
      };
      try {
        map = JSON.parse(content);
      } catch {
        throw new Error('业务地图文件已损坏，请重新运行 sovei project onboard。');
      }

      if (opts.detail) {
        const cap = map.capabilities.find((c) => c.id === opts.detail || c.name === opts.detail);
        if (!cap) {
          throw new Error('未找到能力：' + opts.detail + '。可用的能力 ID：' + map.capabilities.map((c) => c.id).join(', '));
        }
        console.log('\n  ' + cap.name + ' (' + cap.id + ')');
        console.log('  ' + cap.description);
        console.log('  置信度：      ' + cap.confidence);
        console.log('');
        if (cap.entrySurfaces.length) {
          console.log('  入口：');
          cap.entrySurfaces.forEach((e) => console.log('    · ' + e));
        }
        if (cap.contracts.length) {
          console.log('  契约：');
          cap.contracts.forEach((c) => console.log('    · ' + c));
        }
        if (cap.upstreamCapabilities.length) {
          console.log('  上游依赖：    ' + cap.upstreamCapabilities.join(', '));
        }
        if (cap.downstreamCapabilities.length) {
          console.log('  下游依赖：    ' + cap.downstreamCapabilities.join(', '));
        }
        if (cap.externalDependencies.length) {
          console.log('  外部依赖：    ' + cap.externalDependencies.join(', '));
        }
        if (cap.redlineCandidateIds.length) {
          console.log('  关联红线：    ' + cap.redlineCandidateIds.join(', '));
        }
        if (cap.codeEvidence.length) {
          console.log('  代码证据：');
          cap.codeEvidence.slice(0, 20).forEach((e) => console.log('    · ' + e));
          if (cap.codeEvidence.length > 20) {
            console.log('    ……另有 ' + (cap.codeEvidence.length - 20) + ' 项');
          }
        }
        console.log('');
        return;
      }

      console.log('\n  项目业务拓扑');
      console.log('  ────────────────────────────────────────');
      console.log('  生命周期：    ' + map.lifecycle + '（候选，待人工审查）');
      console.log('  生成时间：    ' + map.generatedAt);
      console.log('  能力数量：    ' + map.capabilities.length);
      console.log('  扫描范围：    ' + map.coverage.candidateSourceFiles + ' 个源文件，读取 ' + map.coverage.contentFilesScanned + ' 个');
      if (map.coverage.truncated) {
        console.log('  覆盖状态：    部分覆盖（' + map.coverage.reasons.join('；') + '）');
      } else {
        console.log('  覆盖状态：    完整覆盖');
      }
      console.log('');

      if (map.capabilities.length === 0) {
        console.log('  未检测到业务能力。');
        console.log('  可能原因：项目结构不符合常规模式，或扫描深度不足。');
        console.log('  可尝试 sovei project onboard --depth 6 重新扫描。\n');
        return;
      }

      console.log('  业务能力');
      console.log('  ────────────────────────────────────────');
      for (const cap of map.capabilities) {
        const icon = cap.confidence === 'high' ? '◆' : cap.confidence === 'medium' ? '◇' : '○';
        const deps = [];
        if (cap.upstreamCapabilities.length) deps.push('↑' + cap.upstreamCapabilities.length);
        if (cap.downstreamCapabilities.length) deps.push('↓' + cap.downstreamCapabilities.length);
        if (cap.externalDependencies.length) deps.push('ext:' + cap.externalDependencies.length);
        const depStr = deps.length ? '  [' + deps.join(' ') + ']' : '';
        console.log('  ' + icon + ' ' + cap.name + depStr);
        console.log('    ' + cap.description);
        if (cap.entrySurfaces.length) {
          console.log('    入口：' + cap.entrySurfaces.slice(0, 3).join(', ') + (cap.entrySurfaces.length > 3 ? ' …' : ''));
        }
        if (cap.contracts.length) {
          console.log('    契约：' + cap.contracts.slice(0, 3).join(', ') + (cap.contracts.length > 3 ? ' …' : ''));
        }
        console.log('');
      }

      if (map.unmappedEvidence.length > 0) {
        console.log('  未归类证据（' + map.unmappedEvidence.length + ' 项）');
        console.log('  ────────────────────────────────────────');
        for (const e of map.unmappedEvidence.slice(0, 10)) {
          console.log('    · ' + e);
        }
        if (map.unmappedEvidence.length > 10) {
          console.log('    ……另有 ' + (map.unmappedEvidence.length - 10) + ' 项');
        }
        console.log('');
      }

      console.log('  查看能力详情：sovei project map --detail <id>');
      console.log('  能力 ID：' + map.capabilities.map((c) => c.id).join(', '));
      console.log('');
    });
}
