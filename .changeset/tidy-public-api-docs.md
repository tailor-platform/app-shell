---
"@tailor-platform/app-shell": patch
---

Correct authentication, routing, guard, and tooltip examples to match the current public APIs.
Document the remaining context, command-palette, AI-tool, sidebar, and date helper exports,
and link them to their existing reference pages for documentation drift checks.
Undocumented public exports now fail `docs:check` instead of producing only a warning.
