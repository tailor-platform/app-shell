---
"@tailor-platform/app-shell": patch
"@tailor-platform/sdk-plugin-app-shell": minor
---

Fix Decimal metadata and query types to use strings with numeric sort/filter operators, matching the GraphQL Decimal scalar.
Preserve decimal precision when adding, editing, or restoring DataTable filters.

The SDK plugin now requires `@tailor-platform/app-shell` `^1.16.1` as a peer dependency. Upgrade AppShell before upgrading the plugin, then run `tailor generate` to regenerate metadata: decimal fields and decimal array items now use `decimal` instead of `number`. AppShell 1.16.0 and earlier cannot consume the new decimal metadata; update hand-written decimal filter values from numbers to strings.
