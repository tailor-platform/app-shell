---
"@tailor-platform/app-shell": patch
---

Fix shared type identity between the main and testing entry points: modules created with `defineModule()` no longer need casts, and `AppShellRegister` augmentation reaches the testing `AppShell` props and guards.
Runtime behavior is unchanged.
