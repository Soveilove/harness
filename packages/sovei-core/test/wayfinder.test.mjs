import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_WORKFLOW,
  EventStore,
  KnowledgeStore,
  MemoryStorage,
  WayfinderRepository,
  WorkflowEngine,
} from '../dist/index.js';

const logger = { info() {}, warn() {}, error() {}, debug() {} };
const config = {
  rootPath: '.',
  specsDir: 'specs',
  knowledgeDir: 'harness/project/knowledge',
  harnessDir: 'harness',
  project: { name: 'test', description: 'test', techStack: {}, started: '2026-01-01' },
  workflow: { version: '2.0.0', stageOrder: DEFAULT_WORKFLOW.stageOrder },
};

test('decision dependencies, claims, resolutions, and fog drive a dynamic frontier', async () => {
  const storage = new MemoryStorage();
  const repository = new WayfinderRepository(storage);
  const path = 'specs/001-map';
  await repository.chart(path, '001-map', 'A signed-off purchase-flow specification', 'Billing owner must join HITL tickets.', 'planner');
  const research = await repository.addTicket(path, {
    title: 'Confirm provider refund semantics',
    question: 'Which refund states can the provider emit?',
    type: 'research',
    interaction: 'AFK',
    blockedBy: [],
  }, 'planner');
  const decision = await repository.addTicket(path, {
    title: 'Choose renewal behavior',
    question: 'Should existing members renew in this client?',
    type: 'grilling',
    interaction: 'HITL',
    blockedBy: [research.id],
  }, 'planner');
  const stateWithFog = await repository.addFog(path, 'Migration questions depend on the renewal decision.', 'planner');
  const fogId = stateWithFog.fog[0].id;

  assert.deepEqual((await repository.frontier(path)).map((ticket) => ticket.title), ['Confirm provider refund semantics']);
  const claims = await Promise.allSettled([
    repository.claim(path, research.id, 'research-agent'),
    repository.claim(path, research.id, 'other-agent'),
  ]);
  assert.equal(claims.filter((result) => result.status === 'fulfilled').length, 1);
  const claimed = (await repository.getState(path)).tickets[research.id];
  await assert.rejects(
    repository.resolve(path, research.id, 'wrong-agent', 'Provider supports partial refunds.', [], []),
    /claimed by research-agent/,
  );
  await repository.resolve(path, research.id, claimed.claim.actor, 'Provider supports partial and full refunds.', ['provider-docs#refunds'], []);
  assert.deepEqual((await repository.frontier(path)).map((ticket) => ticket.title), ['Choose renewal behavior']);

  await repository.claim(path, decision.id, 'product-owner');
  await repository.resolve(path, decision.id, 'product-owner', 'Existing members cannot renew in the mobile client.', ['meeting:billing-approval'], ['decision-log.md#renewal']);
  const migration = await repository.graduateFog(path, fogId, {
    title: 'Bound the membership migration',
    question: 'Which historical memberships need compatibility handling?',
    type: 'task',
    interaction: 'AFK',
    blockedBy: [decision.id],
  }, 'planner');
  assert.deepEqual((await repository.frontier(path)).map((ticket) => ticket.title), ['Bound the membership migration']);
  await repository.exclude(path, migration.id, 'Historical migration is outside this specification.', 'product-owner');

  assert.deepEqual(await repository.validateCompletion(path), { valid: true, blockers: [] });
  const markdown = await storage.read(`${path}/wayfinder.md`);
  assert.match(markdown, /\[Choose renewal behavior\]\(decision-tickets\/D-002\.json\)/);
  assert.match(markdown, /Historical migration is outside this specification/);
  const map = JSON.parse(await storage.read(`${path}/wayfinder.json`));
  assert.equal(map.ticketIndex.length, 3);
  assert.equal(map.fog.length, 0);
});

