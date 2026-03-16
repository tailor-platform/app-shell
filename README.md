# Tailor Platform App Shell

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)

AppShell is an opinionated React application framework for creating applications on Tailor Platform. It gives you authentication, routing, sidebar navigation, responsive layouts, and reusable ERP components out of the box — so you can focus on building business screens.

## Packages

| Package                                                            | Version                                                                                                                                             | Description                                                   |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`@tailor-platform/app-shell`](./packages/core)                    | [![npm](https://img.shields.io/npm/v/@tailor-platform/app-shell)](https://www.npmjs.com/package/@tailor-platform/app-shell)                         | Core library — components, hooks, layouts, and authentication |
| [`@tailor-platform/app-shell-vite-plugin`](./packages/vite-plugin) | [![npm](https://img.shields.io/npm/v/@tailor-platform/app-shell-vite-plugin)](https://www.npmjs.com/package/@tailor-platform/app-shell-vite-plugin) | Vite plugin for file-based routing                            |

## Examples

| Example                               | Description                                                  |
| ------------------------------------- | ------------------------------------------------------------ |
| [`vite-app`](./examples/vite-app)     | Vite app with file-based routing using the vite-plugin       |
| [`nextjs-app`](./examples/nextjs-app) | Next.js App Router integration                               |
| [`app-module`](./examples/app-module) | Standalone module package that can be consumed by other apps |

## Documentation

For users building applications with AppShell, see the detailed guides in `docs/`:

- [Introduction](./docs/introduction.md) — What is AppShell and why use it
- [Quick Start](./docs/quickstart.md) — Installation, setup, and first steps

## Development

This project is a monorepo managed with pnpm.

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
