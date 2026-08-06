import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MarkdownSkillAdapter, parseSkillFile, loadReferenceFiles } from '../dist/index.js';

const SKILL_CONTENT = `---
name: test-skill
description: A test skill
---

# Test Skill

This is the body content.
It has multiple lines.
`;

test('parseSkillFile extracts frontmatter and body', () => {
  const parsed = parseSkillFile(SKILL_CONTENT);
  assert.equal(parsed.name, 'test-skill');
  assert.equal(parsed.description, 'A test skill');
  assert.equal(parsed.disableModelInvocation, false);
  assert.match(parsed.body, /# Test Skill/);
  assert.match(parsed.body, /It has multiple lines/);
});

test('parseSkillFile handles files without frontmatter', () => {
  const parsed = parseSkillFile('Just plain content');
  assert.equal(parsed.name, '');
  assert.equal(parsed.body, 'Just plain content');
});

test('parseSkillFile handles disable-model-invocation', () => {
  const content = `---
name: user-skill
description: User invoked
disable-model-invocation: true
---

Body here.`;
  const parsed = parseSkillFile(content);
  assert.equal(parsed.disableModelInvocation, true);
  assert.equal(parsed.body, 'Body here.');
});

test('MarkdownSkillAdapter.getSkillBody returns body content without frontmatter', () => {
  const manifest = {
    id: 'test/skill',
    name: 'test-skill',
    version: '1.0.0',
    source: { type: 'path', locator: 'test/path' },
    supportedStages: ['grill'],
    readOnly: true,
    protocolVersion: '1.0.0',
  };
  const adapter = new MarkdownSkillAdapter(manifest, SKILL_CONTENT);
  const body = adapter.getSkillBody();
  assert.match(body, /# Test Skill/);
  assert.doesNotMatch(body, /name: test-skill/);
});

test('MarkdownSkillAdapter.execute returns prompt-injection proposal', async () => {
  const manifest = {
    id: 'test/skill',
    name: 'test-skill',
    version: '1.0.0',
    source: { type: 'path', locator: 'test/path' },
    supportedStages: ['grill'],
    readOnly: true,
    protocolVersion: '1.0.0',
  };
  const adapter = new MarkdownSkillAdapter(manifest, SKILL_CONTENT);
  const result = await adapter.execute({
    requestId: 'test-req',
    manifest,
    binding: { stage: 'grill', skillId: 'test/skill', status: 'enabled', fallback: 'native' },
    context: {
      featureId: 'test-feature',
      stage: 'grill',
      revision: 0,
      artifacts: {},
      knowledgeSources: [],
      allowedPaths: [],
      readOnly: true,
    },
    requestedAt: new Date().toISOString(),
  });
  assert.equal(result.skillId, 'test/skill');
  assert.equal(result.mode, 'third-party');
  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0].name, 'prompt-injection');
  assert.match(result.proposals[0].content, /# Test Skill/);
  assert.equal(result.completed, false);
});

test('loadReferenceFiles inlines references/*.md content', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sovei-skill-refs-'));
  try {
    mkdirSync(join(dir, 'references'));
    writeFileSync(join(dir, 'references', 'se-principles.md'), '# SE Principles\n\n- SRP\n- DRY\n');
    writeFileSync(join(dir, 'references', 'anti-patterns.md'), '# Anti Patterns\n\n- God object\n');

    const refs = loadReferenceFiles(dir);
    assert.match(refs, /se-principles\.md/);
    assert.match(refs, /SRP/);
    assert.match(refs, /anti-patterns\.md/);
    assert.match(refs, /God object/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadReferenceFiles returns empty when no references dir', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sovei-skill-norefs-'));
  try {
    assert.equal(loadReferenceFiles(dir), '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('MarkdownSkillAdapter with skillDir appends references to body', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sovei-skill-adv-'));
  try {
    mkdirSync(join(dir, 'references'));
    writeFileSync(join(dir, 'references', 'extra.md'), 'Extra reference content');

    const manifest = {
      id: 'test/with-refs',
      name: 'test-skill',
      version: '1.0.0',
      source: { type: 'path', locator: dir },
      supportedStages: ['learn'],
      readOnly: true,
      protocolVersion: '1.0.0',
    };
    const adapter = new MarkdownSkillAdapter(manifest, SKILL_CONTENT, dir);
    const body = adapter.getSkillBody();
    assert.match(body, /# Test Skill/);
    assert.match(body, /Extra reference content/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
