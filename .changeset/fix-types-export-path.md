---
"@tailor-platform/app-shell": patch
---

Fixed incorrect `types` path in `package.json` exports. The `"."` entry was pointing to `./dist/index.d.ts` which does not exist. Updated to `./dist/app-shell.d.ts` to match the actual build output.
