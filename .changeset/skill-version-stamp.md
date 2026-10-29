---
"@tailor-platform/app-shell": patch
---

The bundled `app-shell-patterns` skill now records the `@tailor-platform/app-shell` version it was generated from, in its `metadata.app-shell-version` frontmatter and in a new "Version" section. The skill tells the agent to compare it with the installed package and to suggest re-syncing a vendored copy that has fallen behind.
