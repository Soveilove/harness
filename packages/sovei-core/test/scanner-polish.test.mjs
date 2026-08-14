import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { FilesystemStorage } from '../dist/index.js';
import { ProjectScanner } from '../dist/config/scanner.js';

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'sovei-scanner-polish-'));
  try { await run(root, new FilesystemStorage(root)); }
  finally { await rm(root, { recursive: true, force: true }); }
}

async function writeFileAt(root, path, content) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}

// M2: same code pattern in N files must produce ONE candidate with aggregated source.
test('M2: code pattern detected in multiple files yields one aggregated candidate', async () => {
  await fixture(async (root, storage) => {
    await writeFileAt(root, 'package.json', JSON.stringify({ name: 'app', dependencies: {} }));
    // 4 files all match the manual auth-check pattern
    for (const name of ['guard-a', 'guard-b', 'guard-c', 'guard-d']) {
      await writeFileAt(root, `src/auth/${name}.ts`,
        "export const check = (user: unknown) => { if (!user) throw new Error('nope'); };");
    }
    const result = await new ProjectScanner(storage).scan(10, 1000, 500);
    const manual = result.candidateRedlines.filter((rl) =>
      rl.title === 'Manual authentication check detected');
    assert.equal(manual.length, 1, 'same pattern should yield exactly one candidate');
    // source aggregates all hit files
    const sources = manual[0].source.split(', ');
    assert.equal(sources.length, 4, 'source should aggregate all 4 hit files');
    // structural redline unchanged
    assert.ok(result.candidateRedlines.some((rl) => rl.title === 'Authentication surface detected in code structure'));
  });
});

// M2: candidate ID is stable across rescans (does not embed filename).
test('M2: redline candidate ID is stable and does not embed filename', async () => {
  await fixture(async (root, storage) => {
    await writeFileAt(root, 'package.json', JSON.stringify({ name: 'app', dependencies: {} }));
    await writeFileAt(root, 'src/auth/guard.ts',
      "export const check = (user: unknown) => { if (!user) throw new Error('nope'); };");
    const first = await new ProjectScanner(storage).scan(10, 1000, 500);
    const id1 = first.candidateRedlines.find((rl) => rl.title === 'Manual authentication check detected')?.id;
    assert.ok(id1 && !/guard/i.test(id1), 'ID should not embed filename: ' + id1);
    // rename file -> ID must not change
    await writeFileAt(root, 'src/auth/renamed.ts',
      "export const check = (user: unknown) => { if (!user) throw new Error('nope'); };");
    const second = await new ProjectScanner(storage).scan(10, 1000, 500);
    const id2 = second.candidateRedlines.find((rl) => rl.title === 'Manual authentication check detected')?.id;
    assert.equal(id1, id2, 'ID must be stable across rescans despite filename rename');
  });
});

// M1: packages under apps/, libs/, and nested packages/ are discovered.
test('M1: discovers packages under apps, libs, and nested packages dirs', async () => {
  await fixture(async (root, storage) => {
    await writeFileAt(root, 'package.json', JSON.stringify({ name: 'root', workspaces: ['apps/*', 'libs/*'] }));
    await writeFileAt(root, 'apps/web/package.json', JSON.stringify({ name: 'web', dependencies: { react: '^18' } }));
    await writeFileAt(root, 'libs/shared/package.json', JSON.stringify({ name: 'shared', main: 'index.ts' }));
    await writeFileAt(root, 'packages/group/tool/package.json', JSON.stringify({ name: '@scope/tool', main: 'src/index.ts' }));
    const result = await new ProjectScanner(storage).scan(10, 1000, 500);
    const paths = result.packages.map((pkg) => pkg.path);
    assert.ok(paths.includes('apps/web'), 'apps/web should be discovered');
    assert.ok(paths.includes('libs/shared'), 'libs/shared should be discovered');
    assert.ok(paths.includes('packages/group/tool'), 'nested packages/group/tool should be discovered');
  });
});

// M3: incremental rescan with changedFiles only re-scans those files (redline code surface).
test('M3: incremental rescan filters code-surface reads by changed files', async () => {
  await fixture(async (root, storage) => {
    await writeFileAt(root, 'package.json', JSON.stringify({ name: 'app', dependencies: {} }));
    await writeFileAt(root, 'src/auth/a.ts',
      "export const check = (user: unknown) => { if (!user) throw new Error('nope'); };");
    await writeFileAt(root, 'src/billing/b.ts', 'export const charge = () => 1;');
    // Full scan first
    const full = await new ProjectScanner(storage).scan(10, 1000, 500);
    const fullAuth = full.candidateRedlines.find((rl) => rl.title === 'Manual authentication check detected');
    assert.ok(fullAuth, 'full scan should detect auth pattern');
    // Incremental scan with only billing file changed
    const inc = await new ProjectScanner(storage).scan(10, 1000, 500, ['src/billing/b.ts']);
    const incAuth = inc.candidateRedlines.filter((rl) => rl.title === 'Manual authentication check detected');
    // auth file not in changed set -> not re-scanned, so auth candidate absent (no stale reuse in this layer)
    assert.equal(incAuth.length, 0, 'changed-files filter should skip unchanged auth file');
  });
});
