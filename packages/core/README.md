# @tailor-platform/app-shell

[![npm version](https://img.shields.io/npm/v/@tailor-platform/app-shell)](https://www.npmjs.com/package/@tailor-platform/app-shell)
[![npm downloads](https://img.shields.io/npm/dm/@tailor-platform/app-shell)](https://www.npmjs.com/package/@tailor-platform/app-shell)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/tailor-platform/app-shell/blob/main/LICENSE.md)

An opinionated React application framework for creating applications on Tailor Platform.

## Why AppShell?

We've made sensible default choices so you can focus on what matters most — building business-level screens. The alternative is implementing authentication, routing, navigation, layouts, and theming all by yourself. AppShell handles all of that out of the box, designed primarily for Vite-based React applications that can be deployed to Tailor Platform's static hosting.

- **Routing** — Declarative module/resource definitions or [file-based routing](https://www.npmjs.com/package/@tailor-platform/vite-plugin-app-shell) with automatic sidebar navigation and breadcrumbs
- **Authentication** — Built-in OAuth2/OIDC integration with Tailor Platform
- **Responsive layouts** — Sidebar, column layouts (1/2/3), and mobile support out of the box
- **Command Palette** — Keyboard-driven quick navigation (`Cmd+K`)
- **Route Guards** — Access control with `pass()`, `hidden()`, `redirectTo()`
- **ERP components** — Badge, DescriptionCard, and more for common business UI patterns
- **i18n** — Built-in internationalization with auto locale detection
- **Theming** — Light/dark mode with Tailwind CSS
- **Portable** — Built on react-router for full portability across React frameworks

## Documentation

The installed package bundles its version-matched documentation under `docs/`; start with
`docs/index.md` to find the relevant guide, pattern, or API reference. Coding agents can use
the repo-managed [app-shell-patterns skill](https://github.com/tailor-platform/app-shell/tree/main/skills/app-shell-patterns),
which discovers those local docs. Skills are installed from the repo, not bundled in npm.

- [Documentation Index](https://github.com/tailor-platform/app-shell/blob/main/docs/index.md) — Reading routes and the complete documentation catalogue
- [Introduction](https://github.com/tailor-platform/app-shell/blob/main/docs/introduction.md) — What is AppShell and why use it
- [Quick Start](https://github.com/tailor-platform/app-shell/blob/main/docs/quickstart.md) — Installation, setup, and first steps
- [Migrations](https://github.com/tailor-platform/app-shell/blob/main/docs/migrations.md) — Breaking changes and the steps each one requires, newest first. Check this when upgrading, or when something looks wrong after a version bump.
