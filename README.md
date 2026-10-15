# BP Vault Skills

> [!NOTE]
> **Archived at v0.1.** This repository is no longer maintained. The next version is being rebuilt as vault-local skills inside my Obsidian vault, based on how I actually use it. Release v0.1 is commit `f2342c8`.

BP Vault Skills is a portable toolkit for thinking, documenting, learning, applying knowledge, and reviewing progress in Obsidian.

The skills adapt to each vault instead of imposing one folder structure, property schema, or study method. A personal vault can keep its ideas, projects, and periodic reviews. An academic vault can keep its subjects, classes, practices, and evaluations. Both use the same skills through local contracts that describe what those concepts mean in that vault.

The system also keeps documentation and learning separate. A note can be well developed without being treated as learned. Learning requires observable evidence such as retrieval, transfer to a new case, or application.

## Included skills

| Skill | Purpose | Invocation |
| --- | --- | --- |
| `setup-bp-vault` | Inspects one vault and drafts its local structure and method contracts. | Explicit |
| `ask-bp` | Recommends the best BP Vault route for the current request. | Explicit |
| `develop-note` | Develops a thought, decision, reference, or learning note. | Explicit or automatic |
| `test-understanding` | Tests retrieval, diagnoses a concrete gap, teaches minimally, and checks transfer. | Explicit or automatic |
| `apply-learning` | Turns knowledge into one small application with observable success. | Explicit or automatic |
| `review-progress` | Reviews evidence for a note, practice, project, evaluation, or time period. | Explicit or automatic |

## How it works

Run `setup-bp-vault` once in each vault. It explores the existing structure, templates, properties, links, language, and source hierarchy before proposing any files.

After approval, setup creates two visible and versionable contracts:

- `bp-vault-structure.md` records paths, templates, properties, link rules, and edit permissions.
- `bp-vault-method.md` maps captures, knowledge, practice, application, evidence, and reviews to the vault's own vocabulary.

The operational skills read these contracts before working. They keep searches and links inside the active vault, preserve local source priorities, and request approval before semantic rewrites or structural changes.

## Install with the Skills CLI

You need Node.js and npm so that `npx` is available. Install the repository with the [Skills CLI](https://skills.sh/docs/cli):

```bash
npx skills add BautistaPessagno/bp-obsidian-skills
```

The CLI downloads the skills and configures them for your selected AI agent. See [skills.sh](https://skills.sh/) for supported agents and current CLI documentation.

The CLI reports anonymous installation telemetry by default. To disable it for the command:

```bash
DISABLE_TELEMETRY=1 npx skills add BautistaPessagno/bp-obsidian-skills
```

### Local development install

Contributors working from a clone can link the versioned skill directories into `~/.agents/skills`:

```bash
node scripts/install.mjs
```

The local installer is idempotent and refuses to overwrite an existing skill owned by another installation.

## Set up a vault

Open your AI agent from the root of an Obsidian vault, then invoke:

```text
$setup-bp-vault
```

Setup follows this sequence:

1. It reads the vault before asking questions.
2. It presents observed facts, inferences, conflicts, and unknowns.
3. It drafts the two local contracts and a short pointer block for the vault's agent guide.
4. It waits for approval before writing.

Setup does not migrate folders, rename notes, add universal properties, or change templates on its own. Re-running it updates only its managed blocks and preserves surrounding edits.

After setup, use `$ask-bp` when you want a route recommendation.

## Typical flows

Develop a reflection without turning it into study material:

```text
$develop-note Develop this thought and preserve its open questions.
```

Develop, test, and apply academic material:

```text
$develop-note Develop this class note for learning.
$test-understanding Test my understanding without showing the answer first.
$apply-learning Turn this into one verifiable practice exercise.
```

Review evidence from a period or evaluation:

```text
$review-progress Review my progress this month.
$review-progress Check whether I am ready for this exam.
```

## Design boundaries

- One active vault is one hard boundary. The skills do not create links between vaults.
- A developed note and learned knowledge are different states.
- Retrieval, transfer, and application are stronger evidence than note counts or time spent.
- Facts, interpretations, and personal experience remain distinguishable.
- Local or course sources take priority when the vault contract says they do.
- Reviews are user-invoked. The skills do not create schedules or automations.

## Development and validation

Run the deterministic checks:

```bash
npm run typecheck
npm run validate
npm test
```

`npm run validate` runs both package-specific checks and the structural validator supplied by the Codex skill creator.

The 15 acceptance scenarios under `tests/` use disposable personal and academic vault fixtures. To run the model-evaluated suite:

```bash
npm run test:acceptance
```

This command sends the versioned skill text and synthetic fixtures to the configured Codex model service. It never reads a real vault. The performer writes only to temporary fixture copies, and an independent read-only judge evaluates the resulting interactions and file diffs.

Run every check together with:

```bash
npm run test:full
```
