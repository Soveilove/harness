import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBudget } from '../dist/index.js';

// 辅助函数：创建 ContextItem
function item(id, type, lifecycle, contentLength) {
  return {
    source: `test/${id}`,
    id,
    type,
    title: `Item ${id}`,
    content: 'x'.repeat(contentLength),
    lifecycle,
    contentHash: '',
    citation: `test ${id}`,
  };
}

test('applyBudget retains all items when under budget', () => {
  const items = [
    item('a', 'redline', 'active', 100),
    item('b', 'rule', 'stable', 200),
    item('c', 'project-rule', 'advisory', 50),
  ];
  const result = applyBudget(items, 10000);
  assert.equal(result.retained.length, 3);
  assert.equal(result.unloaded.length, 0);
  assert.equal(result.exceeded, false);
  assert.equal(result.totalCharacters, 350);
});

test('applyBudget unloads lowest-priority items when over budget', () => {
  const items = [
    item('redline-1', 'redline', 'active', 500),
    item('rule-stable', 'rule', 'stable', 500),
    item('rule-candidate', 'rule', 'candidate', 500),
    item('advisory-1', 'project-rule', 'advisory', 500),
  ];
  // 预算 1000：红线(500) + stable(500) = 1000，candidate 和 advisory 应被截断
  const result = applyBudget(items, 1000);
  assert.ok(result.retained.length >= 2, 'should retain at least 2 items');
  assert.ok(result.unloaded.length >= 1, 'should unload at least 1 item');
  assert.equal(result.exceeded, true);

  // 红线应被保留（优先级最高）
  const retainedIds = result.retained.map((i) => i.id);
  assert.ok(retainedIds.includes('redline-1'), 'redline should be retained');

  // advisory 应被截断（优先级最低）
  const unloadedIds = result.unloaded.map((i) => i.id);
  assert.ok(unloadedIds.includes('advisory-1'), 'advisory should be unloaded');
});

test('applyBudget preserves untouchable items even when over budget', () => {
  const items = [
    item('GLOBAL_RL', 'redline', 'active', 500),
    item('big-artifact', 'feature-artifact', 'current', 2000),
  ];
  // 预算 100：红线是不可截断的，即使总字符数远超预算
  const result = applyBudget(items, 100, { untouchableIds: ['GLOBAL_RL'] });
  assert.ok(result.retained.some((i) => i.id === 'GLOBAL_RL'), 'untouchable item should be retained');
  assert.ok(result.unloaded.some((i) => i.id === 'big-artifact'), 'non-untouchable item should be unloaded');
});

test('applyBudget unloaded items have 240-char summary', () => {
  const items = [
    item('big', 'rule', 'candidate', 500),
  ];
  const result = applyBudget(items, 10);
  assert.equal(result.unloaded.length, 1);
  assert.ok(result.unloaded[0].summary.length <= 240, 'summary should be <= 240 chars');
  assert.equal(result.unloaded[0].expandable, true, 'should be expandable');
  assert.equal(result.unloaded[0].id, 'big');
});

test('applyBudget preserves priority order: redline > required > artifact > stable > cross-feature > candidate > advisory', () => {
  const items = [
    item('advisory', 'project-rule', 'advisory', 100),
    item('candidate', 'rule', 'candidate', 100),
    item('cross', 'cross-feature', 'cross-feature', 100),
    item('stable', 'rule', 'stable', 100),
    item('artifact', 'feature-artifact', 'current', 100),
    item('required', 'project-rule', 'required', 100),
    item('redline', 'redline', 'active', 100),
  ];
  // 预算 350：只够 3-4 项
  const result = applyBudget(items, 350);
  const retainedIds = result.retained.map((i) => i.id);

  // 高优先级项应在前几位
  assert.ok(retainedIds.includes('redline'), 'redline should be retained');
  assert.ok(retainedIds.includes('required'), 'required rule should be retained');
  assert.ok(retainedIds.includes('artifact'), 'artifact should be retained');

  // 低优先级项应被截断
  const unloadedIds = result.unloaded.map((i) => i.id);
  assert.ok(unloadedIds.includes('advisory'), 'advisory should be unloaded');
  assert.ok(unloadedIds.includes('candidate'), 'candidate should be unloaded');
});
