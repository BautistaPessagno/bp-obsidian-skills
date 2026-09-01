import fs from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const skillsRoot = path.join(repositoryRoot, "skills");
const skillNames = [
  "setup-bp-vault",
  "ask-bp",
  "develop-note",
  "test-understanding",
  "apply-learning",
  "review-progress",
];
const explicitOnlySkills = new Set(["setup-bp-vault", "ask-bp"]);

function frontmatter(source, filePath) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${filePath}: missing YAML frontmatter`);

  const fields = new Map();
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    fields.set(
      line.slice(0, separator).trim(),
      line.slice(separator + 1).trim().replace(/^"|"$/g, ""),
    );
  }
  return fields;
}

async function validateSkill(skillName) {
  const skillPath = path.join(skillsRoot, skillName, "SKILL.md");
  const source = await fs.readFile(skillPath, "utf8");
  const fields = frontmatter(source, skillPath);

  if (fields.get("name") !== skillName) {
    throw new Error(`${skillPath}: name must match its directory`);
  }
  if (!fields.get("description")) {
    throw new Error(`${skillPath}: description is required`);
  }
  const isExplicit = fields.get("disable-model-invocation") === "true";
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
