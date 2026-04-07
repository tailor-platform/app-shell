---
title: Design Philosophy
description: The design principles and tradeoffs behind AppShell's architecture.
---

# Design Philosophy

AppShell makes deliberate tradeoffs — coupling over flexibility, convention over configuration, integration over composition. This page explains the reasoning behind those choices.

## Why a Framework, Not a Library Collection

ERP applications need authentication, routing, sidebar navigation, breadcrumbs, command palette, and permission guards. Each of these can be solved by an individual library. The hard part is not the individual pieces — it's keeping them in sync.

When you add a new page, the sidebar needs an entry. The breadcrumb trail needs updating. The command palette needs a new search result. The route guard needs to be evaluated. When you hide a page with a guard, it should disappear from _all_ of those surfaces — not just the router.

With a library collection, you write and maintain this synchronization code yourself. With AppShell, a single `appShellPageProps` declaration on a page component drives all of these surfaces automatically:

```tsx
OrdersPage.appShellPageProps = {
  meta: {
    title: "Orders",
    icon: <OrdersIcon />,
  },
  guards: [authGuard],
};
```

The cost of this integration is not in the initial setup — it's in the ongoing maintenance. Every time you add, remove, or modify a page, a library-based approach requires manual updates across multiple surfaces. The bugs this produces — "guard is set to hidden but the command palette still shows it" — are silent and hard to test for. A framework eliminates this class of bugs entirely.

## Default Coupling, Opt-Out Exceptions

AppShell couples everything by default. A page appears in the sidebar, breadcrumbs, and command palette unless you explicitly opt out.

This is an intentional asymmetry. Opting out is expressed through the same mechanisms the framework already provides — for example, using a guard that returns `hidden` removes a page from the sidebar, breadcrumbs, and command palette all at once.

When you need finer control, AppShell provides a compositional layer. The sidebar, for instance, supports two modes: auto-generation (the default, driven entirely by module/resource definitions) and composition mode, where you build the sidebar structure explicitly using `SidebarItem`, `SidebarGroup`, and `SidebarSeparator` components. You can start with full auto-generation and gradually move to composition mode as your needs grow — without an all-or-nothing switch.

Opting _in_ to coupling from a decoupled starting point — manually wiring sidebar entries, breadcrumb paths, and search results for every page — costs orders of magnitude more. The value of default coupling is not that exceptions never exist, but that expressing exceptions is trivial.

## Built for ERP, Not for Everything

AppShell targets applications where the majority of screens are CRUD — lists, detail views, create and edit forms. This is the reality of most ERP systems: even as they mature and add dashboards, approval workflows, and custom visualizations, the number of CRUD screens continues to grow (new master data entities, new transaction types).

For non-CRUD screens, AppShell stays out of the way. The framework manages the shell — routing, guards, layout, navigation — while page content is entirely yours. The ratio of "framework-managed" to "custom-built" shifts as a project matures, but the shell remains useful regardless of what's inside it.

If your application is primarily custom visualizations with little CRUD, or if you need a fully custom design system, AppShell's opinions will work against you. Use individual libraries instead.

## Opinionated UI, Not Headless

Frameworks like [Refine](https://refine.dev/) and [React Admin](https://marmelab.com/react-admin/) keep UI headless or pluggable to support any backend and any design. AppShell takes the opposite approach: it ships opinionated UI components — tables, forms, description cards, metric cards — that are designed for Tailor Platform ERP projects.

This tradeoff is viable because the scope is bounded. Tailor Platform projects agree upfront on what falls within standard UI and what requires custom implementation. AppShell optimizes for speed within that agreed boundary, rather than offering unbounded flexibility.

|                     | Refine / React Admin            | AppShell                                          |
| ------------------- | ------------------------------- | ------------------------------------------------- |
| **Backend**         | Any (data provider abstraction) | Tailor Platform                                   |
| **UI**              | Headless (bring your own)       | Opinionated (included)                            |
| **Navigation sync** | Routing only                    | Routing + sidebar + breadcrumbs + command palette |
| **Auth**            | Adapter-based (any IdP)         | Tailor Platform IdP direct                        |

## Vertical Integration as a Feature

AppShell is developed by the same team that builds Tailor Platform. This means:

- **Authentication evolves together.** When Tailor Platform changes its auth flow (e.g., adopting DPoP), AppShell ships the update. No waiting for a third-party adapter.
- **Breaking changes are coordinated.** Platform API changes and framework updates ship in lockstep, not as separate upgrade cycles.
- **Lock-in risk is scoped.** AppShell is already specific to Tailor Platform. The incremental lock-in from using it is minimal — you're not giving up backend portability you already don't have.

## Why a Framework, Not AI Skills

In an era of AI-assisted development, one might ask: why encode integration patterns in a framework when you could describe them in AI skill files or prompts?

The answer comes down to what guarantees correctness.

**Skills describe; frameworks enforce.** An AI skill can explain how to wire a sidebar entry to a route guard, but it cannot guarantee the wiring is correct. A framework, backed by TypeScript's type system, turns incorrect wiring into a compile-time error. The framework makes the _skill's job easier_ — the skill only needs to teach "how to use AppShell," not "how to implement the integration that AppShell already handles."

**Integration crosses context boundaries.** Correctly implementing guard → routing → sidebar → command palette synchronization requires understanding all four systems simultaneously. AI skills work best when scoped to a single concern. Splitting integration logic across multiple skills risks losing cross-cutting consistency. An integration skill comprehensive enough to cover all the interactions essentially becomes a natural-language restatement of the framework — harder to maintain and impossible to type-check.

**Conventions reduce AI decision points.** File-based routing + `appShellPageProps` means "where does this page go?" and "what do I declare?" always have exactly one answer. This determinism is what lets AI agents work reliably across multiple projects without per-project context tuning.

AppShell's position: encode integration correctness in code and types. Use AI skills to teach _how to use_ the framework, not to _replace_ it.
