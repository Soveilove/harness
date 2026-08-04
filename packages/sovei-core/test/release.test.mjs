import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const packageRoot = join(import.meta.dirname, '..');
const releaseCli = join(packageRoot, 'dist', 'release', 'sovei.js');

test('release CLI is a runnable obfuscated bundle without source maps', async () => {
  const { stdout } = await execFileAsync(process.execPath, [releaseCli, '--version']);
  const packageJson = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const releaseCode = await readFile(releaseCli, 'utf8');
  const distFiles = await readdir(join(packageRoot, 'dist'), { recursive: true });

  assert.equal(stdout.trim(), packageJson.version);
  assert.ok(releaseCode.startsWith('#!/usr/bin/env node\n'));
  assert.doesNotMatch(releaseCode, /sourceMappingURL|class ProjectScanner|class BusinessMapScanner/);
  assert.equal(distFiles.some((file) => file.endsWith('.map')), false);
  assert.deepEqual(packageJson.files, ['dist/release/sovei.js', 'LICENSE.md']);
  assert.equal(packageJson.bin.sovei, 'dist/release/sovei.js');
});
