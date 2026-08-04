import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADAPTED_RULES_FILE,
  adaptProjectRules,
  MemoryStorage,
  ProjectRulesRepository,
  resolveProjectRules,
  scanProjectRuleCandidates,
} from '../dist/index.js';

function rule(id, overrides = {}) {
  return {
    id,
    title: id,
    instruction: `Instruction for ${id}`,
    lifecycle: 'active',
    enforcement: 'required',
    appliesTo: { paths: ['src/**'], excludePaths: ['src/generated/**'], stages: ['implement'] },
    verification: [],
    tags: [],
    provenance: { kind: 'declared', sources: ['AGENTS.md'] },
    ...overrides,
  };
}

test('project rules fail closed on duplicate IDs and invalid documents', async () => {
  const storage = new MemoryStorage();
  const repository = new ProjectRulesRepository(storage);
  await repository.writeDocument('harness/project/rules/a.rules.json', { schemaVersion: 1, rules: [rule('DUPLICATE_RULE')] });
  await repository.writeDocument('harness/project/rules/b.rules.json', { schemaVersion: 1, rules: [rule('DUPLICATE_RULE')] });
  await assert.rejects(repository.load(), /Duplicate project rule id DUPLICATE_RULE/);

  await storage.write('harness/project/rules/b.rules.json', '{"schemaVersion":2,"rules":[]}');
  await assert.rejects(repository.load(), /Invalid project rules/);
});

test('project rules accept BOM and JSONC without corrupting URLs', async () => {
  const storage = new MemoryStorage();
  const document = { schemaVersion: 1, rules: [rule('WINDOWS_JSONC_RULE', {
    instruction: 'Preserve https://example.com/contracts.',
  })] };
  const jsonc = '\uFEFF' + JSON.stringify(document, null, 2).replace(/\n}$/, ',\n  // reviewed project rule\n}');
  await storage.write('harness/project/rules/windows.rules.json', jsonc);

  const loaded = await new ProjectRulesRepository(storage).load();

  assert.equal(loaded[0].instruction, 'Preserve https://example.com/contracts.');
});

test('rule resolution is lifecycle, stage and path aware', async () => {
  const rules = [
    { ...rule('ACTIVE_REQUIRED'), source: 'a.rules.json' },
    { ...rule('ACTIVE_ADVISORY', { enforcement: 'advisory' }), source: 'a.rules.json' },
    { ...rule('CANDIDATE_RULE', { lifecycle: 'candidate' }), source: 'a.rules.json' },
  ];
  assert.deepEqual(resolveProjectRules(rules, { stage: 'implement', paths: ['src/app.ts'] }).map((item) => item.id), ['ACTIVE_REQUIRED', 'ACTIVE_ADVISORY']);
  assert.equal(resolveProjectRules(rules, { stage: 'plan', paths: ['src/app.ts'] }).length, 0);
  assert.equal(resolveProjectRules(rules, { stage: 'implement', paths: ['src/generated/types.ts'] }).length, 0);
  assert.equal(resolveProjectRules(rules, { stage: 'implement' }).length, 2, 'no paths must conservatively include all stage matches');
});

test('Agent and IDE Rules are adapted as scoped candidates and can be reviewed', async () => {
  const storage = new MemoryStorage();
  await storage.write('AGENTS.md', '# Guidance\n\n- Must preserve public API compatibility.\n- EventStore is the source of truth.\n');
  await storage.write('.cursorrules', '- Always use the project formatter.\n');
  await storage.write('.cursor/rules/vue.mdc', '---\nglobs: "src/**/*.vue,!src/generated/**"\n---\nUse Vant before creating a custom mobile control.\n');
  await storage.write('CLAUDE.md', '- Never edit generated files.\n');
  await storage.write('.claude/rules/tests.md', '---\npaths:\n  - "test/**"\n---\n- Must preserve deterministic fixtures.\n');

  const candidates = await scanProjectRuleCandidates(storage);
  assert.equal(candidates.length, 6);
  assert.ok(candidates.every((item) => item.lifecycle === 'candidate'));
  assert.ok(candidates.some((item) => item.provenance.sources.includes('AGENTS.md')));
  assert.ok(candidates.some((item) => item.instruction === 'EventStore is the source of truth.'));
  assert.ok(candidates.some((item) => item.tags.includes('cursor')));
  assert.ok(candidates.some((item) => item.tags.includes('claude-code')));
  const cursorScoped = candidates.find((item) => item.provenance.sources.includes('.cursor/rules/vue.mdc'));
  assert.deepEqual(cursorScoped.appliesTo.paths, ['src/**/*.vue']);
  assert.deepEqual(cursorScoped.appliesTo.excludePaths, ['src/generated/**']);
  const claudeScoped = candidates.find((item) => item.provenance.sources.includes('.claude/rules/tests.md'));
  assert.deepEqual(claudeScoped.appliesTo.paths, ['test/**']);

  const repository = new ProjectRulesRepository(storage);
  await repository.writeDocument(ADAPTED_RULES_FILE, { schemaVersion: 1, rules: candidates });
  const target = candidates[0];
  await repository.activate(target.id, 'maintainer', 'Confirmed against current repository policy');
  const activated = (await repository.load()).find((item) => item.id === target.id);
  assert.equal(activated.lifecycle, 'active');
  assert.equal(activated.provenance.reviewedBy, 'maintainer');
  assert.match(await storage.read('harness/project/rules/rule-events.jsonl'), /PROJECT_RULE_ACTIVATED/);

  const refreshed = await adaptProjectRules(storage, repository);
  assert.equal(refreshed.total, candidates.length);
  assert.ok(refreshed.preserved >= 1);
  assert.equal((await repository.load()).find((item) => item.id === target.id).lifecycle, 'active');
});

test('technical configuration is not inferred as Rules and no adapted file is created', async () => {
  const storage = new MemoryStorage();
  await storage.write('package.json', JSON.stringify({ scripts: { check: 'tsc --noEmit', test: 'node --test' } }));
  await storage.write('tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } }));

  assert.deepEqual(await scanProjectRuleCandidates(storage), []);
  const result = await adaptProjectRules(storage, new ProjectRulesRepository(storage));
  assert.deepEqual(result, { total: 0, preserved: 0, written: false });
  assert.equal(await storage.exists(ADAPTED_RULES_FILE), false);
});

test('project rules deprecation preserves provenance and appends audit evidence', async () => {
  const storage = new MemoryStorage();
  const repository = new ProjectRulesRepository(storage);
  await repository.writeDocument('harness/project/rules/project.rules.json', {
    schemaVersion: 1,
    rules: [rule('RULE_TO_DEPRECATE')],
  });

  const deprecated = await repository.deprecate('RULE_TO_DEPRECATE', 'maintainer', 'Superseded by a narrower rule');

  assert.equal(deprecated.lifecycle, 'deprecated');
  assert.deepEqual(deprecated.provenance, { kind: 'declared', sources: ['AGENTS.md'] });
  assert.equal(resolveProjectRules(await repository.load(), { stage: 'implement', paths: ['src/app.ts'] }).length, 0);
  assert.match(await storage.read('harness/project/rules/rule-events.jsonl'), /PROJECT_RULE_DEPRECATED/);
  await assert.rejects(
    repository.deprecate('RULE_TO_DEPRECATE', 'maintainer', 'Duplicate request'),
    /already deprecated/,
  );
});
