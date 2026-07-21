import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

const SKILL_FIELDS = [
  "required_skills",
  "third_party_skills",
  "candidate_third_party_skills",
  "alternative_third_party_skills",
];

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a mapping`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

async function readYaml(filePath) {
  return parse(await readFile(filePath, "utf8"));
}

function resolveRepoPath(repoRoot, relativePath, label) {
  const resolved = path.resolve(repoRoot, relativePath);
  if (resolved !== repoRoot && !resolved.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`${label} must stay inside the repository`);
  }
  return resolved;
}

export async function loadSystemConfig(repoRoot) {
  const workflowPath = path.join(repoRoot, "harness", "workflows", "sovei", "workflow.yaml");
  const workflow = await readYaml(workflowPath);
  const usageName = workflow?.usage;
  if (typeof usageName !== "string" || !usageName) {
    throw new Error("workflow.usage must be a relative path");
  }
  const usagePath = path.resolve(path.dirname(workflowPath), usageName);
  if (path.dirname(usagePath) !== path.dirname(workflowPath)) {
    throw new Error("workflow.usage must stay in the Sovei workflow directory");
  }
  await readFile(usagePath, "utf8");

  const skillMapName = workflow?.invocation?.skill_map;
  if (typeof skillMapName !== "string" || !skillMapName) {
    throw new Error("workflow.invocation.skill_map must be a relative path");
  }

  const skillMapPath = path.resolve(path.dirname(workflowPath), skillMapName);
  if (path.dirname(skillMapPath) !== path.dirname(workflowPath)) {
    throw new Error("workflow.invocation.skill_map must stay in the Sovei workflow directory");
  }

  const adapterManifestPath = path.join(repoRoot, "harness", "ide-adapters", "sovei-adapters.yaml");
  const adapterManifest = await readYaml(adapterManifestPath);
  const adapterArtifacts = {};
  for (const [adapterId, adapter] of Object.entries(adapterManifest?.adapters ?? {})) {
    const artifacts = { skill: null, commands: [] };
    const skillValue = adapter.skill_source ?? adapter.skill_path;
    if (skillValue) {
      const skillPath = resolveRepoPath(repoRoot, skillValue, `${adapterId}.skill`);
      const skillFile = path.extname(skillPath) ? skillPath : path.join(skillPath, "SKILL.md");
      await readFile(skillFile, "utf8");
      artifacts.skill = skillFile;
    }
    if (adapter.command_source) {
      const commandDirectory = resolveRepoPath(
        repoRoot,
        adapter.command_source,
        `${adapterId}.command_source`,
      );
      artifacts.commands = (await readdir(commandDirectory, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => path.basename(entry.name, ".md"))
        .sort();
    }
    adapterArtifacts[adapterId] = artifacts;
  }

  return {
    workflow,
    workflowPath,
    usagePath,
    skillMap: await readYaml(skillMapPath),
    skillMapPath,
    adapterManifest,
    adapterManifestPath,
    adapterArtifacts,
  };
}

export function validateSystemConfig(workflow, skillMap) {
  const invocation = requireRecord(workflow.invocation, "workflow.invocation");
  if (invocation.max_stages !== 1 || invocation.chaining !== "forbidden") {
    throw new Error("workflow must enforce exactly one stage per invocation");
  }
  if (invocation.report_skills !== true) {
    throw new Error("workflow must require Skill reporting");
  }
  const controlActions = requireArray(workflow.control_actions, "workflow.control_actions");
  if (!controlActions.includes("reopen")) {
    throw new Error("workflow must register the reopen control action");
  }
  const rework = requireRecord(workflow.rework, "workflow.rework");
  if (rework.invalidation !== "target_and_successors" || !rework.history_artifact) {
    throw new Error("workflow must define audited target-and-successor invalidation");
  }
  if (workflow.workflow_version !== skillMap.workflow_version) {
    throw new Error("workflow and Skill Map versions must match");
  }

  const stageOrder = requireArray(workflow.stage_order, "workflow.stage_order");
  const workflowStages = requireRecord(workflow.stages, "workflow.stages");
  const mappedStages = requireRecord(skillMap.stages, "skill_map.stages");
  const skills = requireRecord(skillMap.skills, "skill_map.skills");
  const sources = requireRecord(skillMap.sources, "skill_map.sources");

  const workflowStageNames = Object.keys(workflowStages);
  const mappedStageNames = Object.keys(mappedStages);
  if (
    stageOrder.length !== workflowStageNames.length ||
    stageOrder.some((stage) => !workflowStages[stage]) ||
    stageOrder.length !== mappedStageNames.length ||
    stageOrder.some((stage) => !mappedStages[stage])
  ) {
    throw new Error("workflow order, stage definitions, and Skill Map stages must match exactly");
  }

  const referencedThirdPartySkills = new Set();
  for (const [skillId, skill] of Object.entries(skills)) {
    const definition = requireRecord(skill, `skill_map.skills.${skillId}`);
    if (!sources[definition.source]) {
      throw new Error(`Skill ${skillId} references unknown source ${definition.source}`);
    }
  }

  for (const stage of stageOrder) {
    const stageSkills = requireRecord(mappedStages[stage], `skill_map.stages.${stage}`);
    for (const field of SKILL_FIELDS) {
      const references = requireArray(stageSkills[field], `skill_map.stages.${stage}.${field}`);
      for (const skillId of references) {
        const skill = skills[skillId];
        if (!skill) {
          throw new Error(`Stage ${stage} references unknown Skill ${skillId}`);
        }

        const source = requireRecord(sources[skill.source], `skill_map.sources.${skill.source}`);
        if (field !== "required_skills") {
          if (source.kind !== "third_party") {
            throw new Error(`${stage}.${field} must contain only third-party Skills`);
          }
          referencedThirdPartySkills.add(skillId);
        }
        if (field === "third_party_skills" && !["active", "installed"].includes(skill.status)) {
          throw new Error(`Active third-party Skill ${skillId} is not installed`);
        }
      }
    }
  }

  for (const [skillId, skill] of Object.entries(skills)) {
    if (sources[skill.source].kind === "third_party" && !referencedThirdPartySkills.has(skillId)) {
      throw new Error(`Third-party Skill ${skillId} is not mapped to any stage`);
    }
  }

  return {
    workflow_version: workflow.workflow_version,
    stage_count: stageOrder.length,
    skill_count: Object.keys(skills).length,
    third_party_skill_count: Object.values(skills).filter(
      (skill) => sources[skill.source].kind === "third_party",
    ).length,
    active_stage_count: stageOrder.filter((stage) => workflowStages[stage].status === "active").length,
  };
}

export function validateAdapterConfig(workflow, adapterManifest, adapterArtifacts) {
  if (adapterManifest.workflow_version !== workflow.workflow_version) {
    throw new Error("IDE Adapter manifest version must match the workflow version");
  }

  const adapters = requireRecord(adapterManifest.adapters, "adapter_manifest.adapters");
  const requiredActiveAdapters = ["codex", "claude", "codebuddy", "trae"];
  for (const adapterId of requiredActiveAdapters) {
    const adapter = requireRecord(adapters[adapterId], `adapter_manifest.adapters.${adapterId}`);
    if (adapter.status !== "active" || !adapter.invocation) {
      throw new Error(`IDE Adapter ${adapterId} must be active with an invocation`);
    }
    if (!adapterArtifacts[adapterId]?.skill) {
      throw new Error(`IDE Adapter ${adapterId} is missing its Skill entrypoint`);
    }
  }
  if (adapters.cursor?.status !== "future") {
    throw new Error("Cursor must remain future until its Adapter is implemented");
  }

  const expectedCommands = [...workflow.stage_order, "reopen"].sort();
  for (const adapterId of ["claude", "codebuddy"]) {
    const commands = adapterArtifacts[adapterId]?.commands ?? [];
    if (
      commands.length !== expectedCommands.length ||
      commands.some((command, index) => command !== expectedCommands[index])
    ) {
      throw new Error(`${adapterId} commands must cover every stage plus reopen exactly`);
    }
  }

  return {
    adapter_count: Object.keys(adapters).length,
    active_adapter_count: Object.values(adapters).filter((adapter) => adapter.status === "active")
      .length,
    command_adapter_count: Object.values(adapters).filter((adapter) => adapter.command_source)
      .length,
    active_adapters: requiredActiveAdapters,
  };
}

function describeSkill(skillId, skills, sources) {
  const skill = skills[skillId];
  const source = sources[skill.source];
  return {
    id: skillId,
    source: skill.source,
    source_kind: source.kind,
    source_status: source.status,
    repository: source.repository ?? null,
    ref: source.ref ?? null,
    path: skill.path,
    status: skill.status,
  };
}

export function buildStageSkillReport(stage, workflow, skillMap) {
  validateSystemConfig(workflow, skillMap);
  if (!workflow.stages[stage]) {
    throw new Error(`Unknown Sovei stage: ${stage}`);
  }

  const stageSkills = skillMap.stages[stage];
  const report = { stage };
  for (const field of SKILL_FIELDS) {
    report[field] = stageSkills[field].map((skillId) =>
      describeSkill(skillId, skillMap.skills, skillMap.sources),
    );
  }
  return report;
}
