import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FilesystemStorage, WorkflowStateStore } from '../dist/index.js';

const stages = ['explore', 'grill'];
const statePath = 'specs/002-workflow-v3-state-core/workflow-state.json';

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'sovei-v3-store-'));
  const storage = new FilesystemStorage(root);
  const store = new WorkflowStateStore(storage, statePath, stages);
  return { root, storage, store };
}

test('times out on an existing lock without deleting the active lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-v3-lock-'));
  const storage = new FilesystemStorage(root, { lockTimeoutMs: 25, lockRetryMs: 5 });
  const lockPath = `${statePath}.lock`;
  await storage.write(lockPath, 'active-owner');
  await assert.rejects(
    () => storage.withLock(statePath, async () => {}),
    /文件锁\(超时\)/,
  );
  assert.equal(await storage.read(lockPath), 'active-owner');
});

test('cleans a partial file when the file handle write fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-v3-write-failure-'));
  let openedPath = '';
  const storage = new FilesystemStorage(root, {
    openFile: async (filePath, flags) => {
      openedPath = filePath;
      const handle = await import('node:fs/promises').then(({ open }) => open(filePath, flags));
      return {
        writeFile: async () => { throw new Error('handle write failed'); },
        close: handle.close.bind(handle),
      };
    },
  });
  await assert.rejects(() => storage.writeIfAbsent(statePath, 'state'), /handle write failed/);
  assert.equal(await storage.read(openedPath.slice(root.length + 1)), null);
});

test('cleans a partial file when the file handle close fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-v3-close-failure-'));
  let openedPath = '';
  const storage = new FilesystemStorage(root, {
    openFile: async (filePath, flags) => {
      openedPath = filePath;
      const handle = await import('node:fs/promises').then(({ open }) => open(filePath, flags));
      return {
        writeFile: handle.writeFile.bind(handle),
        close: async () => { await handle.close(); throw new Error('handle close failed'); },
      };
    },
  });
  await assert.rejects(() => storage.writeIfAbsent(statePath, 'state'), /handle close failed/);
  assert.equal(await storage.read(openedPath.slice(root.length + 1)), null);
});

test('cleans a partial create file when the backend reports a failed commit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-v3-create-'));
  const storage = new FilesystemStorage(root);
  const stateFile = join(root, statePath.replaceAll('/', '\\'));
  const originalWriteIfAbsent = storage.writeIfAbsent.bind(storage);
  storage.writeIfAbsent = async (filePath, content) => {
    const created = await originalWriteIfAbsent(filePath, content.slice(0, 3));
    if (created) {
      const { unlink } = await import('node:fs/promises');
      await unlink(stateFile);
    }
    throw new Error('create commit failed');
  };
  const store = new WorkflowStateStore(storage, statePath, stages);
  await assert.rejects(() => store.create('002-workflow-v3-state-core'), /create commit failed/);
  assert.equal(await storage.read(statePath), null);
});

test('creates and reads a v3 state snapshot', async () => {
  const { store } = await setup();
  const created = await store.create('002-workflow-v3-state-core');
  const loaded = await store.read();
  assert.equal(created.schemaVersion, 3);
  assert.deepEqual(loaded, created);
});

test('rejects malformed state and unknown schema without fallback', async () => {
  const { storage, store } = await setup();
  await storage.write(statePath, '{broken');
  await assert.rejects(() => store.read(), /invalid JSON/i);
  await storage.write(statePath, JSON.stringify({ schemaVersion: 2 }));
  await assert.rejects(() => store.read(), /unsupported workflow state schema/i);
});

test('does not change the snapshot when updater or validation fails', async () => {
  const { storage, store } = await setup();
  await store.create('002-workflow-v3-state-core');
  const before = await storage.read(statePath);
  await assert.rejects(() => store.update(0, () => { throw new Error('updater failed'); }), /updater failed/);
  assert.equal(await storage.read(statePath), before);
  await assert.rejects(() => store.update(0, (state) => ({ ...state, revision: 99 })), /Invalid workflow state|revision must increment/);
  assert.equal(await storage.read(statePath), before);
});

test('does not change the snapshot when the backend commit fails', async () => {
  const { storage, store } = await setup();
  await store.create('002-workflow-v3-state-core');
  const before = await storage.read(statePath);
  const failingStorage = {
    read: storage.read.bind(storage),
    writeIfAbsent: storage.writeIfAbsent.bind(storage),
    write: async () => { throw new Error('commit failed'); },
    append: storage.append.bind(storage),
    exists: storage.exists.bind(storage),
    delete: storage.delete.bind(storage),
    list: storage.list.bind(storage),
    listRecursive: storage.listRecursive.bind(storage),
    isDirectory: storage.isDirectory.bind(storage),
    listEntries: storage.listEntries.bind(storage),
    withLock: storage.withLock.bind(storage),
  };
  const failingStore = new WorkflowStateStore(failingStorage, statePath, stages);
  await assert.rejects(
    () => failingStore.update(0, (state) => ({
      ...state,
      revision: 1,
      history: [{ revision: 1, timestamp: new Date().toISOString(), actor: 'test', action: 'prepare', sourceStage: 'explore', reason: null }],
      preparedStages: ['explore'],
    })),
    /commit failed/,
  );
  assert.equal(await storage.read(statePath), before);
});

test('cleans the lock after an update failure', async () => {
  const { root, store } = await setup();
  await store.create('002-workflow-v3-state-core');
  await assert.rejects(() => store.update(0, () => { throw new Error('critical failure'); }), /critical failure/);
  assert.deepEqual(await readdir(join(root, 'specs/002-workflow-v3-state-core')), ['workflow-state.json']);
});

test('serializes concurrent updates with CAS', async () => {
  const { store } = await setup();
  await store.create('002-workflow-v3-state-core');
  const results = await Promise.allSettled([
    store.update(0, (state) => ({ ...state, revision: 1, history: [{ revision: 1, timestamp: new Date().toISOString(), actor: 'a', action: 'x', sourceStage: 'explore', reason: null }], preparedStages: ['explore'] })),
    store.update(0, (state) => ({ ...state, revision: 1, history: [{ revision: 1, timestamp: new Date().toISOString(), actor: 'b', action: 'x', sourceStage: 'explore', reason: null }], preparedStages: ['explore'] })),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
});

test('updates atomically and rejects stale revisions', async () => {
  const { root, store } = await setup();
  const initial = await store.create('002-workflow-v3-state-core');
  const updated = await store.update(initial.revision, (state) => ({ ...state, revision: 1, history: [{ revision: 1, timestamp: new Date().toISOString(), actor: 'test', action: 'prepare', sourceStage: 'explore', reason: null }], preparedStages: ['explore'] }));
  assert.equal(updated.revision, 1);
  await assert.rejects(() => store.update(initial.revision, (state) => state), /stale workflow state revision/i);
  const files = await readdir(join(root, 'specs/002-workflow-v3-state-core'));
  assert.deepEqual(files, ['workflow-state.json']);
});
