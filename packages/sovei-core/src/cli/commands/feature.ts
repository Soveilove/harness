/**
 * Feature Commands
 * archive — 将已完成 Feature 的过程产物折叠到 _archive/ 子目录
 * summary — 从 Feature 事件流 + 各阶段产物生成聚合人可读视图（summary.md）
 *
 * archive 顶层只保留被 context build / cross-feature / workflow 引擎直接依赖的持久文件。
 * summary 是跨阶段聚合的人可读产物，写入顶层，且加入 archive 持久白名单（不被折叠）。
 */

import type { Command } from 'commander';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';
import type { SoveiConfig } from '../../config/types.js';
import { getFeaturePath } from '../../config/loader.js';
import type { WorkflowEngine } from '../../engine/workflow-engine.js';

/** 持久文件白名单——这些文件留在顶层不归档 */
const PERSISTENT_FILES = new Set([
  'decision-log.md',
  'sync-report.md',
  'requirement.md',
  'wayfinder.md',
  'summary.md',
  'sub-change-map.md',
  'exploration.md',
]);

/** 工作流阶段顺序（与 stages 引擎一致） */
const STAGE_ORDER = [
  'explore', 'grill', 'wayfind', 'spec', 'scope', 'plan',
  'tasks', 'implement', 'converge', 'verify', 'learn', 'sync',
];

/** 各阶段 → 主要产物文件（用于时间线渲染与章节说明） */
const STAGE_ARTIFACTS: Record<string, string[]> = {
  explore: ['exploration.md', 'sub-change-map.md'],
  grill: ['decision-log.md'],
  wayfind: ['wayfinder.md'],
  spec: ['spec.md', 'reconciliation.md'],
  scope: ['scope.md', 'coverage-matrix.md'],
  plan: ['plan.md'],
  tasks: ['tasks.md'],
  implement: ['change-manifest.md'],
  converge: ['convergence-report.md'],
  verify: ['evidence.md'],
  learn: ['learning-report.md'],
  sync: ['sync-report.md'],
};

interface ArchiveResult {
  archived: string[];
  skipped: string[];
  retained: string[];
}

/** 事件流中每个事件的行（解析后） */
interface WorkflowEvent {
  timestamp?: string;
  event: {
    type: string;
    stage?: string;
    artifacts?: string[];
    taskId?: string;
    artifact?: string;
    role?: string;
    reason?: string;
  };
}

/** 组装后的聚合视图结构化数据（--json 输出与 markdown 渲染共用） */
interface SummaryData {
  featureId: string;
  status: string;
  riskLevel?: string;
  stages: { stage: string; preparedAt?: string; completedAt?: string; artifacts: string[] }[];
  decisions: { label: string; decision: string; reason: string; rejected?: string }[];
  tasks: { taskId: string; artifact?: string }[];
  overrides: { stage: string; role: string; reason: string }[];
  artifacts: string[];
}

function getStorage(): StorageBackend {
  return container.inject<StorageBackend>(TOKENS.Storage);
}

function getConfig(): SoveiConfig {
  return container.inject<SoveiConfig>(TOKENS.Config);
}

// ──────────────────────────────────────────────
// archive
// ──────────────────────────────────────────────

/**
 * 将已完成 Feature 的过程产物移动到 _archive/ 子目录。
 * 幂等：已在 _archive/ 中的文件跳过，不覆盖。
 */
export async function archiveFeature(
  storage: StorageBackend,
  featurePath: string,
  featureId: string,
): Promise<ArchiveResult> {
  const archived: string[] = [];
  const skipped: string[] = [];
  const retained: string[] = [];

  // 检查 Feature 目录存在（storage.exists 只检查文件，用 list 判断目录是否有内容）
  const allFiles = await storage.list(featurePath);
  const dirExists = allFiles.length > 0 || await storage.isDirectory(featurePath);
  if (!dirExists) {
    throw new Error(`Feature 目录不存在: ${featurePath}`);
  }

  // 检查工作流状态为 completed
  const stateContent = await storage.read(`${featurePath}/workflow-state.yaml`);
  if (!stateContent) {
    throw new Error('无法读取工作流状态: workflow-state.yaml 不存在');
  }
  const statusMatch = stateContent.match(/^status:\s*(\S+)/m);
  const status = statusMatch ? statusMatch[1] : null;
  if (status !== 'completed') {
    throw new Error(`只能归档已完成的 Feature（当前状态: ${status ?? 'unknown'}）`);
  }

  // 列出顶层文件（非递归，不含子目录）——复用前面已查的 allFiles

  for (const file of allFiles) {
    // 非 .md 文件保留在顶层（.yaml、.jsonl、.json 等）
    if (!file.endsWith('.md')) {
      retained.push(file);
      continue;
    }

    // 持久文件白名单保留在顶层
    if (PERSISTENT_FILES.has(file)) {
      retained.push(file);
      continue;
    }

    // 检查 _archive/ 是否已有同名文件
    const archivePath = `${featurePath}/_archive/${file}`;
    const alreadyArchived = await storage.exists(archivePath);
    if (alreadyArchived) {
      skipped.push(file);
      continue;
    }

    // 读取内容 → 写入 _archive/ → 删除原文件
    const content = await storage.read(`${featurePath}/${file}`);
    if (content !== null) {
      await storage.write(archivePath, content);
      await storage.delete(`${featurePath}/${file}`);
      archived.push(file);
    }
  }

  return { archived, skipped, retained };
}

