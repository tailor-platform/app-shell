---
"@tailor-platform/app-shell": patch
---

Fix the hook documentation and the bundled `app-shell-patterns` skill where the examples did not match the real return types. Both `useAppShell()` and `useAppShellData()` expose a `contextData` property (not `context`, and not the data object itself); `useAppShell()` also returns the configuration. `useAppShellConfig()` returns `{ title, icon, favicon, appInfo, configurations }` with `modules` under `configurations`, and `useToast()` returns the sonner `toast` function (`toast("Saved")`, `toast.success(...)`) rather than `{ toast }` with a `{ title, description, variant }` object. Copying the old examples produced TS2339 and TS2353 errors.
