import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  ARTIFACT_FILES,
  MemoryStorage,
  readScannerVersion,
  findStaleArtifacts,
  assertArtifactsCurrent,
  getStaleArtifactVersion,
} from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
const VERSION = pkg.version;

const OLD = '1.0.0';

function writeBusinessMap(storage, scannerVersion) {
  return storage.write(ARTIFACT_FILES.businessMap, JSON.stringify({
    schemaVersion: 1,
    scannerVersion,
    generatedAt: '2026-08-04T00:00:00.000Z',
    lifecycle: 'candidate',
    coverage: { truncated: false, reasons: [] },
    capabilities: [],
    unmappedEvidence: [],
  }));
}

function writeRedlineSeed(storage, scannerVersion) {
  return storage.write(ARTIFACT_FILES.redlineSeed, JSON.stringify({
    schemaVersion: 1,
    scannerVersion,
    generatedAt: '2026-08-04T00:00:00.000Z',
    redlines: [],
  }));
}

test('readScannerVersion returns embedded version', async () => {
  const storage = new MemoryStorage();
  await writeBusinessMap(storage, VERSION);
  assert.equal(await readScannerVersion(storage, ARTIFACT_FILES.businessMap), VERSION);
});

test('readScannerVersion returns null when file is missing', async () => {
  const storage = new MemoryStorage();
  assert.equal(await readScannerVersion(storage, ARTIFACT_FILES.businessMap), null);
});

test('readScannerVersion returns null when file is corrupted or lacks field', async () => {
  const storage = new MemoryStorage();
  await storage.write(ARTIFACT_FILES.businessMap, '{ not valid json');
  assert.equal(await readScannerVersion(storage, ARTIFACT_FILES.businessMap), null);

  const empty = new MemoryStorage();
  await empty.write(ARTIFACT_FILES.businessMap, JSON.stringify({ capabilities: [] }));
  assert.equal(await readScannerVersion(empty, ARTIFACT_FILES.businessMap), null);
});

test('findStaleArtifacts only flags artifacts whose version differs from VERSION', async () => {
  const storage = new MemoryStorage();
  await writeBusinessMap(storage, OLD); // stale
  await writeRedlineSeed(storage, VERSION); // fresh
  const stale = await findStaleArtifacts(storage, [ARTIFACT_FILES.businessMap, ARTIFACT_FILES.redlineSeed]);
  assert.deepEqual(stale, [ARTIFACT_FILES.businessMap]);
});

test('assertArtifactsCurrent resolves when all artifacts are fresh', async () => {
  const storage = new MemoryStorage();
  await writeBusinessMap(storage, VERSION);
  await writeRedlineSeed(storage, VERSION);
  const stale = await assertArtifactsCurrent(storage, [ARTIFACT_FILES.businessMap, ARTIFACT_FILES.redlineSeed], { force: false, refresh: false });
  assert.deepEqual(stale, []);
});

test('assertArtifactsCurrent throws on stale artifacts without bypass', async () => {
  const storage = new MemoryStorage();
  await writeBusinessMap(storage, OLD);
  await assert.rejects(
    () => assertArtifactsCurrent(storage, [ARTIFACT_FILES.businessMap], { force: false, refresh: false }),
    /守卫拦截|旧版产物/,
  );
});

test('assertArtifactsCurrent resolves with force bypass', async () => {
  const storage = new MemoryStorage();
  await writeBusinessMap(storage, OLD);
  const stale = await assertArtifactsCurrent(storage, [ARTIFACT_FILES.businessMap], { force: true, refresh: false });
  assert.deepEqual(stale, [ARTIFACT_FILES.businessMap]);
});

test('assertArtifactsCurrent resolves with refresh bypass', async () => {
  const storage = new MemoryStorage();
  await writeRedlineSeed(storage, OLD);
  const stale = await assertArtifactsCurrent(storage, [ARTIFACT_FILES.redlineSeed], { force: false, refresh: true });
  assert.deepEqual(stale, [ARTIFACT_FILES.redlineSeed]);
});

test('getStaleArtifactVersion returns old version or null', async () => {
  const storage = new MemoryStorage();
  await writeBusinessMap(storage, OLD);
  assert.equal(await getStaleArtifactVersion(storage, ARTIFACT_FILES.businessMap), OLD);

  await writeBusinessMap(storage, VERSION);
  assert.equal(await getStaleArtifactVersion(storage, ARTIFACT_FILES.businessMap), null);

  const empty = new MemoryStorage();
  assert.equal(await getStaleArtifactVersion(empty, ARTIFACT_FILES.businessMap), null);
});
