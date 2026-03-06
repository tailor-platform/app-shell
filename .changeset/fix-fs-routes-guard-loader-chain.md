---
"@tailor-platform/app-shell": patch
---

Fixed file-based routing (vite plugin) not chaining guards with user-provided loaders. When a page module defines both guards and a `loader` export, guards are now evaluated first via `withGuardsLoader`, and the user loader runs only after guards pass. Previously, guards could overwrite the user loader.
