import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ChangeControlRepository,
  DEFAULT_WORKFLOW,
  EventStore,
  KnowledgeStore,
  MemoryStorage,
  WorkflowEngine,
} from '../dist/index.js';

const logger = { info() {}, warn() {}, error() {}, debug() {} };
const config = {
  rootPath: '.',
  specsDir: 'specs',
  knowledgeDir: 'sovei-flow/project/knowledge',
  harnessDir: 'sovei-flow',
  project: { name: 'test', description: 'test', techStack: {}, started: '2026-01-01' },
  workflow: { version: '2.0.0', stageOrder: DEFAULT_WORKFLOW.stageOrder },
};

/** Fast-forward through explore stage (sole entry) so tests can operate on grill+. */
async function skipExplore(storage, featureId) {
  const events = new EventStore(storage);
  const path = `specs/${featureId}`;
  await events.append(path, { type: 'STAGE_PREPARED', stage: 'explore' }, 'explore');
  await storage.write(`${path}/exploration.md`, '# 需求探索\n\n核心目标与代码现状。');
  await events.append(path, { type: 'STAGE_COMPLETE', stage: 'explore', artifacts: ['exploration.md'] }, 'explore');
  await events.persistState(path, await events.replay(path, DEFAULT_WORKFLOW));
}

test('material change cannot bypass absolute or unapproved business redlines', async () => {
  const storage = new MemoryStorage();
  const repository = new ChangeControlRepository(storage);
  await repository.addRedline({ id: 'LEGAL_REGION', title: 'Region restriction', rule: 'Never serve blocked regions', enforcement: 'absolute' });
  await repository.addRedline({ id: 'BILLING_APPROVAL', title: 'Billing approval', rule: 'Billing changes require approval', enforcement: 'approval-required' });
  const request = await repository.createRequest('specs/001-change', '001-change', 'spec', 'Replace purchase flow', 'New business model', ['user-behavior'], 0, 'implement');
  request.affectedSurfaces = ['checkout', 'billing contract'];
  request.authorizedBy = 'business-owner';
  request.authorizedAt = new Date().toISOString();
  request.authorizationReference = 'CHANGE-APPROVAL-001';
  request.redlineAssessments = request.redlineAssessments.map((assessment) => ({
    ...assessment,
    disposition: 'approved-exception',
    rationale: 'Requested by product',
  }));

  let validation = await repository.validateForApply(request, DEFAULT_WORKFLOW.stageOrder);
  assert.equal(validation.valid, false);
  assert.ok(validation.blockers.some((blocker) => blocker.includes('LEGAL_REGION is absolute')));
  assert.ok(validation.blockers.some((blocker) => blocker.includes('BILLING_APPROVAL exception requires')));

  request.redlineAssessments = request.redlineAssessments.map((assessment) => assessment.redlineId === 'LEGAL_REGION'
    ? { ...assessment, disposition: 'compliant', evidence: ['contract-test:region-denied'] }
    : {
        ...assessment,
        approvedBy: 'business-owner',
        approvedAt: new Date().toISOString(),
        approvalReference: 'APPROVAL-2026-001',
      });
  validation = await repository.validateForApply(request, DEFAULT_WORKFLOW.stageOrder);
  assert.equal(validation.valid, true);

  request.targetStage = 'implement';
  request.changeDimensions = ['business-direction'];
  validation = await repository.validateForApply(request, DEFAULT_WORKFLOW.stageOrder);
  assert.equal(validation.valid, false);
  assert.ok(validation.blockers.some((blocker) => blocker.includes("reopen at or before 'grill'")));
});