// ──────────────────────────────────────────────
// summary
// ──────────────────────────────────────────────

/**
 * 读取某阶段产物，顶层优先、_archive/ 回退。
 * archive 会把 spec/change-manifest 等过程产物折叠到 _archive/，
 * 因此对已归档 Feature 需回退到 _archive/ 才能还原完整故事线。
 */
async function readArtifact(
  storage: StorageBackend,
  featurePath: string,
  filename: string,
): Promise<string | null> {
  const top = await storage.read(`${featurePath}/${filename}`);
  if (top !== null) return top;
  return storage.read(`${featurePath}/_archive/${filename}`);
}

/** 解析 workflow-state.yaml 的已知键（轻量正则，零依赖） */
function parseState(content: string): { featureId?: string; status?: string; riskLevel?: string; completedStages: string[] } {
  const get = (key: string): string | undefined => {
    const m = content.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim().replace(/^"|"$/g, '') : undefined;
  };
  const completedStages: string[] = [];
  const stageMatch = content.match(/^completedStages:\s*$/m);
  if (stageMatch) {
    const rest = content.slice(stageMatch.index);
    const listMatch = rest.match(/^\s*-\s*"([^"]+)"|^\s*-\s*(\S+)/gm);
    if (listMatch) {
      for (const item of listMatch) {
        const name = item.replace(/^\s*-\s*"?/, '').replace(/"$/, '').trim();
        if (name && name !== 'completedStages') completedStages.push(name);
      }
    }
  }
  return { featureId: get('featureId'), status: get('status'), riskLevel: get('riskLevel'), completedStages };
}

/** 解析 workflow-events.jsonl（逐行 JSON.parse） */
async function parseEvents(
  storage: StorageBackend,
  featurePath: string,
): Promise<WorkflowEvent[]> {
  const raw = await storage.read(`${featurePath}/workflow-events.jsonl`);
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as WorkflowEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is WorkflowEvent => e !== null && !!e.event);
}

/** 从 decision-log.md 提取 D<n> 决策条目 */
function extractDecisions(decisionLog: string | null): SummaryData['decisions'] {
  if (!decisionLog) return [];
  const decisions: SummaryData['decisions'] = [];
  const headerRe = /^###\s+(D\d+):\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  const positions: { index: number; label: string; question: string }[] = [];
  while ((m = headerRe.exec(decisionLog)) !== null) {
    positions.push({ index: m.index, label: m[1], question: m[2] });
  }
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = i + 1 < positions.length ? positions[i + 1].index : decisionLog.length;
    const block = decisionLog.slice(start, end);
    const pick = (field: string): string => {
      const fm = block.match(new RegExp(`\\*\\*${field}:\\*\\*\\s*([^\\n]+)`));
      return fm ? fm[1].trim() : '';
    };
    decisions.push({
      label: positions[i].label,
      decision: pick('决策'),
      reason: pick('理由'),
      rejected: pick('被拒绝方案'),
    });
  }
  return decisions;
}

