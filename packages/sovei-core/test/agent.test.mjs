import assert from 'node:assert/strict';
import test from 'node:test';
import { adapterRegistry } from '../dist/index.js';

test('seven built-in adapters have distinct capability profiles', () => {
  const adapters = adapterRegistry.list();
  assert.equal(adapters.length, 7);
  const ids = adapters.map((a) => a.id).sort();
  assert.deepEqual(ids, ['aider', 'claude', 'codebuddy', 'codex', 'gemini', 'trae', 'windsurf']);

  const codex = adapterRegistry.get('codex');
  const codebuddy = adapterRegistry.get('codebuddy');
  const trae = adapterRegistry.get('trae');
  const gemini = adapterRegistry.get('gemini');
  const aider = adapterRegistry.get('aider');
  const windsurf = adapterRegistry.get('windsurf');

  assert.equal(codex.capabilities.mcp, true);
  assert.equal(codebuddy.capabilities.mcp, false);
  assert.equal(trae.capabilities.toolExecution, false);
  assert.equal(codex.capabilities.toolExecution, true);

  // New adapters (013): correct context files.
  assert.equal(gemini.contextFile, 'GEMINI.md');
  assert.equal(aider.contextFile, '.aiderrules');
  assert.equal(windsurf.contextFile, '.windsurfrules');
  assert.equal(gemini.capabilities.mcp, true);
  assert.equal(aider.capabilities.mcp, false);
});

test('unknown adapter throws', () => {
  assert.throws(() => adapterRegistry.get('nonexistent'), /Unknown IDE adapter/);
});

test('codebuddy uses SOVEI prefix invocation', () => {
  const codebuddy = adapterRegistry.get('codebuddy');
  assert.match(codebuddy.invocationFormat('grill', '001-feature'), /^SOVEI:/);
});
