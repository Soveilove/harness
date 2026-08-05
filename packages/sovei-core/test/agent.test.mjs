import assert from 'node:assert/strict';
import test from 'node:test';
import { adapterRegistry } from '../dist/index.js';

test('four built-in adapters have distinct capability profiles', () => {
  const adapters = adapterRegistry.list();
  assert.equal(adapters.length, 4);
  const ids = adapters.map((a) => a.id).sort();
  assert.deepEqual(ids, ['claude', 'codebuddy', 'codex', 'trae']);

  const codex = adapterRegistry.get('codex');
  const codebuddy = adapterRegistry.get('codebuddy');
  const trae = adapterRegistry.get('trae');

  assert.equal(codex.capabilities.mcp, true);
  assert.equal(codebuddy.capabilities.mcp, false);
  assert.equal(trae.capabilities.toolExecution, false);
  assert.equal(codex.capabilities.toolExecution, true);
});

test('unknown adapter throws', () => {
  assert.throws(() => adapterRegistry.get('nonexistent'), /Unknown IDE adapter/);
});

test('codebuddy uses SOVEI prefix invocation', () => {
  const codebuddy = adapterRegistry.get('codebuddy');
  assert.match(codebuddy.invocationFormat('grill', '001-feature'), /^SOVEI:/);
});
