#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  buildStageSkillReport,
  loadSystemConfig,
  validateAdapterConfig,
  validateSystemConfig,
} from "./config.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "..", "..");

function printUsage() {
  console.log("Usage:");
  console.log("  pnpm skills -- <stage>");
  console.log("  pnpm validate");
}

async function main() {
  const [command, argument] = process.argv.slice(2);
  const config = await loadSystemConfig(repoRoot);
  const { workflow, skillMap, adapterManifest, adapterArtifacts } = config;

  if (command === "validate") {
    console.log(
      JSON.stringify(
        {
          ...validateSystemConfig(workflow, skillMap),
          ...validateAdapterConfig(workflow, adapterManifest, adapterArtifacts),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === "skills" && argument) {
    console.log(JSON.stringify(buildStageSkillReport(argument, workflow, skillMap), null, 2));
    return;
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
