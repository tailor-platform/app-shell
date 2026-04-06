---
title: Introduction
description: AppShell is an opinionated React application framework for creating applications on Tailor Platform with built-in authentication, routing, and beautiful UI components.
---

# Introduction

AppShell is a React-based framework that provides the foundation for building custom ERP applications on Tailor Platform. It handles the complex infrastructure so you can focus on building business-level screens and features.

## Why AppShell?

Building ERP applications involves a lot of repetitive infrastructure: authentication, routing, sidebar navigation, breadcrumbs, command palette, permission guards — and keeping them all in sync. AppShell exists to solve this integration problem.

**One declaration drives everything.** When you define a page with `appShellPageProps`, AppShell automatically generates the sidebar item, breadcrumb entry, command palette search result, and route guard — all from a single source of truth. Change a guard to `hidden`, and the page disappears from everywhere at once. No manual sync, no silent bugs.

**Purpose-built for ERP.** Most ERP screens are variations of the same CRUD patterns — lists, detail views, create forms, edit forms. AppShell absorbs this repetitive structure so you can focus your effort on the screens that actually require custom logic: dashboards, approval workflows, and domain-specific visualizations.

**Type-safe by design.** AppShell propagates types across your entire application. Module definitions, route paths, and context data are all type-checked at compile time, catching integration errors before they reach production.

**Vertically integrated with Tailor Platform.** Unlike generic admin frameworks that abstract away the backend, AppShell embraces its tight coupling with Tailor Platform. This lets it provide a complete, opinionated stack — from OAuth2/DPoP authentication to data fetching — without requiring you to write glue code.

## Our Backstory

AppShell was born from real-world ERP delivery projects at Tailor Technologies.

As we built multiple ERP systems on Tailor Platform for different clients, we kept writing the same integration code: wiring up authentication, connecting sidebar navigation to route guards, syncing breadcrumbs with page definitions. Each project had its own slightly different version of this glue, and every variation introduced new opportunities for bugs.

We extracted these common patterns into a shared framework. Instead of documenting "how to wire things together" and hoping every project follows the guide, we encoded the integration directly into code and types — making incorrect wiring a compile-time error rather than a runtime surprise.

Today, AppShell also reflects our bet on AI-assisted development. We operate with small teams augmented by AI agents, running multiple client projects in parallel. The framework's file-based conventions and declarative APIs minimize the decisions an AI agent needs to make — "where does this page go?" and "what do I need to declare?" always have exactly one answer. Knowledge gained on one project — whether by a developer or an AI skill file — transfers directly to the next.

For a deeper look at the tradeoffs and principles behind these choices, see [Design Philosophy](./design-philosophy.md).

## Next Steps

- **[Quick Start](./quickstart.md)** — Install AppShell and build your first page in minutes
- **[Modules & Resources](./concepts/modules-and-resources.md)** — Understand how pages are declared and organized
- **[File-Based Routing](./concepts/file-based-routing.md)** — Learn how directory structure drives navigation
- **[Authentication](./concepts/authentication.md)** — Configure OAuth2 and identity providers
- **[Styling & Theming](./concepts/styling-theming.md)** — Customize the look and feel
