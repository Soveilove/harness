import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { loadConfig } from '../dist/index.js';

const execFileAsync = promisify(execFile);
const cli = join(import.meta.dirname, '..', 'dist', 'cli', 'index.js');

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'sovei-project-'));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test('loadConfig reads and merges the project declaration', async () => {
  await fixture(async (root) => {
    const directory = join(root, 'harness', 'project');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'project.config.json'), JSON.stringify({
      project: { name: 'real-project', techStack: { framework: 'vue' } },
      workflow: { version: '2.1.0' },
    }), 'utf8');
    const config = loadConfig(root);
    assert.equal(config.project.name, 'real-project');
    assert.equal(config.project.techStack.framework, 'vue');
    assert.equal(config.workflow.stageOrder.length, 12);
  });
});

test('project init writes to its path argument, not the global root', async () => {
  await fixture(async (root) => {
    const commandRoot = join(root, 'command-root');
    const target = join(root, 'new-project');
    await mkdir(commandRoot, { recursive: true });
    await execFileAsync(process.execPath, [cli, '--root', commandRoot, 'project', 'init', target, '--blank']);
    const declaration = JSON.parse(await readFile(join(target, 'harness', 'project', 'project.config.json'), 'utf8'));
    assert.equal(declaration.project.name, 'new-project');
    assert.deepEqual(
      JSON.parse(await readFile(join(target, 'harness', 'project', 'governance', 'redlines.json'), 'utf8')),
      [],
    );
    assert.deepEqual(
      JSON.parse(await readFile(join(target, 'harness', 'project', 'rules', 'project.rules.json'), 'utf8')),
      { schemaVersion: 1, rules: [] },
    );
    await assert.rejects(access(join(commandRoot, 'harness', 'project', 'project.config.json')));
  });
});

test('non-blank project init also keeps the Rules container empty', async () => {
  await fixture(async (root) => {
    const target = join(root, 'new-project');
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', target, '--name', 'new-project']);
    const document = JSON.parse(await readFile(join(target, 'harness', 'project', 'rules', 'project.rules.json'), 'utf8'));
    assert.deepEqual(document, { schemaVersion: 1, rules: [] });
  });
});

test('workflow CLI uses Simplified Chinese guidance while preserving commands', async () => {
  await fixture(async (root) => {
    const { stdout } = await execFileAsync(process.execPath, [cli, '--root', root, 'workflow', 'bootstrap', '001-chinese-output']);
    assert.match(stdout, /已初始化 Feature：001-chinese-output/);
    assert.match(stdout, /Sovei 工作流状态/);
    assert.match(stdout, /下一步命令：\s+sovei workflow load 001-chinese-output/);
    await execFileAsync(process.execPath, [cli, '--root', root, 'workflow', 'load', '001-chinese-output', '--complete']);
    const grill = await execFileAsync(process.execPath, [cli, '--root', root, 'workflow', 'grill', '001-chinese-output']);
    assert.match(grill.stdout, /grill 已触发：CLI 负责生成决策提示契约/);
    assert.match(grill.stdout, /区分事实核实.*范围性决策.*decision-log\.md.*--complete/);
  });
});

test('project init preserves an existing project declaration and AGENTS.md without --force', async () => {
  await fixture(async (root) => {
    const target = join(root, 'existing-project');
    await mkdir(join(target, 'harness', 'project'), { recursive: true });
    const customAgents = '# Custom AGENTS\n\nManually maintained guidance.\n';
    const customConfig = JSON.stringify({ project: { name: 'existing-project' }, workflow: { version: '2.3.2' } }, null, 2);
    await writeFile(join(target, 'AGENTS.md'), customAgents, 'utf8');
    await writeFile(join(target, 'harness', 'project', 'project.config.json'), customConfig, 'utf8');
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', target, '--blank']);
    assert.equal(await readFile(join(target, 'AGENTS.md'), 'utf8'), customAgents);
    assert.equal(await readFile(join(target, 'harness', 'project', 'project.config.json'), 'utf8'), customConfig);
  });
});