/** 从 markdown 中提取指定标题下的正文（如 `## 目标`、`## 结论`） */
function extractSection(content: string | null, heading: string): string {
  if (!content) return '';
  const re = new RegExp(`^##\\s+${heading}\\s*$[\\s\\S]*?^##\\s+`, 'm');
  const match = content.match(re);
  if (match) {
    // 去掉结尾的下一标题标记
    return match[0].replace(/\n##\s+[^\n]*$/, '').replace(new RegExp(`^##\\s+${heading}\\s*`), '').trim();
  }
  // 若为最后一个标题，取到末尾
  const last = content.match(new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*)$`, 'm'));
  return last ? last[1].trim() : '';
}

/** 组装聚合视图结构化数据 */
async function buildSummary(
  storage: StorageBackend,
  featurePath: string,
  featureId: string,
): Promise<SummaryData> {
  const stateContent = await storage.read(`${featurePath}/workflow-state.yaml`);
  if (!stateContent) {
    throw new Error(`Feature 不存在或状态缺失: ${featurePath}`);
  }
  const state = parseState(stateContent);

  const events = await parseEvents(storage, featurePath);

  // 时间线：按工作流顺序，记录每阶段的 prepared/completed 时间与产物
  const stages: SummaryData['stages'] = STAGE_ORDER.map((stage) => {
    const prepared = events.find((e) => e.event.type === 'STAGE_PREPARED' && e.event.stage === stage);
    const completed = events.find((e) => e.event.type === 'STAGE_COMPLETE' && e.event.stage === stage);
    return {
      stage,
      preparedAt: prepared?.timestamp,
      completedAt: completed?.timestamp,
      artifacts: completed?.event.artifacts ?? STAGE_ARTIFACTS[stage] ?? [],
    };
  });

  // 任务
  const tasks: SummaryData['tasks'] = events
    .filter((e) => e.event.type === 'TASK_COMPLETE' && e.event.taskId)
    .map((e) => ({ taskId: e.event.taskId as string, artifact: e.event.artifact }));

  // 门禁覆盖
  const overrides: SummaryData['overrides'] = events
    .filter((e) => e.event.type === 'OVERRIDE_CONFIRM')
    .map((e) => ({
      stage: e.event.stage ?? '',
      role: e.event.role ?? '',
      reason: e.event.reason ?? '',
    }));

  // 决策
  const decisionLog = await readArtifact(storage, featurePath, 'decision-log.md');
  const decisions = extractDecisions(decisionLog);

  // 产物清单（顶层 + _archive）
  const artifacts = new Set<string>();
  const topFiles = await storage.list(featurePath);
  for (const f of topFiles) artifacts.add(f);
  const archiveFiles = await storage.list(`${featurePath}/_archive`);
  for (const f of archiveFiles) artifacts.add(`_archive/${f}`);

  return {
    featureId: state.featureId ?? featureId,
    status: state.status ?? 'unknown',
    riskLevel: state.riskLevel,
    stages,
    decisions,
    tasks,
    overrides,
    artifacts: Array.from(artifacts),
  };
}

/**
 * 从产物中提取某章节正文，供 summary 各段使用。
 * 读取顺序：优先顶层，`_archive/` 回退（D5 决策）。
 */
async function readSectionText(
  storage: StorageBackend,
  featurePath: string,
  filename: string,
  heading: string,
): Promise<string> {
  const content = await readArtifact(storage, featurePath, filename);
  return extractSection(content, heading);
}

/**
 * 提取需求描述：spec.md 的 `## 目标` → reconciliation.md 的 `## 1. 需求翻译`
 * → exploration.md 首段 → requirement.md 原文。
 */
async function extractRequirements(
  storage: StorageBackend,
  featurePath: string,
): Promise<string> {
  // spec.md 的 `## 目标` 或 `## 验收标准`（不同 Feature 写法不同）
  const specGoal = await readSectionText(storage, featurePath, 'spec.md', '目标');
  if (specGoal) return specGoal;
  const specAccept = await readSectionText(storage, featurePath, 'spec.md', '验收标准');
  if (specAccept) return specAccept;
  const recon = await readArtifact(storage, featurePath, 'reconciliation.md');
  if (recon) {
    const mt = recon.match(/^\*\*技术理解\*\*：\s*([\s\S]*?)(?=\n\*\*|$)/);
    if (mt && mt[1].trim()) return mt[1].trim();
  }
  // explore 阶段的探索产出：取第一个 ## 标题之前的头部摘要
  const exploration = await readArtifact(storage, featurePath, 'exploration.md');
  if (exploration) {
    const head = exploration.split(/^##\s+/m)[0].trim();
    if (head) return head;
  }
  // 兜底：explore 入口记录的自然语言需求原文
  const requirement = await readArtifact(storage, featurePath, 'requirement.md');
  if (requirement) {
    const head = requirement.split(/^##\s+/m)[0].trim();
    if (head) return head;
  }
  return '';
}

/**
 * 提取变更描述：change-manifest.md 的 `## 目标` 段；回退到 tasks.md 的任务标题。
 */
async function extractChanges(
  storage: StorageBackend,
  featurePath: string,
): Promise<string> {
  const manifest = await readSectionText(storage, featurePath, 'change-manifest.md', '目标');
  if (manifest) return manifest;
  const tasks = await readArtifact(storage, featurePath, 'tasks.md');
  if (tasks) {
    const lines = tasks
      .split('\n')
      .filter((l) => /^\s*- \[ \] TASK-\d+/.test(l))
      .map((l) => l.replace(/^\s*- \[ \]\s*/, '').trim());
    if (lines.length) return lines.join('\n');
  }
  return '';
}

/** 渲染为 Markdown summary.md（async：需读取产物章节文本） */
async function renderMarkdown(
  storage: StorageBackend,
  featurePath: string,
  data: SummaryData,
): Promise<string> {
  const doneStages = data.stages.filter((s) => s.completedAt);
  const requirements = await extractRequirements(storage, featurePath);
  const changes = await extractChanges(storage, featurePath);
  const conclusion = await readSectionText(storage, featurePath, 'sync-report.md', '结论');
  const learning = await readSectionText(storage, featurePath, 'learning-report.md', '学习');

  const lines: string[] = [];
  lines.push(`# Feature Summary — ${data.featureId}`);
  lines.push('');
  lines.push(`> 由 \`sovei feature summary\` 生成。`);
  lines.push('');
  lines.push('## 概览');
  lines.push('');
  lines.push(`- **状态**: ${data.status}`);
  lines.push(`- **风险等级**: ${data.riskLevel ?? '—'}`);
  lines.push(`- **阶段进度**: ${doneStages.length}/${data.stages.length}（${doneStages.map((s) => s.stage).join(' → ')}）`);
  lines.push(`- **任务完成**: ${data.tasks.length}`);
  lines.push(`- **门禁覆盖**: ${data.overrides.length}`);
  lines.push('');

  // 需求
  lines.push('## 需求');
  lines.push('');
  lines.push(requirements || '*未提供明确需求描述*');
  lines.push('');

  // 决策
  lines.push('## 关键决策');
  lines.push('');
  if (data.decisions.length === 0) {
    lines.push('*无决策条目*');
  } else {
    for (const d of data.decisions) {
      const title = d.decision ? firstLine(d.decision) : '';
      lines.push(`### ${d.label}: ${title}`);
      lines.push('');
      if (d.decision) lines.push(`- **决策**: ${d.decision}`);
      if (d.reason) lines.push(`- **理由**: ${d.reason}`);
      if (d.rejected) lines.push(`- **被拒绝方案**: ${d.rejected}`);
      lines.push('');
    }
  }

  // 变更
  lines.push('## 变更');
  lines.push('');
  lines.push(changes || '*未提供变更描述*');
  lines.push('');

  // 验证
  lines.push('## 验证');
  lines.push('');
  if (data.overrides.length) {
    for (const o of data.overrides) {
      lines.push(`- **${o.stage}**（${o.role}）: ${o.reason || '门禁覆盖'}`);
    }
  } else {
    lines.push('*无门禁覆盖记录*');
  }
  lines.push('');

  // 经验
  lines.push('## 经验');
  lines.push('');
  lines.push(learning || '*见 learning-report.md / knowledge-delta.md*');
  lines.push('');

  // 结论
  lines.push('## 结论');
  lines.push('');
  lines.push(conclusion || '*见 sync-report.md 结论段*');
  lines.push('');
  return lines.join('\n');
}

function firstLine(s: string): string {
  return s.split('\n')[0].trim();
}

/**
 * 生成 Feature 聚合视图。
 * 默认写入 specs/<id>/summary.md；jsonOnly 时返回 JSON 字符串（不写文件）。
 */
export async function summaryFeature(
  storage: StorageBackend,
  featurePath: string,
  featureId: string,
  jsonOnly: boolean,
): Promise<string> {
  const data = await buildSummary(storage, featurePath, featureId);

  if (jsonOnly) {
    return JSON.stringify(data, null, 2);
  }

  const markdown = await renderMarkdown(storage, featurePath, data);
  await storage.write(`${featurePath}/summary.md`, markdown);
  return markdown;
}

export function registerFeatureCommands(program: Command): void {
  const feature = program.command('feature').description('Feature 生命周期管理');

  // ── archive ──
  feature
    .command('archive')
    .description('将已完成 Feature 的过程产物归档到 _archive/ 子目录')
    .argument('<id>', 'Feature ID')
    .action(async (featureId: string) => {
      const storage = getStorage();
      const config = getConfig();
      const featurePath = getFeaturePath(config, featureId);

      try {
        const result = await archiveFeature(storage, featurePath, featureId);

        console.log('');
        console.log('  ✓ Feature ' + featureId + ' 归档完成');
        console.log('');

        if (result.archived.length > 0) {
          console.log('  已归档（' + result.archived.length + ' 个文件）:');
          for (const f of result.archived) {
            console.log('    → ' + f);
          }
          console.log('');
        }

        if (result.skipped.length > 0) {
          console.log('  已跳过（已在 _archive/ 中）:');
          for (const f of result.skipped) {
            console.log('    · ' + f);
          }
          console.log('');
        }

        console.log('  保留在顶层（' + result.retained.length + ' 个文件）:');
        for (const f of result.retained) {
          console.log('    ★ ' + f);
        }
        console.log('');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('\n  ✗ ' + message + '\n');
        process.exitCode = 1;
      }
    });

  // ── summary ──
  feature
    .command('summary')
    .description('从事件流与各阶段产物生成聚合人可读视图（summary.md 或 --json）')
    .argument('<id>', 'Feature ID')
    .option('--json', '输出结构化 JSON 到 stdout（不写文件）')
    .action(async (featureId: string, opts: { json?: boolean }) => {
      const storage = getStorage();
      const config = getConfig();
      const featurePath = getFeaturePath(config, featureId);

      try {
        const output = await summaryFeature(storage, featurePath, featureId, !!opts.json);

        if (opts.json) {
          console.log(output);
        } else {
          // 重新组装数据以打印统计摘要（markdown 文本不含结构化计数）
          const summary = await buildSummary(storage, featurePath, featureId);
          console.log('');
          console.log(`  ✓ 已生成 ${featureId} 的 Feature Summary`);
          console.log('');
          console.log(`  路径：specs/${featureId}/summary.md`);
          console.log(`  阶段：${summary.stages.filter((s) => s.completedAt).length}/${summary.stages.length}`);
          console.log(`  决策：${summary.decisions.length}  任务：${summary.tasks.length}  门禁覆盖：${summary.overrides.length}`);
          console.log('');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('\n  ✗ ' + message + '\n');
        process.exitCode = 1;
      }
    });

  // ── split ──
  feature
    .command('split')
    .description('将 Feature 拆分为多个可独立开发的子变更（scope 完成后可用）')
    .argument('<id>', 'Feature ID')
    .option('--json', '输出拆分提议的 JSON 提示契约（不执行拆分），供 AI 填充后回填')
    .action(async (featureId: string, opts: { json?: boolean }) => {
      const config = getConfig();
      const featurePath = getFeaturePath(config, featureId);

      try {
        if (opts.json) {
          // 输出拆分提议提示契约，供 AI 读取后填充 sub-change-map.md 草稿。
          // 前置条件：explore 完成后即可拆分（exploration.md 存在）；
          // 若 exploration.md 不存在（老 Feature 或未走 explore），回退到 spec.md + scope.md。
          const storage = getStorage();
          const explorationExists = await storage.exists(`${featurePath}/exploration.md`);
          const specExists = await storage.exists(`${featurePath}/spec.md`);
          const scopeExists = await storage.exists(`${featurePath}/scope.md`);
          if (!explorationExists && (!specExists || !scopeExists)) {
            throw new Error(
              `Cannot split: exploration.md must exist (complete explore stage first), or spec.md and scope.md must exist (complete spec and scope stages first).`,
            );
          }
          const instruction = explorationExists
            ? 'Read exploration.md (and sub-change-map.md if explore already proposed), then propose/refine sub-change divisions.'
            : 'Read spec.md and scope.md, then propose sub-change divisions.';
          const contract = {
            action: 'feature-split-proposal',
            featureId,
            instruction,
            principles: [
              '功能内聚：每个子变更应是一组紧密相关的改动',
              '可独立验证：每个子变更可独立完成 verify',
              '依赖最小化：尽量减少子变更间依赖',
              '一层嵌套：子变更不能再拆子变更',
            ],
            schema: {
              subChanges: [
                {
                  id: 'SC-<feature>-<NN>',
                  name: 'kebab-case-name',
                  goal: '一句话目标',
                  dependsOn: ['SC-<feature>-<NN>', '...'],
                },
              ],
            },
            output: 'Write the proposal as sub-change-map.md (draft), then run `sovei feature split <id>` without --json to confirm.',
          };
          console.log(JSON.stringify(contract, null, 2));
          return;
        }

        // 执行拆分：读取 sub-change-map.md（AI 已填充），解析后调用 engine.splitFeature
        const storage = getStorage();
        const mapPath = `${featurePath}/sub-change-map.md`;
        const mapExists = await storage.exists(mapPath);
        if (!mapExists) {
          throw new Error(
            `sub-change-map.md not found. Run \`sovei feature split ${featureId} --json\` first to get the proposal contract, `
            + 'fill it with AI, then re-run this command to confirm the split.',
          );
        }
        const mapContent = await storage.read(mapPath);
        if (!mapContent) {
          throw new Error('sub-change-map.md is empty or unreadable.');
        }
        const subChanges = parseSubChangeMap(mapContent);
        if (subChanges.length === 0) {
          throw new Error('No sub-changes found in sub-change-map.md. Ensure the table is filled.');
        }

        const engine = container.inject<WorkflowEngine>(TOKENS.WorkflowEngine);
        const newState = await engine.splitFeature(featureId, subChanges);

        console.log('');
        console.log(`  ✓ Feature ${featureId} 已拆分为 ${newState.subChanges.length} 个子变更`);
        console.log('');
        console.log('  子变更清单：');
        for (const sc of newState.subChanges) {
          const dep = sc.dependsOn.length ? ` (依赖: ${sc.dependsOn.join(', ')})` : '';
          console.log(`    · ${sc.id} — ${sc.name}${dep}`);
        }
        console.log('');
        console.log('  推进方式：');
        console.log(`    sovei workflow plan ${featureId} --sub-change <id>`);
        console.log('');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('\n  ✗ ' + message + '\n');
        process.exitCode = 1;
      }
    });

  // ── sub-change ──
  const subChange = feature.command('sub-change').description('子变更管理');

  subChange
    .command('list')
    .description('列出 Feature 的所有子变更及其状态')
    .argument('<id>', 'Feature ID')
    .option('--json', '输出结构化 JSON')
    .action(async (featureId: string, opts: { json?: boolean }) => {
      try {
        const engine = container.inject<WorkflowEngine>(TOKENS.WorkflowEngine);
        const list = await engine.listSubChanges(featureId);

        if (opts.json) {
          console.log(JSON.stringify(list, null, 2));
          return;
        }

        if (list.length === 0) {
          console.log(`\n  Feature ${featureId} 无子变更（未拆分）\n`);
          return;
        }

        console.log('');
        console.log(`  Feature ${featureId} 子变更清单（${list.length}）`);
        console.log('');
        for (const sc of list) {
          const blockedTag = sc.blocked ? ` [阻塞: ${sc.blockedBy.join(',')}]` : '';
          const stageTag = sc.currentStage ? ` @ ${sc.currentStage}` : '';
          console.log(`  ${sc.id}  ${sc.name}  — ${sc.status}${stageTag}${blockedTag}`);
          console.log(`    目标：${sc.goal}`);
          if (sc.dependsOn.length) {
            console.log(`    依赖：${sc.dependsOn.join(', ')}`);
          }
          console.log('');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('\n  ✗ ' + message + '\n');
        process.exitCode = 1;
      }
    });
}

/**
 * Parse sub-change-map.md table into structured sub-change definitions.
 * Expects markdown table rows: `| SC-id | name | goal | deps | status |`
 */
function parseSubChangeMap(content: string): Array<{ id: string; name: string; goal: string; dependsOn: string[] }> {
  const result: Array<{ id: string; name: string; goal: string; dependsOn: string[] }> = [];
  const lines = content.split('\n');
  for (const line of lines) {
    // Match table rows starting with | SC-
    const match = line.match(/^\|\s*(SC-[^\s|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|/);
    if (!match) continue;
    const [, id, name, goal, deps] = match;
    const dependsOn = deps.trim() === '—' || deps.trim() === '' || deps.trim() === '-'
      ? []
      : deps.split(',').map((d) => d.trim()).filter(Boolean);
    result.push({ id: id.trim(), name: name.trim(), goal: goal.trim(), dependsOn });
  }
  return result;
}
