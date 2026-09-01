# BP Vault Skills contributor guide

This repository contains exactly six v1 skills under `skills/`. Keep the public names and invocation policies aligned with `tests/skills.test.mjs`.

Write instructions for another agent, not explanatory documentation for a human. Keep the shared workflow in each `SKILL.md` and disclose guidance used by only one mode through a local reference. A reference must have a contextual link from its entrypoint.

The two local vault contracts are the source of truth for paths, properties, vocabulary, source authority, edit permissions, and review modes. Operational skills must read them instead of imposing personal or academic taxonomy. Searches, links, and edits stay inside the active vault.

Test public installation and invocation behavior. Keep conversational outcomes in `tests/acceptance-scenarios.json`; do not assert exact wording or heading structure.
