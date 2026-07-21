import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildStageSkillReport,
  loadSystemConfig,
  validateAdapterConfig,
  validateSystemConfig,
} from "../src/config.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "..", "..");

test("validates the repository workflow and Skill Map", async () => {
  const { workflow, skillMap } = await loadSystemConfig(repoRoot);
  const result = validateSystemConfig(workflow, skillMap);

  assert.equal(result.workflow_version, "1.1.0");
  assert.equal(result.stage_count, 12);
  assert.equal(result.active_stage_count, 12);
  assert.equal(result.third_party_skill_count, 10);
});

test("reports load without active third-party Skills", async () => {
  const { workflow, skillMap } = await loadSystemConfig(repoRoot);
  const report = buildStageSkillReport("load", workflow, skillMap);

  assert.deepEqual(
    report.required_skills.map((skill) => skill.id),
    ["sovei-workflow", "knowledge-loader"],
  );
  assert.deepEqual(report.third_party_skills, []);
});

test("rejects a workflow that permits stage chaining", async () => {
  const { workflow, skillMap } = await loadSystemConfig(repoRoot);
  const invalidWorkflow = structuredClone(workflow);
  invalidWorkflow.invocation.max_stages = 2;

  assert.throws(
    () => validateSystemConfig(invalidWorkflow, skillMap),
    /exactly one stage per invocation/,
  );
});

test("registers an existing usage guide", async () => {
  const { usagePath } = await loadSystemConfig(repoRoot);
  assert.equal(path.basename(usagePath), "USAGE.md");
});

test("validates CodeBuddy and Trae Adapter entrypoints", async () => {
  const { workflow, adapterManifest, adapterArtifacts } = await loadSystemConfig(repoRoot);
  const result = validateAdapterConfig(workflow, adapterManifest, adapterArtifacts);

  assert.deepEqual(result.active_adapters, ["codex", "claude", "codebuddy", "trae"]);
  assert.equal(result.active_adapter_count, 4);
  assert.equal(result.command_adapter_count, 2);
  assert.deepEqual(adapterArtifacts.codebuddy.commands, [
    "converge",
    "grill",
    "implement",
    "learn",
    "load",
    "plan",
    "reopen",
    "scope",
    "spec",
    "sync",
    "tasks",
    "verify",
    "wayfind",
  ]);
  assert.match(adapterArtifacts.trae.skill, /\.trae[\\/]skills[\\/]sovei-workflow[\\/]SKILL\.md$/);
});

test("rejects an incomplete CodeBuddy command set", async () => {
  const { workflow, adapterManifest, adapterArtifacts } = await loadSystemConfig(repoRoot);
  const incompleteArtifacts = structuredClone(adapterArtifacts);
  incompleteArtifacts.codebuddy.commands = incompleteArtifacts.codebuddy.commands.filter(
    (command) => command !== "verify",
  );

  assert.throws(
    () => validateAdapterConfig(workflow, adapterManifest, incompleteArtifacts),
    /codebuddy commands must cover every stage plus reopen exactly/,
  );
});
