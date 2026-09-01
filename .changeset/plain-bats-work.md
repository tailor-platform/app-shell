---
"@tailor-platform/app-shell-sdk-plugin": patch
---

Fix `appShellPlugin()` compatibility with `@tailor-platform/sdk` v2 generation hooks while keeping v1 backward compatibility.

The plugin now treats SDK v2 as the primary shape, reads TailorDB schema data from both the legacy `tailordb[].types` shape and the v2 `tailordb[].tables` shape, accepts v2 relation metadata that uses `rawRelation.toward.table`, and narrows the peer dependency to supported SDK majors only (`^1 || ^2`).