test('applying a reviewed change archives stale artifacts and reopens the earliest invalid stage', async () => {
  const storage = new MemoryStorage();
  const repository = new ChangeControlRepository(storage);
  await repository.addRedline({ id: 'AUTH_REQUIRED', title: 'Authentication', rule: 'Protected actions require authentication', enforcement: 'absolute' });
  const engine = new WorkflowEngine(storage, new KnowledgeStore(storage), logger, config);
  const events = new EventStore(storage);
  const featureId = '002-pivot';
  const featurePath = `specs/${featureId}`;
  await events.append(featurePath, { type: 'BOOTSTRAP', featureId });
  for (const stage of DEFAULT_WORKFLOW.stageOrder.slice(0, 7)) {
    await events.append(featurePath, { type: 'STAGE_COMPLETE', stage, artifacts: [] }, stage);
  }
  await storage.write(`${featurePath}/decision-log.md`, '# Decisions\n\nAuthentication stays required.');
  await storage.write(`${featurePath}/wayfinder.md`, '# 决策地图\n\nDestination accepted.');
  await storage.write(`${featurePath}/spec.md`, '# Old Spec\n\nLegacy purchase flow.');
  await storage.write(`${featurePath}/scope.md`, '# Old Scope\n\nLegacy modules.');
  await storage.write(`${featurePath}/plan.md`, '# Old Plan\n\nLegacy design.');
  await storage.write(`${featurePath}/tasks.md`, '# Old Tasks\n\n- [ ] TASK-001: legacy work');
  await storage.write(`${featurePath}/legacy-contract.md`, '# Legacy Contract');

  const request = await engine.prepareChange(featureId, 'spec', 'Replace purchase flow', 'Business direction changed', ['user-behavior', 'acceptance-or-api-contract']);
  request.affectedSurfaces = ['purchase UI', 'billing API', 'entitlement'];
  request.authorizedBy = 'business-owner';
  request.authorizedAt = new Date().toISOString();
  request.authorizationReference = 'CHANGE-APPROVAL-002';
  request.supersedes = ['legacy-contract.md'];
  request.redlineAssessments[0] = {
    ...request.redlineAssessments[0],
    disposition: 'compliant',
    rationale: 'New purchase flow retains the authentication gate.',
    evidence: ['decision-log.md#authentication'],
  };
  await repository.saveRequest(featurePath, request);

  const state = await engine.applyChange(featureId, request.id);
  assert.equal(state.currentStage, 'spec');
  assert.equal(state.activeChangeId, request.id);
  assert.equal(state.revision, 1);
  assert.deepEqual(state.completedStages, ['explore', 'grill', 'wayfind']);
  assert.equal(await storage.read(`${featurePath}/spec.md`), null);
  assert.equal(await storage.read(`${featurePath}/scope.md`), null);
  assert.equal(await storage.read(`${featurePath}/decision-log.md`), '# Decisions\n\nAuthentication stays required.');
  assert.equal(
    await storage.read(`${featurePath}/history/revision-1/change-${request.id}/spec.md`),
    '# Old Spec\n\nLegacy purchase flow.',
  );
  assert.equal(
    await storage.read(`${featurePath}/history/revision-1/change-${request.id}/legacy-contract.md`),
    '# Legacy Contract',
  );

  const prepared = await engine.prepareStage(featureId, 'spec');
  assert.match(prepared.prompt, new RegExp(`当前变更：${request.id}`));
  assert.match(prepared.prompt, /history\/.*已失效证据/);
  assert.match(await storage.read(`${featurePath}/spec.md`), /请依据下方提示契约/);
});

test('draft change remains blocked until all active redlines and affected surfaces are reviewed', async () => {
  const storage = new MemoryStorage();
  const repository = new ChangeControlRepository(storage);
  await repository.addRedline({ id: 'DATA_EXPORT', title: 'Export boundary', rule: 'Do not export private data', enforcement: 'absolute' });
  const request = await repository.createRequest('specs/003-draft', '003-draft', 'scope', 'Expand export', 'Customer request', ['impact-surface'], 0, 'plan');
  const validation = await repository.validateForApply(request, DEFAULT_WORKFLOW.stageOrder);
  assert.equal(validation.valid, false);
  assert.ok(validation.blockers.some((blocker) => blocker.includes('affectedSurfaces')));
  assert.ok(validation.blockers.some((blocker) => blocker.includes('DATA_EXPORT is not reviewed')));
});

