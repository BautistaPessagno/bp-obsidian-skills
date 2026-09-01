import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const testsRoot = path.join(repositoryRoot, "tests");

async function runCodex(label, prompt, schemaPath, evaluationRoot, sandbox) {
  const resultsRoot = path.join(evaluationRoot, ".results");
  await fs.mkdir(resultsRoot, { recursive: true });
  const outputPath = path.join(resultsRoot, `${label}.json`);
  const result = spawnSync(
    "codex",
    [
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--sandbox",
      sandbox,
      "--output-schema",
      schemaPath,
      "--output-last-message",
      outputPath,
      "--cd",
      evaluationRoot,
      "--color",
      "never",
      prompt,
    ],
    {
      cwd: evaluationRoot,
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
}

function assertOneResultPerScenario(label, results, scenarios) {
  const expected = scenarios.map((scenario) => scenario.id).sort();
  const actual = results.map((result) => result.id).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} did not return exactly one result per scenario`);
  }
}

async function snapshot(root) {
  const files = new Map();

  async function walk(directory, prefix = "") {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = path.join(prefix, entry.name);
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, relativePath);
      } else if (entry.isSymbolicLink()) {
        files.set(relativePath, `symlink:${await fs.readlink(fullPath)}`);
      } else {
        files.set(relativePath, await fs.readFile(fullPath, "utf8"));
      }
    }
  }

  await walk(root);
  return files;
}

function changesBetween(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths]
    .sort()
    .flatMap((filePath) => {
      const previous = before.get(filePath);
      const current = after.get(filePath);
      if (previous === current) return [];
      return [{
        path: filePath,
        action: previous === undefined ? "created" : current === undefined ? "deleted" : "modified",
        before: previous ?? null,
        after: current ?? null,
      }];
    });
}

async function run() {
  const scenarioPath = path.join(testsRoot, "acceptance-scenarios.json");
  const scenarios = JSON.parse(await fs.readFile(scenarioPath, "utf8"));
  const requests = scenarios.map(({ expect: _expect, ...scenario }) => scenario);
  const evaluationRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bp-vault-acceptance-"));

  try {
    const evaluationSkills = path.join(evaluationRoot, "skills");
    const vaultsRoot = path.join(evaluationRoot, "vaults");
    await fs.cp(path.join(repositoryRoot, "skills"), evaluationSkills, { recursive: true });
    await fs.mkdir(vaultsRoot, { recursive: true });

    const beforeByScenario = new Map();
    for (const scenario of scenarios) {
      const fixtureName = scenario.fixture ?? scenario.vault;
      const fixture = path.join(testsRoot, "fixtures", fixtureName);
      const destination = path.join(vaultsRoot, scenario.id);
      await fs.cp(fixture, destination, { recursive: true });
      beforeByScenario.set(scenario.id, await snapshot(destination));
    }
    const skillsBefore = await snapshot(evaluationSkills);

    const performerPrompt = `
You are independently forward-testing BP Vault Skills in a disposable workspace. Read each requested skill's full SKILL.md under ${evaluationSkills} and only the linked references triggered by the scenario. Each request has its own simulated Obsidian vault at ${vaultsRoot}/<scenario id>. Read that vault's contracts and active note.

Process every request independently. Follow the complete skill workflow. Whenever it would pause for the user, consume the next scripted response in order and continue. Make approved writes in that scenario's disposable vault so the test can inspect real artifacts. For test-understanding, use the supplied retrieval answer, transfer answer, and approval as separate turns; report the concrete gap, minimal teaching, and terminal condition. Do not invent missing responses. Record the user-visible routing decision, questions, proposal, writes, responses consumed, and terminal condition.

Keep every search, link, and write inside the current scenario vault. Do not alter the copied skills. Do not access any path outside ${evaluationRoot}.

Requests:
${JSON.stringify(requests, null, 2)}
`;
    const performed = await runCodex(
      "performer",
      performerPrompt,
      path.join(testsRoot, "acceptance-performer.schema.json"),
      evaluationRoot,
      "workspace-write",
    );
    assertOneResultPerScenario("performer", performed.results, scenarios);

    const skillsAfter = await snapshot(evaluationSkills);
    if (changesBetween(skillsBefore, skillsAfter).length > 0) {
      throw new Error("performer modified the copied skill implementation");
    }

    const observedResults = [];
    for (const result of performed.results) {
      const vault = path.join(vaultsRoot, result.id);
      observedResults.push({
        ...result,
        filesystem_changes: changesBetween(
          beforeByScenario.get(result.id),
          await snapshot(vault),
        ),
      });
    }

    const judgePrompt = `
You are an independent acceptance-test judge. Compare each observed result and its real filesystem diff with the listed user-visible criteria. Pass a criterion only when the interaction or changed artifact provides concrete evidence. Do not infer behavior from the criterion itself. Exact wording and heading names do not matter. A scenario passes only when every criterion passes and the result stays within its active vault. Setup reruns must preserve text outside managed blocks and keep a single pointer block. test-understanding must show the supplied wrong retrieval answer being diagnosed, minimal repair, and the supplied new transfer case reaching a terminal condition.

Criteria:
${JSON.stringify(scenarios.map(({ id, expect }) => ({ id, expect })), null, 2)}

Observed results:
${JSON.stringify(observedResults, null, 2)}
`;
    const judged = await runCodex(
      "judge",
      judgePrompt,
      path.join(testsRoot, "acceptance-judge.schema.json"),
      evaluationRoot,
      "read-only",
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
  } finally {
    await fs.rm(evaluationRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
