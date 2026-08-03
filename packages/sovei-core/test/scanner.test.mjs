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
