---
"@tailor-platform/app-shell": patch
---

Fix the hook documentation and the bundled `app-shell-patterns` skill where the examples did not match the real return types. `useAppShell()` and `useAppShellData()` return `{ contextData }` (not `context` or the data object itself), `useAppShellConfig()` returns `{ title, icon, favicon, appInfo, configurations }` with `modules` under `configurations`, and `useToast()` returns the sonner `toast` function (`toast("Saved")`, `toast.success(...)`) rather than `{ toast }` with a `{ title, description, variant }` object. Copying the old examples produced TS2339 and TS2353 errors.
