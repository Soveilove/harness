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
  await repository.writeDocument('sovei-flow/project/rules/a.rules.json', { schemaVersion: 1, rules: [rule('DUPLICATE_RULE')] });
  await repository.writeDocument('sovei-flow/project/rules/b.rules.json', { schemaVersion: 1, rules: [rule('DUPLICATE_RULE')] });
  await assert.rejects(repository.load(), /Duplicate project rule id DUPLICATE_RULE/);

  await storage.write('sovei-flow/project/rules/b.rules.json', '{"schemaVersion":2,"rules":[]}');
  await assert.rejects(repository.load(), /Invalid project rules/);
});

test('project rules accept BOM and JSONC without corrupting URLs', async () => {
  const storage = new MemoryStorage();
  const document = { schemaVersion: 1, rules: [rule('WINDOWS_JSONC_RULE', {
    instruction: 'Preserve https://example.com/contracts.',
  })] };
  const jsonc = '\uFEFF' + JSON.stringify(document, null, 2).replace(/\n}$/, ',\n  // reviewed project rule\n}');
  await storage.write('sovei-flow/project/rules/windows.rules.json', jsonc);

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
  assert.match(await storage.read('sovei-flow/project/rules/rule-events.jsonl'), /PROJECT_RULE_ACTIVATED/);

  const refreshed = await adaptProjectRules(storage, repository);
  assert.equal(refreshed.total, candidates.length);
  assert.ok(refreshed.preserved >= 1);
  assert.equal((await repository.load()).find((item) => item.id === target.id).lifecycle, 'active');
});

test('team rule docs (doc/, docs/, CONTRIBUTING) are adapted, excluding Sovei self-sections', async () => {
  const storage = new MemoryStorage();
  // 中文文件名 + 中文正文的团队规范文档
  await storage.write('doc/前端规范.md', [
    '# 前端规范',
    '',
    '## Git 提交规范',
    '- 遵循约定式提交，type 限定枚举',
    '- commit header 最大长度 50',
    '',
    '## 样式规范',
    '- CSS 使用 ::v-deep 穿透',
    '',
    '## 目录',
    '- 第一章：概述',
    '- 第二章：规范',
    '',
    '## 快速开始',
    '- 运行 pnpm dev',
    '',
    '## 更新日志',
    '- v1.0.0 发布',
    '',
  ].join('\n'));
  // CONTRIBUTING.md 里的 HTTP 统一封装规范
  await storage.write('CONTRIBUTING.md', '# Contributing\n\n- HTTP 统一走封装的 request 方法\n');
  // AGENTS.md 含 Sovei 自身工作流声明（应被排除）
  await storage.write('AGENTS.md', [
    '# Guidance',
    '',
    '## Sovei Workflow',
    '- `sovei workflow bootstrap <feature>`: Start a new feature',
    '- `sovei context build --stage spec --feature <feature>`: Get stage prompt',
    '',
    '## Key Commands',
    '- Lists solutions and their costs',
    '',
    '## Code Style',
    '- 使用 2 空格缩进',
    '',
  ].join('\n'));

  const candidates = await scanProjectRuleCandidates(storage);
  const instructions = candidates.map((c) => c.instruction);

  // 团队规范文档被正确提取
  assert.ok(instructions.some((i) => i.includes('约定式提交')), '应提取中文提交规范');
  assert.ok(instructions.some((i) => i.includes('::v-deep')), '应提取样式规范');
  assert.ok(instructions.some((i) => i.includes('request 方法')), '应提取 CONTRIBUTING 规范');

  // Sovei 自身工作流说明被排除
  assert.ok(!instructions.some((i) => i.includes('workflow bootstrap')), '应排除 Sovei 自身命令');
  assert.ok(!instructions.some((i) => i.includes('context build')), '应排除 Sovei 自身命令');
  assert.ok(!instructions.some((i) => i.includes('Lists solutions')), '应排除非规范目录/说明');
  assert.ok(!instructions.some((i) => i.includes('pnpm dev')), '应排除快速开始章节');
  assert.ok(!instructions.some((i) => i.includes('v1.0.0')), '应排除更新日志章节');

  // 来自 doc/ 的 candidate 应标记来源与 kind
  const docRule = candidates.find((c) => c.provenance.sources.includes('doc/前端规范.md'));
  assert.ok(docRule, 'doc/前端规范.md 应产生候选');
  assert.ok(docRule.tags.includes('doc'), '应标记 doc 来源');

  // AGENTS.md 的 Code Style 章节（非 Sovei 声明）应被保留
  assert.ok(instructions.some((i) => i.includes('2 空格缩进')), 'AGENTS.md 中真正的编码规范应保留');
});

