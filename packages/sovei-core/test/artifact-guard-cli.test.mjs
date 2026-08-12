import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const cli = join(import.meta.dirname, '..', 'dist', 'cli', 'index.js');

// Current CLI version; artifacts whose scannerVersion differs are treated as stale.
const pkg = JSON.parse(await readFile(join(import.meta.dirname, '..', 'package.json'), 'utf8'));
const VERSION = pkg.version;

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'sovei-guard-'));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}

// Minimal but structurally valid stale business map (scannerVersion differs from current).
function staleBusinessMap() {
  return JSON.stringify({
    schemaVersion: 1,
    scannerVersion: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    lifecycle: 'candidate',
    generator: { mode: 'builtin-static-analysis', externalGraphProvider: null },
    coverage: { repository: {}, candidateSourceFiles: 0, contentFilesScanned: 0, maxContentFiles: 0, truncated: false, reasons: [] },
    capabilities: [],
    unmappedEvidence: [],
  }, null, 2);
}

// Fresh map with a single capability so `map` renders something meaningful.
function freshBusinessMap() {
  return JSON.stringify({
    schemaVersion: 1,
    scannerVersion: VERSION,
    generatedAt: '2026-08-05T00:00:00.000Z',
    lifecycle: 'candidate',
    generator: { mode: 'builtin-static-analysis', externalGraphProvider: null },
    coverage: { repository: {}, candidateSourceFiles: 1, contentFilesScanned: 1, maxContentFiles: 1, truncated: false, reasons: [] },
    capabilities: [{
      id: 'payment',
      name: '支付',
      description: '处理支付',
      confidence: 'high',
      entrySurfaces: ['POST /pay'],
      contracts: ['Charge.create'],
      upstreamCapabilities: [],
      downstreamCapabilities: [],
      externalDependencies: [],
      redlineCandidateIds: [],
      codeEvidence: [],
    }],
    unmappedEvidence: [],
  }, null, 2);
}

async function writeProjectRoot(root) {
  await mkdir(join(root, 'sovei-flow', 'project', 'codegraph'), { recursive: true });
  await mkdir(join(root, 'sovei-flow', 'project', 'config'), { recursive: true });
  await writeFile(join(root, 'sovei-flow', 'project', 'project.config.json'), JSON.stringify({
    project: { name: 'guard-test', techStack: {} },
    workflow: { version: '2.1.0' },
  }, null, 2), 'utf8');
}

test('map is blocked on stale business map without bypass', async () => {
  await fixture(async (root) => {
    await writeProjectRoot(root);
    await writeFile(join(root, 'sovei-flow', 'project', 'codegraph', 'business-map.json'), staleBusinessMap(), 'utf8');
    await assert.rejects(
      () => execFileAsync(process.execPath, [cli, '--root', root, 'project', 'map']),
      (err) => {
        const text = `${err.stdout}\n${err.stderr}`;
        assert.match(text, /守卫拦截/);
        assert.match(text, /旧版产物/);
        return true;
      },
    );
  });
});

test('map proceeds with --force bypass', async () => {
  await fixture(async (root) => {
    await writeProjectRoot(root);
    await writeFile(join(root, 'sovei-flow', 'project', 'codegraph', 'business-map.json'), staleBusinessMap(), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'map', '--force']);
    assert.match(stdout, /已放行旧产物读取/);
  });
});

test('map proceeds with --refresh alias bypass', async () => {
  await fixture(async (root) => {
    await writeProjectRoot(root);
    await writeFile(join(root, 'sovei-flow', 'project', 'codegraph', 'business-map.json'), staleBusinessMap(), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'map', '--refresh']);
    assert.match(stdout, /已放行旧产物读取/);
  });
});

test('map runs normally on a fresh business map', async () => {
  await fixture(async (root) => {
    await writeProjectRoot(root);
    await writeFile(join(root, 'sovei-flow', 'project', 'codegraph', 'business-map.json'), freshBusinessMap(), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'map']);
    assert.match(stdout, /支付/);
    assert.doesNotMatch(stdout, /已放行旧产物读取/);
  });
});

test('rescan --dry-run prints write-side refresh notice on stale artifacts', async () => {
  await fixture(async (root) => {
    await writeProjectRoot(root);
    await writeFile(join(root, 'sovei-flow', 'project', 'codegraph', 'business-map.json'), staleBusinessMap(), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'rescan', '--dry-run']);
    assert.match(stdout, /检测到旧版 onboarding 产物/);
    assert.match(stdout, /整体刷新/);
  });
});

test('knowledge list is not blocked by stale artifacts (005 fix)', async () => {
  await fixture(async (root) => {
    await writeProjectRoot(root);
    await writeFile(join(root, 'sovei-flow', 'project', 'codegraph', 'business-map.json'), staleBusinessMap(), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [cli, '--root', root, 'knowledge', 'list']);
    assert.doesNotMatch(stdout, /守卫拦截/);
  });
});

test('project status is not blocked by stale artifacts (005 fix)', async () => {
  await fixture(async (root) => {
    await writeProjectRoot(root);
    await writeFile(join(root, 'sovei-flow', 'project', 'codegraph', 'business-map.json'), staleBusinessMap(), 'utf8');
    const { stdout } = await execFileAsync(process.execPath, [cli, '--root', root, 'project', 'status']);
    assert.doesNotMatch(stdout, /守卫拦截/);
  });
});