test('ticket interaction modes and wayfind completion are enforced', async () => {
  const storage = new MemoryStorage();
  const repository = new WayfinderRepository(storage);
  const path = 'specs/002-gates';
  await repository.chart(path, '002-gates', 'A clear destination', '', 'planner');
  assert.match((await repository.validateCompletion(path)).blockers[0], /use wayfinder skip/);
  await assert.rejects(repository.addTicket(path, {
    title: 'Ask the owner', question: 'What behavior is desired?', type: 'grilling', interaction: 'AFK', blockedBy: [],
  }, 'planner'), /must use HITL/);
  const ticket = await repository.addTicket(path, {
    title: 'Ask the owner', question: 'What behavior is desired?', type: 'grilling', interaction: 'HITL', blockedBy: [],
  }, 'planner');
  const validation = await repository.validateCompletion(path);
  assert.equal(validation.valid, false);
  assert.match(validation.blockers[0], /Ask the owner/);
  await repository.claim(path, ticket.id, 'owner');
  await assert.rejects(
    repository.resolve(path, ticket.id, 'owner', 'Use the existing behavior.', [], []),
    /requires human or research evidence/,
  );
  await repository.resolve(path, ticket.id, 'owner', 'Use the existing behavior.', ['human:owner-confirmation'], []);
  assert.equal((await repository.validateCompletion(path)).valid, true);
});

test('active claims protect exclusion while expired claims return to the frontier', async () => {
  const storage = new MemoryStorage();
  const repository = new WayfinderRepository(storage);
  const path = 'specs/003-claims';
  await repository.chart(path, '003-claims', 'A bounded decision set', '', 'planner');
  const ticket = await repository.addTicket(path, {
    title: 'Choose compatibility boundary',
    question: 'Which legacy clients remain supported?',
    type: 'task',
    interaction: 'AFK',
    blockedBy: [],
  }, 'planner');
  await repository.claim(path, ticket.id, 'research-agent', 0.001);
  await assert.rejects(
    repository.exclude(path, ticket.id, 'No longer relevant.', 'other-agent'),
    /claimed by research-agent/,
  );
  await new Promise((resolve) => setTimeout(resolve, 75));
  assert.deepEqual((await repository.frontier(path)).map((entry) => entry.id), [ticket.id]);
  await repository.exclude(path, ticket.id, 'No longer relevant.', 'other-agent');
  assert.equal((await repository.getState(path)).tickets[ticket.id].status, 'excluded');
});

test('small efforts can explicitly skip Wayfinder', async () => {
  const storage = new MemoryStorage();
  const repository = new WayfinderRepository(storage);
  const path = 'specs/003-small';
  await repository.skip(path, '003-small', 'Single-file correction with no unresolved decisions.', 'planner');
  assert.equal((await repository.validateCompletion(path)).valid, true);
  await assert.rejects(repository.addTicket(path, {
    title: 'Unexpected ticket', question: 'Should not exist?', type: 'task', interaction: 'AFK', blockedBy: [],
  }, 'planner'), /skipped map cannot accept tickets/);
});

test('workflow wayfind gate uses the typed map and reopen archives its projections', async () => {
  const storage = new MemoryStorage();
  const repository = new WayfinderRepository(storage);
  const engine = new WorkflowEngine(storage, new KnowledgeStore(storage), logger, config);
  const events = new EventStore(storage);
  const featureId = '004-workflow';
  const path = `specs/${featureId}`;
  await events.append(path, { type: 'BOOTSTRAP', featureId });
  await events.append(path, { type: 'STAGE_COMPLETE', stage: 'load', artifacts: [] }, 'load');
  await events.append(path, { type: 'STAGE_COMPLETE', stage: 'grill', artifacts: ['decision-log.md'] }, 'grill');
  await storage.write(`${path}/decision-log.md`, '# Decisions\n\nDestination accepted.');
  await repository.chart(path, featureId, 'A complete decision map', '', 'planner');
  const ticket = await repository.addTicket(path, {
    title: 'Choose contract', question: 'Which contract is current?', type: 'research', interaction: 'AFK', blockedBy: [],
  }, 'planner');
  await assert.rejects(engine.completeStage(featureId, 'wayfind'), /open decision tickets: Choose contract/);
  await repository.claim(path, ticket.id, 'research-agent');
  await repository.resolve(path, ticket.id, 'research-agent', 'Contract v2 is current.', ['contract-v2'], []);
  const completed = await engine.completeStage(featureId, 'wayfind');
  assert.equal(completed.currentStage, 'spec');

  const reopened = await engine.reopen(featureId, 'wayfind', 'Destination changed');
  assert.equal(reopened.currentStage, 'wayfind');
  assert.equal(await storage.read(`${path}/wayfinder.json`), null);
  assert.equal(await storage.read(`${path}/wayfinder-events.jsonl`), null);
  assert.ok(await storage.read(`${path}/history/revision-1/reopen-wayfind/wayfinder.json`));
  assert.ok(await storage.read(`${path}/history/revision-1/reopen-wayfind/decision-tickets/${ticket.id}.json`));
});
