import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import {
  ArchitectureAnalyzer,
  ArchitectureRepository,
  DEFAULT_ARCHITECTURE_POLICY,
  MemoryStorage,
} from '../dist/index.js';

const execFileAsync = promisify(execFile);
const cli = join(import.meta.dirname, '..', 'dist', 'cli', 'index.js');

async function withFixture(files, run) {
  const root = await mkdtemp(join(tmpdir(), 'sovei-architecture-'));
  try {
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(root, path);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, content, 'utf8');
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('large stable file is observed but not forced into refactoring', async () => {
  const stableLines = Array.from({ length: 2500 }, (_, index) =>
    `export const value${index} = ${index};`,
  ).join('\n');

  await withFixture({ 'src/stable-table.ts': stableLines }, async (root) => {
    const analyzer = new ArchitectureAnalyzer(root, DEFAULT_ARCHITECTURE_POLICY);
    const snapshot = await analyzer.scan(['src']);
    const metric = snapshot.modules[0];

    assert.equal(metric.lines, 2500);
    assert.deepEqual(metric.signals.map((signal) => signal.kind), ['large-file']);
    assert.equal(metric.status, 'watch');
  });
});

test('overlapping size, structure, complexity, and responsibility pressure requires governance', async () => {
  const branchLines = Array.from({ length: 260 }, (_, index) =>
    `  if (input === ${index}) { fetch('/api/${index}'); store.value = route.path; }`,
  ).join('\n');
  const filler = Array.from({ length: 1900 }, (_, index) => `  const item${index} = ${index};`).join('\n');
  const content = [
    "import { watch } from 'vue';",
    'export function processEverything(input) {',
    "  localStorage.setItem('input', String(input));",
    '  watch(() => input, () => addEventListener(\'resize\', processEverything));',
    branchLines,
    filler,
    '  return input;',
    '}',
  ].join('\n');

  await withFixture({ 'src/god-module.ts': content }, async (root) => {
    const analyzer = new ArchitectureAnalyzer(root, DEFAULT_ARCHITECTURE_POLICY);
    const snapshot = await analyzer.scan(['src']);
    const metric = snapshot.modules[0];
    const signals = new Set(metric.signals.map((signal) => signal.kind));

    assert.equal(metric.status, 'refactor-required');
    assert.ok(signals.has('large-file'));
    assert.ok(signals.has('long-function'));
    assert.ok(signals.has('high-complexity'));
    assert.ok(signals.has('mixed-responsibilities'));
  });
});

test('accepted architecture debt preserves strategy and decision', async () => {
  const storage = new MemoryStorage();
  const repository = new ArchitectureRepository(storage);
  const metric = {
    path: 'src/editor.ts',
    language: 'ts',
    lines: 1800,
    codeLines: 1500,
    branchCount: 80,
    maxFunctionLines: 240,
    longestFunctions: [],
    fanIn: 12,
    fanOut: 8,
    churn90Days: 22,
    responsibilityCount: 6,
    dependencies: [],
    cycleMembers: [],
    score: 88,
    status: 'refactor-required',
    signals: [
      { kind: 'large-file', severity: 'warning', value: 1800, threshold: 800, message: 'large' },
      { kind: 'high-churn', severity: 'critical', value: 22, threshold: 20, message: 'hot' },
      { kind: 'mixed-responsibilities', severity: 'warning', value: 6, threshold: 4, message: 'mixed' },
    ],
  };

  const entry = await repository.accept(metric, 'Repeated feature conflicts');
  assert.equal(entry.status, 'accepted');
  assert.equal(entry.strategy, 'expand-migrate-contract');
  assert.equal((await repository.loadDebt()).length, 1);
});

test('resolves NodeNext .js imports to TypeScript sources and detects cycles', async () => {
  await withFixture({
    'src/a.ts': "import { b } from './b.js';\nexport const a = b + 1;",
    'src/b.ts': "import { a } from './a.js';\nexport const b = a + 1;",
  }, async (root) => {
    const analyzer = new ArchitectureAnalyzer(root, DEFAULT_ARCHITECTURE_POLICY);
    const snapshot = await analyzer.scan(['src']);
    const a = snapshot.modules.find((module) => module.path === 'src/a.ts');
    const b = snapshot.modules.find((module) => module.path === 'src/b.ts');

    assert.deepEqual(a.dependencies, ['src/b.ts']);
    assert.deepEqual(b.dependencies, ['src/a.ts']);
    assert.deepEqual(a.cycleMembers, ['src/b.ts']);
    assert.deepEqual(b.cycleMembers, ['src/a.ts']);
  });
});

test('architecture check scans current source without requiring a saved snapshot', async () => {
  const policy = {
    version: 'test',
    thresholds: {
      fileLinesWarning: 2,
      fileLinesCritical: 3,
      functionLinesWarning: 2,
      functionLinesCritical: 3,
    },
    statusScores: { watch: 1, refactorCandidate: 10, refactorRequired: 20 },
    requiredPressureDimensions: 2,
  };
  await withFixture({
    'src/current.ts': 'export function current(input) {\n  if (input) { return 1; }\n  return 0;\n}\n',
    'harness/project/architecture/health-policy.json': JSON.stringify(policy),
  }, async (root) => {
    await assert.rejects(
      execFileAsync(process.execPath, [cli, '--root', root, 'architecture', 'check', '--paths', 'src']),
      (error) => error.code === 2 && /fitness check failed/.test(error.stderr),
    );
  });
});
