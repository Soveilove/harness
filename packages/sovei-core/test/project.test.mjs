import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
    await assert.rejects(access(join(commandRoot, 'harness', 'project', 'project.config.json')));
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
