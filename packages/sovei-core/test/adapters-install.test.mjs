import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FilesystemStorage, adapterRegistry, installAdapters, checkAdapterInstalled } from '../dist/index.js';

test('installAdapters creates context file with directive for trae', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-adapters-trae-'));
  try {
    const storage = new FilesystemStorage(root);
    const result = await installAdapters(['trae'], storage);
    assert.equal(result.totalInstalled, 1);
    assert.equal(result.results[0].adapterId, 'trae');
    assert.equal(result.results[0].installed, true);
    assert.ok(result.results[0].files.includes('.cursorrules'));

    const content = await storage.read('.cursorrules');
    assert.ok(content.includes('Quick Channel'));
    assert.ok(content.includes('sovei quick'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('installAdapters creates slash command for claude', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-adapters-cc-'));
  try {
    const storage = new FilesystemStorage(root);
    await storage.write('CLAUDE.md', '# Test Project\n');
    const result = await installAdapters(['claude'], storage);
    assert.equal(result.totalInstalled, 1);
    assert.ok(result.results[0].files.includes('CLAUDE.md'));
    assert.ok(result.results[0].files.includes('.claude/commands/sovei-quick.md'));

    const slashContent = await storage.read('.claude/commands/sovei-quick.md');
    assert.ok(slashContent.includes('sovei quick'));

    const claudeMd = await storage.read('CLAUDE.md');
    assert.ok(claudeMd.includes('Quick Channel'));
    assert.ok(claudeMd.includes('sovei-quick'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('installAdapters creates slash command for codebuddy', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-adapters-cb-'));
  try {
    const storage = new FilesystemStorage(root);
    await storage.write('AGENTS.md', '# Test\n');
    const result = await installAdapters(['codebuddy'], storage);
    assert.equal(result.totalInstalled, 1);
    assert.ok(result.results[0].files.includes('AGENTS.md'));
    assert.ok(result.results[0].files.includes('.codebuddy/commands/sovei-quick.md'));

    const cmdContent = await storage.read('.codebuddy/commands/sovei-quick.md');
    assert.ok(cmdContent.includes('sovei quick'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('installAdapters is idempotent — second install skips', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-adapters-idem-'));
  try {
    const storage = new FilesystemStorage(root);
    const first = await installAdapters(['codex'], storage);
    assert.equal(first.totalInstalled, 1);

    const second = await installAdapters(['codex'], storage);
    assert.equal(second.totalInstalled, 0);
    assert.equal(second.totalSkipped, 1);
    assert.ok(second.results[0].skipped.includes('已安装'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('installAdapters handles multiple adapters at once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-adapters-multi-'));
  try {
    const storage = new FilesystemStorage(root);
    // codex 和 codebuddy 共享 AGENTS.md，第二个会发现已安装标记而跳过
    const result = await installAdapters(['trae', 'claude', 'codebuddy', 'codex'], storage);
    // trae→.cursorrules, claude→CLAUDE.md+.claude/commands/, codebuddy→AGENTS.md+.codebuddy/commands/
    // codex→AGENTS.md (但 codebuddy 已写入安装标记，codex 跳过)
    assert.equal(result.totalInstalled, 3);
    assert.equal(result.totalSkipped, 1);

    // 验证文件存在
    assert.ok(await storage.exists('.cursorrules'));
    assert.ok(await storage.exists('CLAUDE.md'));
    assert.ok(await storage.exists('AGENTS.md'));
    assert.ok(await storage.exists('.claude/commands/sovei-quick.md'));
    assert.ok(await storage.exists('.codebuddy/commands/sovei-quick.md'));

    // AGENTS.md 应包含 codebuddy 的指令（第一个写入的）
    const agentsMd = await storage.read('AGENTS.md');
    assert.ok(agentsMd.includes('CodeBuddy'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('checkAdapterInstalled returns false before install, true after', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-adapters-check-'));
  try {
    const storage = new FilesystemStorage(root);
    const adapter = adapterRegistry.get('codex');
    const before = await checkAdapterInstalled(adapter, storage);
    assert.equal(before, false);

    await installAdapters(['codex'], storage);
    const after = await checkAdapterInstalled(adapter, storage);
    assert.equal(after, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('adapters without quickChannelDirective are skipped', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sovei-adapters-skip-'));
  try {
    const storage = new FilesystemStorage(root);
    const result = await installAdapters(['gemini'], storage);
    assert.equal(result.totalInstalled, 0);
    assert.equal(result.totalSkipped, 1);
    assert.ok(result.results[0].skipped.includes('无快速通道指令'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
