import fs from "node:fs/promises";
import path from "node:path";

export const skillNames = [
  "setup-bp-vault",
  "ask-bp",
  "develop-note",
  "test-understanding",
  "apply-learning",
  "review-progress",
];

export const explicitOnlySkills = new Set(["setup-bp-vault", "ask-bp"]);

export async function readFrontmatter(filePath) {
  const source = await fs.readFile(filePath, "utf8");
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);

  if (!match) {
    throw new Error(`${filePath} has no YAML frontmatter`);
  }

  const fields = new Map();
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
    fields.set(key, value);
  }

  return { source, fields };
}

export function repoPath(...segments) {
  return path.resolve(import.meta.dirname, "..", ...segments);
}
