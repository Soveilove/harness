import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const cli = join(import.meta.dirname, '..', 'dist', 'cli', 'index.js');

test('quick CLI escalates when the target scope is not explicit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-quick-cli-'));
  try {
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', root, '--blank']);
    const { stdout } = await execFileAsync(process.execPath, [cli, '--root', root, 'quick', 'fix parser', '--json']);
    const result = JSON.parse(stdout);
    assert.equal(result.run.status, 'escalated');
    assert.equal(result.run.phase, 'report');
    assert.equal(result.git, null);
    const usage = await readFile(join(root, 'harness', 'project', 'usage.jsonl'), 'utf8');
    assert.match(usage, /"event":"run-start"/);
    assert.match(usage, /"event":"context-selected"/);
    assert.match(usage, /"event":"run-end"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('quick CLI completes only when the real diff stays in scope', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-quick-success-'));
  try {
    await writeFile(join(root, 'target.txt'), 'before\n');
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', root, '--blank']);
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
    await execFileAsync('git', ['config', 'user.name', 'Sovei Test'], { cwd: root });
    await execFileAsync('git', ['add', '.'], { cwd: root });
    await execFileAsync('git', ['commit', '-m', 'baseline'], { cwd: root });
    await writeFile(join(root, 'target.txt'), 'after\n');
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'quick', 'update target', '--paths', 'target.txt', '--json',
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.run.status, 'completed');
    assert.deepEqual(result.run.actualDiff, ['target.txt']);
    assert.equal(result.git.status, 'verified');
    assert.equal(await readFile(join(root, 'harness', 'project', 'usage.jsonl'), 'utf8').then((value) => value.includes('workflow-events')), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('quick CLI does not report completion without a real implementation diff', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-quick-no-diff-'));
  try {
    await writeFile(join(root, 'target.txt'), 'before\n');
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', root, '--blank']);
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
    await execFileAsync('git', ['config', 'user.name', 'Sovei Test'], { cwd: root });
    await execFileAsync('git', ['add', '.'], { cwd: root });
    await execFileAsync('git', ['commit', '-m', 'baseline'], { cwd: root });
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', root, 'quick', 'update target', '--paths', 'target.txt', '--json',
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.run.status, 'stopped');
    assert.equal(result.run.actualDiff.length, 0);
    assert.match(result.report.join(' '), /尚未观察到目标文件/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test('project init preserves usage history and adds the quick declaration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-quick-init-'));
  try {
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', root, '--blank']);
    const usagePath = join(root, 'harness', 'project', 'usage.jsonl');
    await writeFile(usagePath, 'historical-event\n', 'utf8');
    await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'init', root, '--blank', '--force']);
    assert.equal(await readFile(usagePath, 'utf8'), 'historical-event\n');
    assert.match(await readFile(join(root, 'AGENTS.md'), 'utf8'), /sovei quick <target>/);
    assert.match(await readFile(join(root, '.gitignore'), 'utf8'), /harness\/project\/usage\.jsonl/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void mkdir;
