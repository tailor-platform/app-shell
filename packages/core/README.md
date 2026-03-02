# @tailor-platform/app-shell

[![npm version](https://img.shields.io/npm/v/@tailor-platform/app-shell)](https://www.npmjs.com/package/@tailor-platform/app-shell)
[![npm downloads](https://img.shields.io/npm/dm/@tailor-platform/app-shell)](https://www.npmjs.com/package/@tailor-platform/app-shell)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../../LICENSE.md)

An opinionated React application framework for creating applications on Tailor Platform.

## Why AppShell?

We've made sensible default choices so you can focus on what matters most — building business-level screens. The alternative is implementing authentication, routing, navigation, layouts, and theming all by yourself. AppShell handles all of that out of the box, designed primarily for Vite-based React applications that can be deployed to Tailor Platform's static hosting.

- **Routing** — Declarative module/resource definitions or [file-based routing](https://www.npmjs.com/package/@tailor-platform/app-shell-vite-plugin) with automatic sidebar navigation and breadcrumbs
- **Authentication** — Built-in OAuth2/OIDC integration with Tailor Platform
- **Responsive layouts** — Sidebar, column layouts (1/2/3), and mobile support out of the box
- **Command Palette** — Keyboard-driven quick navigation (`Cmd+K`)
- **Route Guards** — Access control with `pass()`, `hidden()`, `redirectTo()`
- **ERP components** — Badge, DescriptionCard, and more for common business UI patterns
- **i18n** — Built-in internationalization with auto locale detection
- **Theming** — Light/dark mode with Tailwind CSS
- **Portable** — Built on react-router for full portability across React frameworks

## Documentation

- [Quick Start](https://github.com/tailor-platform/app-shell/blob/main/docs/quickstart.md) — Installation, setup, and first steps
- [API Reference](https://github.com/tailor-platform/app-shell/blob/main/docs/api.md) — Complete reference for all components, hooks, and functions