test('cross-validation marks config-backed rules as high confidence', async () => {
  const storage = new MemoryStorage();
  // 文档规范与 commitlint/prettier 配置交叉验证
  await storage.write('doc/提交规范.md', '# 提交规范\n\n- Commit 遵循约定式提交，type 限定枚举\n- header 最大长度 50\n');
  await storage.write('commitlint.config.js', 'module.exports = { rules: { "type-enum": [2, "always", ["feat","fix"]], "header-max-length": [2, "always", 50] } };');
  await storage.write('.prettierrc.json', JSON.stringify({ singleQuote: true, printWidth: 80, semi: true }));

  const candidates = await scanProjectRuleCandidates(storage);
  // commitlint 和 prettier 都在文档里出现（约定式提交/header 长度 + 无 prettier 词），
  // 但只要命中任一配置证据即 high
  const highConfidence = candidates.filter((c) => c.confidence === 'high');
  assert.ok(highConfidence.length > 0, '交叉验证命中的规范应标记 high');
  assert.ok(candidates.every((c) => c.confidence === 'high' || c.confidence === 'medium'));
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

test('deprecateMany batch-discards candidates across files and preserves active rules', async () => {
  const storage = new MemoryStorage();
  const repository = new ProjectRulesRepository(storage);
  // writeDocument 期望不含 source 字段（source 由加载后附加）
  await repository.writeDocument('sovei-flow/project/rules/a.rules.json', {
    schemaVersion: 1,
    rules: [rule('CAND_A', { lifecycle: 'candidate' }), rule('ACTIVE_KEEP', { lifecycle: 'active' })],
  });
  await repository.writeDocument('sovei-flow/project/rules/b.rules.json', {
    schemaVersion: 1,
    rules: [rule('CAND_B', { lifecycle: 'candidate' })],
  });

  const deprecated = await repository.deprecateMany(['CAND_A', 'CAND_B', 'MISSING'], 'ai-agent', 'AI refine: noise');
  assert.deepEqual(deprecated, ['CAND_A', 'CAND_B']);

  const loaded = await repository.load();
  assert.equal(loaded.find((r) => r.id === 'CAND_A').lifecycle, 'deprecated');
  assert.equal(loaded.find((r) => r.id === 'CAND_B').lifecycle, 'deprecated');
  assert.equal(loaded.find((r) => r.id === 'ACTIVE_KEEP').lifecycle, 'active', 'active rule must be preserved');
  assert.match(await storage.read('sovei-flow/project/rules/rule-events.jsonl'), /PROJECT_RULE_DEPRECATED/);
});

test('project rules deprecation preserves provenance and appends audit evidence', async () => {
  const storage = new MemoryStorage();
  const repository = new ProjectRulesRepository(storage);
  await repository.writeDocument('sovei-flow/project/rules/project.rules.json', {
    schemaVersion: 1,
    rules: [rule('RULE_TO_DEPRECATE')],
  });

  const deprecated = await repository.deprecate('RULE_TO_DEPRECATE', 'maintainer', 'Superseded by a narrower rule');

  assert.equal(deprecated.lifecycle, 'deprecated');
  assert.deepEqual(deprecated.provenance, { kind: 'declared', sources: ['AGENTS.md'] });
  assert.equal(resolveProjectRules(await repository.load(), { stage: 'implement', paths: ['src/app.ts'] }).length, 0);
  assert.match(await storage.read('sovei-flow/project/rules/rule-events.jsonl'), /PROJECT_RULE_DEPRECATED/);
  await assert.rejects(
    repository.deprecate('RULE_TO_DEPRECATE', 'maintainer', 'Duplicate request'),
    /already deprecated/,
  );
});

test('adapted candidates deduplicate repeated statements within the same section', async () => {
  const storage = new MemoryStorage();
  // 同一章节（「九、schemaJson 完整示例」）内出现两行完全相同的语句 `"required": true,`
  await storage.write('docs/方案文档/节点说明.md', [
    '# 节点说明',
    '',
    '## 九、schemaJson 完整示例',
    '- "required": true,',
    '- "required": true,',
    '',
    '## 输出区域',
    '- 保持只读',
    '',
  ].join('\n'));

  const candidates = await scanProjectRuleCandidates(storage);
  const ids = candidates.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, '候选规则 id 必须唯一');
  // 重复语句只提取一次
  const target = candidates.filter((c) => c.instruction === '"required": true,');
  assert.equal(target.length, 1, '同章节重复语句应只生成一条候选规则');
  assert.equal(candidates.filter((c) => c.instruction === '保持只读').length, 1);
});

test('project rules fail closed with a diagnostic message for duplicates within the same file', async () => {
  const storage = new MemoryStorage();
  const repository = new ProjectRulesRepository(storage);
  // 同一文件内存在两条相同 id 的规则（title 不同用于校验报错信息）
  await repository.writeDocument('sovei-flow/project/rules/same.rules.json', {
    schemaVersion: 1,
    rules: [
      rule('IN_FILE_DUP', { title: 'First copy' }),
      rule('IN_FILE_DUP', { title: 'Second copy' }),
    ],
  });
  await assert.rejects(
    repository.load(),
    /同一文件内存在重复规则 id IN_FILE_DUP（title: Second copy）/,
  );
});
