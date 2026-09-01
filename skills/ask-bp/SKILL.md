---
name: ask-bp
description: "Recommend the BP Vault skill or flow that fits a documentation, learning, application, or review request."
---

# Ask BP

Route the user's current intent. Inspect the active note and nearby vault context before asking a question. If the two local BP Vault contracts are missing or stale, recommend `setup-bp-vault` first.

Read the structure and method contracts named by the vault's agent guide. Use the vault's language. Return one primary recommendation and one sentence explaining why. The user decides whether to invoke it.

## Routes

- **Document or think:** use `develop-note` for a thought, decision, reference, or learning-oriented note that still needs development.
- **Test learning:** use `test-understanding` when the user wants retrieval, diagnosis, correction, or proof of transfer.
- **Apply:** use `apply-learning` when the desired output is an exercise, explanation, experiment, action, or project with observable success.
- **Review:** use `review-progress` for a note, practice, project, evaluation, or time period judged from accumulated evidence.
- **Configure:** use `setup-bp-vault` when local conventions have not been mapped or have materially changed.

Distinguish a learning-oriented draft from a test. Developing the note improves the material; testing asks the user to produce understanding without support. Distinguish an application from a review. An application creates the next attempt; a review judges evidence from attempts already made.

When a request spans several routes, recommend the step that resolves the current bottleneck and list at most the immediate next step. Do not force documentation into learning, or learning into a note-writing flow.
