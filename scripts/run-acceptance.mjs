import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const testsRoot = path.join(repositoryRoot, "tests");

async function runCodex(label, prompt, schemaPath) {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bp-vault-acceptance-"));
  const outputPath = path.join(temporaryRoot, `${label}.json`);
  try {
    const result = spawnSync(
      "codex",
      [
        "exec",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        "--cd",
        repositoryRoot,
        "--color",
        "never",
        prompt,
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 10 * 60 * 1000,
      },
    );

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`${label} failed:\n${result.stderr || result.stdout}`);
    }
    return JSON.parse(await fs.readFile(outputPath, "utf8"));
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

function assertOneResultPerScenario(label, results, scenarios) {
  const expected = scenarios.map((scenario) => scenario.id).sort();
  const actual = results.map((result) => result.id).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} did not return exactly one result per scenario`);
  }
}

async function run() {
  const scenarioPath = path.join(testsRoot, "acceptance-scenarios.json");
  const scenarios = JSON.parse(await fs.readFile(scenarioPath, "utf8"));
  const requests = scenarios.map(({ expect: _expect, ...scenario }) => scenario);

  const performerPrompt = `
You are independently forward-testing BP Vault Skills. Read each requested skill's full SKILL.md under ${path.join(repositoryRoot, "skills")} and only the linked references triggered by the scenario. Treat ${path.join(testsRoot, "fixtures", "personal")} and ${path.join(testsRoot, "fixtures", "academic")} as simulated Obsidian vaults. Read the applicable vault contracts and active note. Never edit files.

For every request below, simulate the skill through the first point where it must wait for a user response or approval. Record the user-visible routing decision, questions, proposal contents, and files it would create or update. For a multi-turn learning test, describe the required later diagnosis and transfer behavior without inventing a user answer. Judge only the loaded skill and fixture. Keep all searches and proposed links inside that fixture.

Requests:
${JSON.stringify(requests, null, 2)}
`;
  const performed = await runCodex(
    "performer",
    performerPrompt,
    path.join(testsRoot, "acceptance-performer.schema.json"),
  );
  assertOneResultPerScenario("performer", performed.results, scenarios);

  const judgePrompt = `
You are an independent acceptance-test judge. Compare each observed result with its listed user-visible criteria. Pass a criterion only when the observed decisions, questions, proposal, artifacts, or stopping boundary provide concrete evidence. Do not infer behavior from the criterion itself. Exact wording and heading names do not matter. A scenario passes only when every criterion passes and the result stays within the active vault.

Criteria:
${JSON.stringify(scenarios.map(({ id, expect }) => ({ id, expect })), null, 2)}

Observed results:
${JSON.stringify(performed.results, null, 2)}
`;
  const judged = await runCodex(
    "judge",
    judgePrompt,
    path.join(testsRoot, "acceptance-judge.schema.json"),
  );
  assertOneResultPerScenario("judge", judged.results, scenarios);

  const failures = judged.results.filter((result) => !result.passed);
  if (failures.length > 0) {
    const details = failures
      .map((result) => `${result.id}: ${result.failures.join("; ")}`)
      .join("\n");
    throw new Error(`Acceptance scenarios failed:\n${details}`);
  }

  process.stdout.write(`Passed ${judged.results.length} model-evaluated acceptance scenarios.\n`);
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
