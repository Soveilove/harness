import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { FilesystemStorage } from '../dist/index.js';
import { ProjectScanner } from '../dist/config/scanner.js';

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'sovei-scanner-'));
  try { await run(root, new FilesystemStorage(root)); }
  finally { await rm(root, { recursive: true, force: true }); }
}

async function writeJson(root, path, value) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(value), 'utf8');
}

test('scanner discovers a rootless TypeScript package and qualifies its entry points', async () => {
  await fixture(async (root, storage) => {
    await writeJson(root, 'packages/tool/package.json', {
      name: '@example/tool',
      type: 'module',
      bin: { tool: 'dist/cli.js' },
    });
    await writeJson(root, 'packages/tool/tsconfig.json', { compilerOptions: {} });
    await writeJson(root, 'packages/tool/src/index.ts', { fixture: true });

    const result = await new ProjectScanner(storage).scan(4);

    assert.equal(result.techStack.language, 'TypeScript');
    assert.deepEqual(result.packages, [{
      path: 'packages/tool',
      name: '@example/tool',
      techStack: { language: 'TypeScript' },
      entryPoints: ['packages/tool/dist/cli.js', 'packages/tool/src/index.ts'],
    }]);
    assert.deepEqual(result.entryPoints, ['packages/tool/dist/cli.js', 'packages/tool/src/index.ts']);
    const codeMap = result.generatedKnowledge.find((entry) => entry.type === 'code-map');
    assert.match(codeMap.content, /## 软件包/);
    assert.match(codeMap.content, /packages\/tool \(`@example\/tool`\)/);
  });
});

test('scanner aggregates conflicting package stacks deterministically', async () => {
  await fixture(async (root, storage) => {
    await writeJson(root, 'packages/vue-app/package.json', { dependencies: { vue: '^3.0.0' } });
    await writeJson(root, 'packages/react-app/package.json', { dependencies: { react: '^18.0.0' } });

    const first = await new ProjectScanner(storage).scan(4);
    const second = await new ProjectScanner(storage).scan(4);

    assert.equal(first.techStack.framework, 'React, Vue');
    assert.deepEqual(first.packages.map((pkg) => pkg.path), ['packages/react-app', 'packages/vue-app']);
    assert.deepEqual(second.packages, first.packages);
    assert.deepEqual(second.techStack, first.techStack);
  });
});

test('scanner ignores malformed package manifests without losing valid packages', async () => {
  await fixture(async (root, storage) => {
    await mkdir(join(root, 'packages', 'broken'), { recursive: true });
    await writeFile(join(root, 'packages', 'broken', 'package.json'), '{', 'utf8');
    await writeJson(root, 'packages/valid/package.json', { name: 'valid', main: 'index.js' });

    const result = await new ProjectScanner(storage).scan(4);

    assert.deepEqual(result.packages.map((pkg) => pkg.path), ['packages/valid']);
    assert.deepEqual(result.entryPoints, ['packages/valid/index.js']);
  });
});

test('scanner discovers package manifests written with a UTF-8 BOM', async () => {
  await fixture(async (root, storage) => {
    const target = join(root, 'packages', 'windows-app', 'package.json');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, '\uFEFF' + JSON.stringify({
      name: 'windows-app',
      main: 'src/index.ts',
      homepage: 'https://example.com/windows-app',
    }).replace(/}$/, ',\n// Windows JSONC comment\n}'), 'utf8');

    const result = await new ProjectScanner(storage).scan(4);

    assert.deepEqual(result.packages.map((pkg) => pkg.name), ['windows-app']);
    assert.deepEqual(result.entryPoints, ['packages/windows-app/src/index.ts']);
  });
});

test('scanner automatically builds a reviewable business map with contracts, dependencies, and redlines', async () => {
  await fixture(async (root, storage) => {
    await writeJson(root, 'package.json', { dependencies: { axios: '^1.0.0' } });
    const files = {
      'src/pages/checkout/index.ts': "import { charge } from '../../services/payment/service.js'; export const submit = () => charge('/api/orders');",
      'src/services/payment/service.ts': "import axios from 'axios'; export const charge = (url: string) => axios.post(url);",
      'src/auth/guard.ts': "export const guard = (session: unknown) => { if (!session) throw new Error('login'); };",
    };
    for (const [path, content] of Object.entries(files)) {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    }

    const result = await new ProjectScanner(storage).scan(5, 100, 100);
    const billing = result.businessMap.capabilities.find((item) => item.id === 'billing');

    assert.ok(billing);
    assert.ok(billing.entrySurfaces.includes('src/pages/checkout/index.ts'));
    assert.ok(billing.contracts.includes('/api/orders'));
    assert.ok(billing.externalDependencies.includes('axios'));
    assert.ok(billing.redlineCandidateIds.length > 0);
    assert.equal(result.businessMap.lifecycle, 'candidate');
    assert.equal(result.businessMap.generator.mode, 'builtin-static-analysis');
  });
});

test('scanner reports partial coverage when the repository entry budget is reached', async () => {
  await fixture(async (root, storage) => {
    for (let index = 0; index < 8; index++) {
      const target = join(root, 'src', 'feature-' + index, 'service.ts');
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, 'export const value = ' + index, 'utf8');
    }

    const result = await new ProjectScanner(storage).scan(5, 5, 100);

    assert.equal(result.coverage.truncated, true);
    assert.ok(result.coverage.filesDiscovered + result.coverage.directoriesDiscovered <= 5);
    assert.match(result.coverage.reasons.join(' '), /条目上限/);
    assert.equal(result.businessMap.coverage.truncated, true);
  });
});
