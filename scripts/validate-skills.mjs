import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { explicitOnlySkills, skillNames } from "../lib/skill-manifest.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const skillsRoot = path.join(repositoryRoot, "skills");
async function validateSkill(skillName) {
  const skillDirectory = path.join(skillsRoot, skillName);
  const skillPath = path.join(skillDirectory, "SKILL.md");
  const source = await fs.readFile(skillPath, "utf8");
  if (/^disable-model-invocation:/m.test(source)) {
    throw new Error(`${skillPath}: unsupported invocation policy field`);
  }

  const policyPath = path.join(skillDirectory, "agents", "openai.yaml");
  let isExplicit = false;
  try {
    const policy = await fs.readFile(policyPath, "utf8");
    isExplicit = /allow_implicit_invocation:\s*false/.test(policy);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (isExplicit !== explicitOnlySkills.has(skillName)) {
    throw new Error(`${skillPath}: invocation policy does not match the spec`);
  }
  if (/\b(TODO|TBD|PLACEHOLDER)\b/i.test(source)) {
    throw new Error(`${skillPath}: unfinished scaffold text`);
  }

  const localLinks = source.matchAll(/\[[^\]]+\]\((\.\/[^)]+)\)/g);
  for (const [, relativePath] of localLinks) {
    await fs.access(path.resolve(path.dirname(skillPath), relativePath));
  }

  const codexHome = process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(os.homedir(), ".codex");
  const systemValidator = path.join(
    codexHome,
    "skills",
    ".system",
    "skill-creator",
    "scripts",
    "quick_validate.py",
  );
  const result = spawnSync("python3", [systemValidator, skillDirectory], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`${skillName}: ${result.stderr || result.stdout}`.trim());
  }
}

async function validateScenarios() {
  const scenarioPath = path.join(repositoryRoot, "tests", "acceptance-scenarios.json");
  const scenarios = JSON.parse(await fs.readFile(scenarioPath, "utf8"));
  const identifiers = new Set();

  for (const scenario of scenarios) {
    if (!scenario.id || identifiers.has(scenario.id)) {
      throw new Error(`${scenarioPath}: scenario identifiers must be unique`);
    }
    identifiers.add(scenario.id);
    if (!skillNames.includes(scenario.skill)) {
      throw new Error(`${scenarioPath}: unknown skill ${scenario.skill}`);
    }
    if (!scenario.request || !Array.isArray(scenario.expect) || scenario.expect.length === 0) {
      throw new Error(`${scenarioPath}: ${scenario.id} has no observable expectation`);
    }
    if (!Array.isArray(scenario.scripted_responses)) {
      throw new Error(`${scenarioPath}: ${scenario.id} has no scripted interaction`);
    }

    const fixtureName = scenario.fixture ?? scenario.vault;
    const fixture = path.join(repositoryRoot, "tests", "fixtures", fixtureName);
    await fs.access(fixture);
    if (scenario.active_note) {
      await fs.access(path.join(fixture, scenario.active_note));
    }
  }

  for (const skillName of skillNames) {
    if (!scenarios.some((scenario) => scenario.skill === skillName)) {
      throw new Error(`${scenarioPath}: no acceptance scenario for ${skillName}`);
    }
  }

  for (const skillName of [
    "setup-bp-vault",
    "develop-note",
    "apply-learning",
    "review-progress",
  ]) {
    for (const vault of ["personal", "academic"]) {
      if (!scenarios.some((scenario) => scenario.skill === skillName && scenario.vault === vault)) {
        throw new Error(`${scenarioPath}: ${skillName} needs a ${vault} scenario`);
      }
    }
  }

  const developModes = new Set(
    scenarios
      .filter((scenario) => scenario.skill === "develop-note")
      .map((scenario) => scenario.mode),
  );
  for (const mode of ["thought", "decision", "reference", "learning"]) {
    if (!developModes.has(mode)) {
      throw new Error(`${scenarioPath}: develop-note needs a ${mode} scenario`);
    }
  }

  return scenarios.length;
}

async function validate() {
  const directoryNames = (await fs.readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const expectedNames = [...skillNames].sort();
  if (JSON.stringify(directoryNames) !== JSON.stringify(expectedNames)) {
    throw new Error("skills/ must contain exactly the six v1 skills");
  }

  for (const skillName of skillNames) await validateSkill(skillName);
  const scenarioCount = await validateScenarios();
  process.stdout.write(`Validated ${skillNames.length} skills and ${scenarioCount} acceptance scenarios.\n`);
}

validate().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
