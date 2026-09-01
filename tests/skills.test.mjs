import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  explicitOnlySkills,
  readFrontmatter,
  repoPath,
  skillNames,
} from "./helpers.mjs";

test("the package contains exactly the six public skills", async () => {
  const entries = await fs.readdir(repoPath("skills"), { withFileTypes: true });
  const actual = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(actual, [...skillNames].sort());
});

test("only setup-bp-vault and ask-bp require explicit invocation", async () => {
  for (const skillName of skillNames) {
    const { fields } = await readFrontmatter(
      repoPath("skills", skillName, "SKILL.md"),
    );
    assert.equal(fields.get("name"), skillName);
    assert.ok(fields.get("description"), `${skillName} needs a description`);

    const explicitOnly = fields.get("disable-model-invocation") === "true";
    assert.equal(explicitOnly, explicitOnlySkills.has(skillName), skillName);
  }
});

test("every disclosed local reference resolves", async () => {
  for (const skillName of skillNames) {
    const skillPath = repoPath("skills", skillName, "SKILL.md");
    const { source } = await readFrontmatter(skillPath);
    const links = [...source.matchAll(/\[[^\]]+\]\((\.\/references\/[^)]+)\)/g)];

    for (const [, relativePath] of links) {
      const referencedPath = path.resolve(path.dirname(skillPath), relativePath);
      await fs.access(referencedPath);
    }
  }
});
