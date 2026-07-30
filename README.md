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

Hosted references, no checkout required:

| Site                                                    | Description                                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [UI Catalogue](https://ui.tailor.tech)                  | Live component previews, full-page samples, composite UI patterns, and routing recipes |
| [Theme Generator](https://theme.tailor.tech/playground) | Generate an AppShell palette CSS file from a primary color                             |

## Development

This project is a monorepo managed with pnpm + turbo. For prerequisites, setup, the end-to-end
development workflow, and publishing, see **[CONTRIBUTING.md](./CONTRIBUTING.md)**.
