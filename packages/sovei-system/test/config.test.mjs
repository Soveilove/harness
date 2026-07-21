import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildStageSkillReport, loadSystemConfig, validateSystemConfig } from "../src/config.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "..", "..");

test("validates the repository workflow and Skill Map", async () => {
  const { workflow, skillMap } = await loadSystemConfig(repoRoot);
  const result = validateSystemConfig(workflow, skillMap);

  assert.equal(result.workflow_version, "0.2.0");
  assert.equal(result.stage_count, 12);
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
