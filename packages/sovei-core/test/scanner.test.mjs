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

test('scanner excludes build artifacts, hashed chunks, and static assets from analysis', async () => {
  await fixture(async (root, storage) => {
    await writeJson(root, 'package.json', { dependencies: { axios: '^1.0.0' } });
    const files = {
      // 真实业务源码
      'src/services/billing/index.ts': "import axios from 'axios'; export const charge = () => axios.post('/api/billing/charge');",
      // 构建产物目录（Koa 静态托管前端产物）
      'server/views/assets/index-C6asO8Wa.js': 'export const x = 1;',
      'server/views/assets/app-a1b2c3d.css': '.x{color:red}',
      // 哈希命名的 chunk 与图片
      'src/assets/CheckOutlined-BF27CRjy.png': 'not-an-image',
      'vendor/index-9f8e7d6.js': 'window.vendor = true;',
      // 类型声明产物
      'src/services/billing/index.d.ts': 'export declare const charge: (url: string) => void;',
    };
    for (const [path, content] of Object.entries(files)) {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    }

    const result = await new ProjectScanner(storage).scan(10, 1000, 500);

    // server/views 整棵子树被跳过：不应出现在目录地图中
    const codeMap = result.generatedKnowledge.find((entry) => entry.type === 'code-map');
    assert.ok(codeMap);
    assert.doesNotMatch(codeMap.content, /server\/views/);
    assert.doesNotMatch(codeMap.content, /index-C6asO8Wa/);

    // 哈希 chunk / 图片 / .d.ts 被过滤
    assert.doesNotMatch(codeMap.content, /CheckOutlined-BF27CRjy/);
    assert.doesNotMatch(codeMap.content, /9f8e7d6/);
    assert.doesNotMatch(codeMap.content, /\.d\.ts/);

    // 业务能力只来自真实源码，不含 server/views 产物
    const billing = result.businessMap.capabilities.find((item) => item.id === 'billing');
    assert.ok(billing, 'billing 能力应来自真实业务源码');
    assert.ok(billing.codeEvidence.some((s) => s.includes('src/services/billing/index.ts')));
    assert.ok(billing.contracts.includes('/api/billing/charge'));

    // 过滤计数应大于 0，且真实文件仍被发现
    assert.ok(result.coverage.filteredDiscovered > 0);
    assert.ok(result.coverage.filesDiscovered > 0);
  });
});

test('scanner does not misdetect a test suite from specs/ doc directories', async () => {
  await fixture(async (root, storage) => {
    await writeJson(root, 'package.json', { name: 'docs-only' });
    // specs/ 是文档目录，不是测试；也没有任何真实测试文件
    const files = {
      'docs/superpowers/specs/architecture.md': '# Architecture spec',
      'src/services/auth.ts': 'export const login = () => null;',
    };
    for (const [path, content] of Object.entries(files)) {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    }

    const result = await new ProjectScanner(storage).scan(10, 1000, 500);

    assert.ok(!result.detectedPatterns.includes('Test suite present'),
      '仅存在 specs/ 文档目录时不应判定为测试套件');
  });
});

test('scanner detects a real test suite from test files, not specs/ docs', async () => {
  await fixture(async (root, storage) => {
    await writeJson(root, 'package.json', { name: 'has-tests' });
    const files = {
      'docs/specs/api.md': '# API spec docs (not a test)',
      'src/services/auth.ts': 'export const login = () => null;',
      'src/services/auth.test.ts': "import { test } from 'node:test'; test('x', () => {});",
    };
    for (const [path, content] of Object.entries(files)) {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    }

    const result = await new ProjectScanner(storage).scan(10, 1000, 500);

    assert.ok(result.detectedPatterns.includes('Test suite present'),
      '存在真实测试文件时应判定为测试套件');
  });
});

test('scanner defaults reach deep enough for enterprise-style nested business trees', async () => {
  await fixture(async (root, storage) => {
    await writeJson(root, 'package.json', { name: 'deep' });
    // 构造 8 层嵌套业务目录
    let dir = 'src/views/placement/StrategyDevMgmt/DailyBudget/DetailPanel/InnerCard/FormRow';
    const files = {
      [dir + '/index.ts']: 'export const row = 1;',
      'src/services/placement/service.ts': 'export const svc = 1;',
    };
    for (const [path, content] of Object.entries(files)) {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    }

    // 默认深度 10 应能覆盖 8 层嵌套
    const result = await new ProjectScanner(storage).scan();

    const codeMap = result.generatedKnowledge.find((entry) => entry.type === 'code-map');
    assert.match(codeMap.content, /FormRow/);
    assert.ok(!result.coverage.truncated, '默认深度下 8 层嵌套不应被截断');
  });
});
