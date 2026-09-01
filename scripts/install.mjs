import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { skillNames } from "../lib/skill-manifest.mjs";

function targetFromArguments(argumentsList) {
  const targetIndex = argumentsList.indexOf("--target");
  if (targetIndex === -1) {
    return path.join(os.homedir(), ".agents", "skills");
  }

  const target = argumentsList[targetIndex + 1];
  if (!target) {
    throw new Error("--target requires a directory");
  }
  return path.resolve(target);
}

async function existingDestination(destination, source) {
  try {
    const destinationStats = await fs.lstat(destination);
    if (!destinationStats.isSymbolicLink()) return "collision";
    return (await fs.realpath(destination)) === source ? "installed" : "collision";
  } catch (error) {
    if (error.code === "ENOENT") return "missing";
    throw error;
  }
}

async function install() {
  const repositoryRoot = path.resolve(import.meta.dirname, "..");
  const target = targetFromArguments(process.argv.slice(2));
  await fs.mkdir(target, { recursive: true });

  const operations = [];
  for (const skillName of skillNames) {
    const source = path.join(repositoryRoot, "skills", skillName);
    const destination = path.join(target, skillName);
    const state = await existingDestination(destination, source);
    if (state === "collision") {
      throw new Error(`Refusing to replace existing skill: ${skillName}`);
    }
    operations.push({ source, destination, state });
  }

  for (const operation of operations) {
    if (operation.state === "missing") {
      await fs.symlink(operation.source, operation.destination, "dir");
    }
  }

  process.stdout.write(`BP Vault Skills installed in ${target}\n`);
}

install().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
