# BP Vault Skills

Six portable skills for working with Obsidian vaults that have their own structure, language, and learning method.

- `setup-bp-vault` maps one vault's conventions into two local contracts.
- `ask-bp` routes a request to one primary skill.
- `develop-note` develops thoughts, decisions, references, and learning notes.
- `test-understanding` tests retrieval and transfer, then repairs concrete gaps.
- `apply-learning` creates one observable application.
- `review-progress` reviews evidence for an object or time horizon.

## Install

The installer links the versioned skill directories into the shared Matt Pocock skills directory. It leaves any existing path untouched.

```bash
node scripts/install.mjs
```

Run `$setup-bp-vault` once from each vault before using the operational skills. Setup shows its findings and drafts before writing anything.

## Validate

```bash
npm run typecheck
npm run validate
npm test
```

The acceptance scenarios in `tests/acceptance-scenarios.json` cover personal and academic vaults. They describe user-visible outcomes for forward testing without coupling tests to headings or exact prose.

`npm run test:acceptance` runs two ephemeral Codex evaluations. The first follows scripted user replies and writes only to disposable copies of the synthetic vaults. The second reads the resulting file diffs and judges the observed behavior against the expected outcomes. This command sends the versioned skill text and synthetic fixtures to the configured Codex model service. It never reads a real vault.

`npm run test:full` combines syntax, structural, deterministic, and model-evaluated checks.
