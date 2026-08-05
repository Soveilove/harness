import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  ChangeControlRepository,
  MemoryStorage,
} from '../dist/index.js';

const execFileAsync = promisify(execFile);
const cli = join(import.meta.dirname, '..', 'dist', 'cli', 'index.js');

test('redline view renders active, inactive, seed candidates and events', async () => {
  const storage = new MemoryStorage();
  const repo = new ChangeControlRepository(storage);

  await repo.addRedline({
    id: 'AUTH_REQUIRED', title: 'Auth required', rule: 'All routes need auth',
    enforcement: 'absolute', rationale: 'Regulatory requirement', scope: 'all HTTP routes',
    examples: ['Removing a guard to fix a redirect loop'], owner: 'security-team',
  });
  await repo.addRedline({
    id: 'BILLING_CONTRACT', title: 'Billing approval', rule: 'Billing needs approval',
    enforcement: 'approval-required',
  });
  await repo.deactivateRedline('BILLING_CONTRACT', 'Merged into billing module guard');

  await storage.write('harness/project/governance/redlines-seed.json', JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-08-04T00:00:00.000Z',
    scannerVersion: '2.1.0-dev.3',
    redlines: [{
      id: 'COMPLIANCE_AUDIT',
      title: 'Audit logging surface',
      rule: 'All financial mutations must be audit-logged',
      enforcement: 'absolute',
      source: 'src/billing/audit.ts',
      category: 'compliance',
      confidence: 'medium',
    }],
  }));

  await repo.refreshRedlinesView();
  const content = await storage.read('harness/project/governance/redlines.md');

  assert.match(content, /业务红线（人工审查视图）/);
  assert.match(content, /AUTH_REQUIRED.*绝对红线.*All routes need auth.*Regulatory requirement/s);
  assert.match(content, /典型违规示例/);
  assert.match(content, /Removing a guard to fix a redirect loop/);
  assert.match(content, /security-team/);
  assert.match(content, /已停用红线/);
  assert.match(content, /BILLING_CONTRACT.*Merged into billing module guard/);
  assert.match(content, /待审候选（扫描器生成，未激活）/);
  assert.match(content, /COMPLIANCE_AUDIT.*待审/);
  assert.match(content, /变更历史/);
  assert.match(content, /新增红线 AUTH_REQUIRED/);
  assert.match(content, /停用红线 BILLING_CONTRACT/);
  assert.match(content, /请勿手改本文件/);
});

test('update redline fills rationale and reviewer fields then refreshes the view', async () => {
  const storage = new MemoryStorage();
  const repo = new ChangeControlRepository(storage);
  await repo.addRedline({ id: 'NO_SILENT_DATA_LOSS', title: 'No silent data loss', rule: 'Upgrades must not rewrite data', enforcement: 'absolute' });

  await repo.refreshRedlinesView();
  let content = await storage.read('harness/project/governance/redlines.md');
  assert.match(content, /未填写。请补充/);
  assert.match(content, /未审查。确认后执行/);

  const updated = await repo.updateRedline('NO_SILENT_DATA_LOSS', {
    rationale: 'Prevents loss of hand-written project context on CLI upgrades',
    reviewedBy: 'maintainer',
    reviewedAt: new Date().toISOString(),
  });
  assert.equal(updated.rationale, 'Prevents loss of hand-written project context on CLI upgrades');
  assert.equal(updated.reviewedBy, 'maintainer');

  content = await storage.read('harness/project/governance/redlines.md');
  assert.match(content, /Prevents loss of hand-written project context on CLI upgrades/);
  assert.match(content, /maintainer/);
  assert.match(content, /更新红线 NO_SILENT_DATA_LOSS/);
});

test('CLI render and update commands maintain the human-review view', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'sovei-redline-view-'));
  const project = join(fixture, 'project');
  const viewPath = join(project, 'harness', 'project', 'governance', 'redlines.md');
  try {
    await execFileAsync(process.execPath, [cli, 'project', 'init', project, '--blank']);
    await execFileAsync(process.execPath, [
      cli, '--root', project, 'governance', 'redline', 'add', 'AUTH_REQUIRED',
      '--title', 'Authentication', '--rule', 'Protected actions require authentication',
      '--enforcement', 'absolute', '--rationale', 'Compliance with access-control policy',
      '--owner', 'security-team',
    ]);

    let view = await readFile(viewPath, 'utf8');
    assert.match(view, /AUTH_REQUIRED/);
    assert.match(view, /Compliance with access-control policy/);
    assert.match(view, /security-team/);

    await execFileAsync(process.execPath, [cli, '--root', project, 'governance', 'redline', 'render']);

    await execFileAsync(process.execPath, [
      cli, '--root', project, 'governance', 'redline', 'update', 'AUTH_REQUIRED',
      '--reviewer', 'alice', '--rationale', 'Updated rationale for audit',
    ]);
    view = await readFile(viewPath, 'utf8');
    assert.match(view, /Updated rationale for audit/);
    assert.match(view, /alice/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