test('material change is blocked when the project has no declared redlines', async () => {
  const storage = new MemoryStorage();
  const repository = new ChangeControlRepository(storage);
  const request = await repository.createRequest('specs/004-no-policy', '004-no-policy', 'explore', 'Replace product', 'Market pivot', ['business-direction'], 0, 'explore');
  request.affectedSurfaces = ['entire product'];
  request.authorizedBy = 'business-owner';
  request.authorizedAt = new Date().toISOString();
  request.authorizationReference = 'PIVOT-001';
  const validation = await repository.validateForApply(request, DEFAULT_WORKFLOW.stageOrder);
  assert.equal(validation.valid, false);
  assert.ok(validation.blockers.some((blocker) => blocker.includes('no active business redlines configured')));
});

test('change request becomes stale when workflow events advance after its review baseline', async () => {
  const storage = new MemoryStorage();
  const repository = new ChangeControlRepository(storage);
  await repository.addRedline({ id: 'AUTH_REQUIRED', title: 'Authentication', rule: 'Protected actions require authentication', enforcement: 'absolute' });
  const engine = new WorkflowEngine(storage, new KnowledgeStore(storage), logger, config);
  await engine.bootstrap('005-stale');
  await skipExplore(storage, '005-stale');
  const request = await engine.prepareChange('005-stale', 'grill', 'Restart design', 'Direction changed', ['business-direction']);
  request.affectedSurfaces = ['whole feature'];
  request.authorizedBy = 'business-owner';
  request.authorizedAt = new Date().toISOString();
  request.authorizationReference = 'CHANGE-005';
  request.redlineAssessments[0] = {
    ...request.redlineAssessments[0],
    disposition: 'unaffected',
    rationale: 'Authentication requirements remain unchanged.',
  };
  await repository.saveRequest('specs/005-stale', request);
  const events = new EventStore(storage);
  await events.append('specs/005-stale', { type: 'STAGE_COMPLETE', stage: 'grill', artifacts: [] }, 'grill');
  await assert.rejects(engine.applyChange('005-stale', request.id), /Change request is stale/);
});

test('pending material change freezes ordinary workflow until applied or cancelled', async () => {
  const storage = new MemoryStorage();
  const repository = new ChangeControlRepository(storage);
  await repository.addRedline({ id: 'AUTH_REQUIRED', title: 'Authentication', rule: 'Protected actions require authentication', enforcement: 'absolute' });
  const engine = new WorkflowEngine(storage, new KnowledgeStore(storage), logger, config);
  await engine.bootstrap('006-freeze');
  await skipExplore(storage, '006-freeze');
  const request = await engine.prepareChange('006-freeze', 'grill', 'Explore replacement', 'Direction may change', ['business-direction']);
  await assert.rejects(engine.prepareStage('006-freeze', 'grill'), /Workflow frozen by pending material change/);
  await assert.rejects(engine.completeStage('006-freeze', 'grill'), /Workflow frozen by pending material change/);
  const cancelled = await engine.cancelChange('006-freeze', request.id, 'Product retained the original direction');
  assert.equal(cancelled.status, 'cancelled');
  const prepared = await engine.prepareStage('006-freeze', 'grill');
  assert.match(prepared.prompt, /仅当前顶层 Feature 产物具有权威性/);
});

test('redline branch scope: empty branches normalize to global and view renders scoped branches', async () => {
  const storage = new MemoryStorage();
  const repository = new ChangeControlRepository(storage);

  // empty branches [] should normalize to undefined (global)
  const global = await repository.addRedline({ id: 'GLOBAL_RL', title: 'Global', rule: 'Applies everywhere', enforcement: 'absolute', branches: [] });
  assert.equal(global.branches, undefined);

  // explicit branches are preserved
  const scoped = await repository.addRedline({ id: 'EXP_RL', title: 'Exp', rule: 'Exp only', enforcement: 'absolute', branches: ['exp'] });
  assert.deepEqual(scoped.branches, ['exp']);

  // update --clear-branches equivalent (empty array) normalizes to undefined
  const updated = await repository.updateRedline('EXP_RL', { branches: [] });
  assert.equal(updated.branches, undefined);

  // loading from storage persists the normalized shape (no empty array residue)
  const loaded = await repository.loadRedlines();
  assert.equal(loaded.find((rl) => rl.id === 'EXP_RL').branches, undefined);
});
