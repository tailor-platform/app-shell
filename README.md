# Tailor Platform App Shell

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)

AppShell is an opinionated React application framework for creating applications on Tailor Platform. It gives you authentication, routing, sidebar navigation, responsive layouts, and reusable ERP components out of the box — so you can focus on building business screens.

## Packages

[![pkg.pr.new](https://pkg.pr.new/badge/tailor-platform/app-shell)](https://pkg.pr.new/~/tailor-platform/app-shell)

| Package                                                            | Version                                                                                                                                             | Description                                                   |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`@tailor-platform/app-shell`](./packages/core)                    | [![npm](https://img.shields.io/npm/v/@tailor-platform/app-shell)](https://www.npmjs.com/package/@tailor-platform/app-shell)                         | Core library — components, hooks, layouts, and authentication |
| [`@tailor-platform/app-shell-vite-plugin`](./packages/vite-plugin) | [![npm](https://img.shields.io/npm/v/@tailor-platform/app-shell-vite-plugin)](https://www.npmjs.com/package/@tailor-platform/app-shell-vite-plugin) | Vite plugin for file-based routing                            |

## Examples

| Example                               | Description                                            |
| ------------------------------------- | ------------------------------------------------------ |
| [`vite-app`](./examples/vite-app)     | Vite app with file-based routing using the vite-plugin |
| [`nextjs-app`](./examples/nextjs-app) | Next.js App Router integration                         |

## Documentation

For users building applications with AppShell, see the detailed guides in `docs/`:

- [Introduction](./docs/introduction.md) — What is AppShell and why use it
- [Quick Start](./docs/quickstart.md) — Installation, setup, and first steps

## Development

This project is a monorepo managed with pnpm.

### Prerequisites

This project requires **Node.js 24** (see `engines` in `package.json`; CI runs on Node 24). Some build tooling (`tsdown`) relies on Node 24's native TypeScript config loading — on older versions it falls back to a loader that isn't installed, and the build fails. `engine-strict` is enabled, so `pnpm install` will refuse to run on an unsupported version.

If you use [nvm](https://github.com/nvm-sh/nvm), a `.nvmrc` is provided:

```bash
nvm use      # or: nvm install
```

### Setup

```bash
pnpm install
```

### Commands

```bash
pnpm dev          # Start all packages in development mode with hot reloading
pnpm build        # Build all packages for production
pnpm type-check   # Run type checking across all packages
```

### Testing

```bash
cd packages/core && pnpm test
```

### Publishing

This project uses [changesets](https://github.com/changesets/changesets) for version management:

```bash
pnpm changeset:create    # Create a changeset describing your changes
pnpm changeset:publish   # Build and publish to NPM (automated via CI)
```
