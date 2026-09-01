import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { repoPath, skillNames } from "./helpers.mjs";

function install(target) {
  return spawnSync(
    process.execPath,
    [repoPath("scripts", "install.mjs"), "--target", target],
    { encoding: "utf8" },
  );
}

test("installer exposes all six skills and can run twice", async (t) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bp-vault-install-"));
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
  const target = path.join(temporaryRoot, "skills");

  const firstRun = install(target);
  assert.equal(firstRun.status, 0, firstRun.stderr);

  for (const skillName of skillNames) {
    const link = path.join(target, skillName);
    assert.equal((await fs.lstat(link)).isSymbolicLink(), true);
    assert.equal(
      await fs.realpath(link),
      repoPath("skills", skillName),
      `${skillName} should resolve to its versioned source`,
    );
  }

  const secondRun = install(target);
  assert.equal(secondRun.status, 0, secondRun.stderr);
});

test("installer preserves an existing skill instead of overwriting it", async (t) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bp-vault-collision-"));
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));
  const target = path.join(temporaryRoot, "skills");
  const collision = path.join(target, "ask-bp");
  await fs.mkdir(collision, { recursive: true });
  await fs.writeFile(path.join(collision, "keep.txt"), "owned elsewhere\n");

  const result = install(target);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ask-bp/);
  assert.equal(await fs.readFile(path.join(collision, "keep.txt"), "utf8"), "owned elsewhere\n");
});
