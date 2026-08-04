/**
 * Project Commands
 * init     - New project: create structure + seed knowledge based on tech stack
 * onboard  - Existing project: scan codebase, detect stack, bootstrap knowledge
 * status   - Show current project status
 */

import type { Command } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import type { SoveiConfig } from '../../config/types.js';
import type { Logger } from '../../providers/tokens.js';
import { KnowledgeStore } from '../../knowledge/store.js';
import { FilesystemStorage } from '../../storage/filesystem.js';
import { ProjectScanner } from '../../config/scanner.js';
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

export function registerProjectCommands(program: Command): void {
  const project = program.command('project').description('项目管理命令');

  // ── init (new project) ──
  project
    .command('init')
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
    .action(async (opts: { depth: string; maxEntries: string; maxBusinessFiles: string }) => {
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
      // Ensure governance infrastructure exists (same as project init)
      if (!(await storage.exists('harness/project/governance/redlines.json'))) {
        await storage.write('harness/project/governance/redlines.json', '[]');
        console.log('  · 已创建 harness/project/governance/redlines.json');
      }

      // Existing projects are adapted into candidates only. Re-running onboard is
      // idempotent and preserves rules that have already been reviewed.
      const rulesRepository = new ProjectRulesRepository(storage, currentConfig.rulesDir);
      const adaptedRules = await adaptProjectRules(storage, rulesRepository);
      console.log(adaptedRules.written
        ? '  · 已适配 ' + adaptedRules.total + ' 条项目规范候选（未自动激活）'
        : '  · 未发现项目原有 Agent/IDE Rules，未生成规范候选');

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

      // Write candidate redlines to seed file for human review (never auto-activate)
      const seedPath = 'harness/project/governance/redlines-seed.json';
      const seedData = {
        schemaVersion: 1 as const,
        generatedAt: new Date().toISOString(),
        scannerVersion: '2.1.0-dev.2',
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
}
