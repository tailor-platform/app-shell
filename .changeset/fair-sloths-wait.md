---
"@tailor-platform/app-shell-vite-plugin": patch
---

Fix typed routes generation to avoid a file existence check before reading or writing the generated output.

This keeps the generated routes file behavior the same while removing the race-prone filesystem pattern flagged by code scanning.
