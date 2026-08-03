import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const cli = join(import.meta.dirname, '..', 'dist', 'cli', 'index.js');

test('CLI creates a baseline-bound material change with the active redline matrix', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'sovei-change-cli-'));
  const project = join(fixture, 'project');
  try {
    await execFileAsync(process.execPath, [cli, 'project', 'init', project, '--blank']);
    await execFileAsync(process.execPath, [cli, '--root', project, 'workflow', 'bootstrap', '001-pivot']);
    await execFileAsync(process.execPath, [
      cli, '--root', project, 'governance', 'redline', 'add', 'AUTH_REQUIRED',
      '--title', 'Authentication', '--rule', 'Protected actions require authentication', '--enforcement', 'absolute',
    ]);
    await execFileAsync(process.execPath, [
      cli, '--root', project, 'workflow', 'change', '001-pivot',
      '--target', 'load', '--summary', 'Replace the feature direction', '--reason', 'Approved product pivot',
      '--dimensions', 'business-direction,business-redline',
    ]);

    const directory = join(project, 'specs', '001-pivot', 'change-requests');
    const files = await readdir(directory);
    assert.equal(files.length, 1);
    const request = JSON.parse(await readFile(join(directory, files[0]), 'utf8'));
    assert.equal(request.baseEventRevision, 0);
    assert.equal(request.baseCurrentStage, 'load');
    assert.equal(request.redlineAssessments[0].redlineId, 'AUTH_REQUIRED');
    assert.equal(request.redlineAssessments[0].disposition, 'review-required');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
