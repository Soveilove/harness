import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const cli = join(import.meta.dirname, '..', 'dist', 'cli', 'index.js');

test('CLI charts a map and exposes its first decision frontier', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'sovei-wayfinder-cli-'));
  const project = join(fixture, 'project');
  try {
    await execFileAsync(process.execPath, [cli, 'project', 'init', project, '--blank']);
    await execFileAsync(process.execPath, [
      cli, '--root', project, 'wayfinder', 'chart', '001-large',
      '--destination', 'A signed-off cross-module specification',
      '--notes', 'Ask the billing owner about contract changes',
    ]);
    await execFileAsync(process.execPath, [
      cli, '--root', project, 'wayfinder', 'ticket', 'add', '001-large',
      '--title', 'Confirm billing contract',
      '--question', 'Which renewal behavior is authorized?',
      '--type', 'grilling',
      '--interaction', 'HITL',
    ]);
    const { stdout } = await execFileAsync(process.execPath, [
      cli, '--root', project, 'wayfinder', 'frontier', '001-large',
    ]);
    assert.match(stdout, /Confirm billing contract \(D-001\)/);
    const map = JSON.parse(await readFile(join(project, 'specs', '001-large', 'wayfinder.json'), 'utf8'));
    assert.equal(map.ticketIndex[0].title, 'Confirm billing contract');
    assert.equal(map.ticketIndex[0].interaction, 'HITL');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
