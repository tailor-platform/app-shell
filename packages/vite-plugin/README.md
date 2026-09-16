# @tailor-platform/vite-plugin-app-shell

[![npm version](https://img.shields.io/npm/v/@tailor-platform/vite-plugin-app-shell)](https://www.npmjs.com/package/@tailor-platform/vite-plugin-app-shell)
[![npm downloads](https://img.shields.io/npm/dm/@tailor-platform/vite-plugin-app-shell)](https://www.npmjs.com/package/@tailor-platform/vite-plugin-app-shell)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/tailor-platform/app-shell/blob/main/LICENSE.md)

Vite plugin for file-based routing in AppShell applications. Define pages by placing components in a directory structure instead of assembling explicit module/resource hierarchies.

## Installation

```bash
pnpm add @tailor-platform/vite-plugin-app-shell
```

## Usage

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { appShellRoutes } from "@tailor-platform/vite-plugin-app-shell";

export default defineConfig({
  plugins: [react(), appShellRoutes()],
});
```

## Options

| Option                | Type                            | Default       | Description                                                                                                                                                                                            |
| --------------------- | ------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pagesDir`            | `string`                        | `'src/pages'` | Directory containing page components                                                                                                                                                                   |
| `generateTypedRoutes` | `boolean \| { output: string }` | `false`       | Generate typed routes file                                                                                                                                                                             |
| `logLevel`            | `'info' \| 'debug' \| 'off'`    | `'info'`      | Plugin log level                                                                                                                                                                                       |
| `entrypoint`          | `string`                        | —             | File that renders AppShell (e.g. `'src/App.tsx'`). When set, only imports from this file are intercepted, eliminating circular module dependencies. Omit to use legacy mode (all imports intercepted). |

```typescript
appShellRoutes({
  pagesDir: "src/pages",
  generateTypedRoutes: true, // outputs to src/routes.generated.ts
  entrypoint: "src/App.tsx", // recommended: only intercept imports from this file
});
```

For comprehensive usage guide including page conventions, path rules, guards, typed routes, and migration from the legacy API, see the [File-Based Routing documentation](https://github.com/tailor-platform/app-shell/blob/main/docs/file-based-routing.md).

For implementation details and internal architecture notes, see [DESIGN.md](https://github.com/tailor-platform/app-shell/blob/main/packages/vite-plugin/DESIGN.md).
