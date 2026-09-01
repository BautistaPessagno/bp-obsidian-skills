---
name: setup-bp-vault
description: "Discover an Obsidian vault and create its local BP Vault Skills contracts. Run once per vault and again when its conventions change."
---

# Setup BP Vault

Configure BP Vault Skills for the active vault without migrating it to a shared taxonomy. This is a guided exploration. Use the installed `grilling` skill for unresolved decisions and the installed `obsidian-markdown` skill whenever editing Obsidian syntax. Reuse their instructions instead of restating them here.

## Boundaries

Work inside one active vault. Treat the nearest ancestor containing `.obsidian/` as its root and keep every search, link, and edit inside it. Stop and ask for the vault root when that boundary is unclear.

Setup may document existing conventions and propose changes. It may write only the approved contracts and guide pointers. Taxonomies, templates, properties, bases, and notes remain unchanged unless the user later requests those changes separately.

## Process

1. Explore before interviewing. Read the root agent guides, existing agent documentation, templates, representative notes, properties, `.base` files, indexes, link conventions, configured language, and source-authority rules. Sample enough notes to distinguish a convention from an accident.
2. Present findings before any write. Separate observed facts, inferences, conflicts, and unknowns. Show which existing conventions should remain untouched.
3. Ask only about unresolved choices that change the contracts. Use `grilling` one decision at a time. If neither `AGENTS.md` nor `CLAUDE.md` exists, ask which guide to create.
4. Read [the contract shape](./references/contract-shape.md). Map the common concepts to this vault's real objects and vocabulary. A missing mapping stays explicit; it never creates a universal folder, category, or property.
5. Show complete drafts of both contracts and the exact guide-pointer block. Call out every proposed structural change, including new directories. Wait for explicit approval.
6. Write the approved material. Default to `docs/agents/bp-vault-structure.md` and `docs/agents/bp-vault-method.md`, unless the vault already has a documented location for agent instructions. Add one managed pointer block to the existing guide.

Use these markers for the guide block and for the setup-owned section of each contract:

```markdown
<!-- bp-vault-skills:start -->
...
<!-- bp-vault-skills:end -->
```

On a later run, replace only the content between matching markers. Preserve everything outside them. Show edits found inside a managed block in the draft so the user can decide whether to retain them. Never append a second block.

Setup is complete when the approved contracts and single guide block are present, their paths resolve, and all unresolved mappings are recorded instead of guessed. Reply in the vault's configured language and name the operational skills that can now use the contracts.
