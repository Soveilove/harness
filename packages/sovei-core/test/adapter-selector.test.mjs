import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAdapterOption, adapterRegistry } from '../dist/index.js';

const available = adapterRegistry
  .list()
  .filter((a) => a.quickChannelDirective)
  .map((a) => ({ id: a.id, name: a.name, contextFile: a.contextFile }));

test('parseAdapterOption: comma-separated ids', () => {
  const result = parseAdapterOption('trae,claude', available);
  assert.deepEqual(result, ['trae', 'claude']);
});

test('parseAdapterOption: trims whitespace and lowercases', () => {
  const result = parseAdapterOption(' Trae , CLAUDE ', available);
  assert.deepEqual(result, ['trae', 'claude']);
});

test('parseAdapterOption: all expands to every installable id', () => {
  const result = parseAdapterOption('all', available);
  assert.deepEqual(result, available.map((a) => a.id));
});

test('parseAdapterOption: none returns empty', () => {
  assert.deepEqual(parseAdapterOption('none', available), []);
});

test('parseAdapterOption: none wins over other tokens', () => {
  assert.deepEqual(parseAdapterOption('trae,none', available), []);
});

test('parseAdapterOption: dedupes repeats', () => {
  assert.deepEqual(parseAdapterOption('trae,trae,claude', available), ['trae', 'claude']);
});

test('parseAdapterOption: unknown id throws with valid options listed', () => {
  assert.throws(() => parseAdapterOption('bogus', available), /不支持的适配器：bogus/);
});