test('project init --force overwrites an existing AGENTS.md', async () => {
  await fixture(async (root) => {
    const target = join(root, 'existing-project');
    await mkdir(join(target, 'harness', 'project'), { recursive: true });
    await writeFile(join(target, 'AGENTS.md'), '# Custom AGENTS\n\nManually maintained guidance.\n', 'utf8');
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', target, '--blank', '--force']);
    const content = await readFile(join(target, 'AGENTS.md'), 'utf8');
    assert.match(content, /## Sovei Workflow/);
    assert.doesNotMatch(content, /Manually maintained guidance/);
  });
});

test('project init generates AGENTS.md for a fresh target', async () => {
  await fixture(async (root) => {
    const target = join(root, 'new-project');
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', target, '--blank']);
    const content = await readFile(join(target, 'AGENTS.md'), 'utf8');
    assert.match(content, /## Sovei Workflow/);
    assert.match(content, /load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync/);
  });
});

test('onboard is idempotent for generated candidate knowledge', async () => {
  await fixture(async (root) => {
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'existing-app', dependencies: { vue: '^3.0.0' } }), 'utf8');
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'onboard']);
    const first = JSON.parse(await readFile(join(root, 'harness', 'project', 'knowledge', 'code-map.json'), 'utf8'));
    first[0].lifecycle = 'stable';
    first[0].evidence = [first[0].evidence[0], { ...first[0].evidence[0], feature: 'review-2' }, { ...first[0].evidence[0], feature: 'review-3' }];
    first[0].promotedAt = new Date().toISOString();
    await writeFile(join(root, 'harness', 'project', 'knowledge', 'code-map.json'), JSON.stringify(first), 'utf8');
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'onboard']);
    const second = JSON.parse(await readFile(join(root, 'harness', 'project', 'knowledge', 'code-map.json'), 'utf8'));
    assert.equal(second.length, first.length);
    assert.deepEqual(second.map((entry) => entry.id), first.map((entry) => entry.id));
    assert.equal(second[0].lifecycle, 'stable');
  });
});

test('onboard reports nested packages while preserving root project identity', async () => {
  await fixture(async (root) => {
    await writeFile(join(root, 'package.json'), JSON.stringify({
      name: 'root-project',
      description: 'Root authority',
    }), 'utf8');
    const packageDir = join(root, 'packages', 'tool');
    await mkdir(join(packageDir, 'src'), { recursive: true });
    await writeFile(join(packageDir, 'package.json'), JSON.stringify({
      name: '@example/tool',
      type: 'module',
      bin: { tool: 'dist/cli.js' },
    }), 'utf8');
    await writeFile(join(packageDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }), 'utf8');
    await writeFile(join(packageDir, 'src', 'index.ts'), 'export const tool = true;', 'utf8');

    const { stdout } = await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'onboard']);

    assert.match(stdout, /发现的软件包/);
    assert.match(stdout, /扫描覆盖/);
    assert.match(stdout, /business-map\.json/);
    assert.match(stdout, /未发现项目原有 Agent\/IDE Rules，未生成规范候选/);
    assert.match(stdout, /packages\/tool \(@example\/tool\)/);
    assert.match(stdout, /入口：packages\/tool\/dist\/cli\.js/);
    const declaration = JSON.parse(await readFile(join(root, 'harness', 'project', 'project.config.json'), 'utf8'));
    assert.equal(declaration.project.name, 'root-project');
    assert.equal(declaration.project.description, 'Root authority');
    assert.equal(declaration.project.techStack.language, 'TypeScript');
    const codeMap = JSON.parse(await readFile(join(root, 'harness', 'project', 'knowledge', 'code-map.json'), 'utf8'));
    assert.equal(codeMap[0].lifecycle, 'candidate');
    assert.match(codeMap[0].content, /packages\/tool \(`@example\/tool`\)/);
    assert.match(codeMap[0].content, /packages\/tool\/dist\/cli\.js/);
    const businessMap = JSON.parse(await readFile(join(root, 'harness', 'project', 'codegraph', 'business-map.json'), 'utf8'));
    assert.equal(businessMap.lifecycle, 'candidate');
    assert.equal(businessMap.generator.mode, 'builtin-static-analysis');
    await assert.rejects(access(join(root, 'harness', 'project', 'rules', 'adapted.rules.json')));
  });
});

test('rules CLI deprecates a rule with reviewer evidence', async () => {
  await fixture(async (root) => {
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', root, '--blank']);
    const rulesDir = join(root, 'harness', 'project', 'rules');
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, 'project.rules.json'), JSON.stringify({
      schemaVersion: 1,
      rules: [{
        id: 'CLI_DEPRECATION_RULE',
        title: 'CLI deprecation rule',
        instruction: 'Preserve this rule history.',
        lifecycle: 'active',
        enforcement: 'required',
        appliesTo: { paths: ['**/*'], excludePaths: [], stages: [] },
        verification: [],
        tags: [],
        provenance: { kind: 'declared', sources: ['AGENTS.md'] },
      }],
    }), 'utf8');

    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'rules', 'deprecate', 'CLI_DEPRECATION_RULE',
      '--reviewer', 'maintainer', '--reason', 'Superseded',
    ]);
    const document = JSON.parse(await readFile(join(rulesDir, 'project.rules.json'), 'utf8'));
    const events = await readFile(join(rulesDir, 'rule-events.jsonl'), 'utf8');

    assert.match(stdout, /已废弃项目规范 CLI_DEPRECATION_RULE/);
    assert.equal(document.rules[0].lifecycle, 'deprecated');
    assert.match(events, /PROJECT_RULE_DEPRECATED/);
    assert.match(events, /maintainer/);
  });
});
