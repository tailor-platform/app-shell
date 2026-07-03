---
name: app-shell-patterns
description: UI pattern catalog for building pages with @tailor-platform/app-shell components
---

# App-Shell Patterns

## Purpose

Select and implement the correct UI pattern using @tailor-platform/app-shell components.

## Fundamental References

These are the foundational rules that underpin all patterns. All patterns build on top of these references.

| File                                                        | Description             |
| ----------------------------------------------------------- | ----------------------- |
| [components.md](references/fundamental/components.md)       | components reference    |
| [design-system.md](references/fundamental/design-system.md) | design-system reference |
| [graphql.md](references/fundamental/graphql.md)             | graphql reference       |

## Available Patterns

### detail

| Slug                                                                          | Name                     | Description                                                           |
| ----------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| [`detail/hero-with-actions`](references/patterns/detail-hero-with-actions.md) | Hero With Actions Detail | Single-record detail view with workflow actions and activity timeline |

### form

| Slug                                                          | Name             | Description                                                                       |
| ------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| [`form/modal`](references/patterns/form-modal.md)             | Modal Form       | Default form pattern for Create/Edit — keeps user in context on the parent screen |
| [`form/sectioned`](references/patterns/form-sectioned.md)     | Sectioned Form   | Complex form with 15+ fields organized into named fieldset sections               |
| [`form/single-page`](references/patterns/form-single-page.md) | Single Page Form | Routed full-page form for moderate field count (6-15) without natural sectioning  |
| [`form/wizard`](references/patterns/form-wizard.md)           | Wizard Form      | Multi-stage create flow with 3-7 steps and per-step validation gates              |

### interaction

| Slug                                                                          | Name         | Description                                                           |
| ----------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| [`interaction/confirm`](references/patterns/interaction-confirm.md)           | Confirm      | Confirmation dialog before destructive or irreversible actions        |
| [`interaction/multi-select`](references/patterns/interaction-multi-select.md) | Multi Select | Floating bottom action bar for bulk operations on selected list rows  |
| [`interaction/toast`](references/patterns/interaction-toast.md)               | Toast        | Lightweight feedback after mutations — success or error notifications |

### list

| Slug                                                        | Name            | Description                                                                                             |
| ----------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| [`list/dense-scan`](references/patterns/list-dense-scan.md) | Dense Scan List | High-density scannable list backed by GraphQL connections with DataTable, sort, filters, and pagination |

## How to Use

1. Identify the user's intent (list, detail, form, interaction, screen composition, recipe)
2. Match constraints to an entry slug from the tables above
3. Read the entry's detailed spec: `references/<category>/<slug>.md` (relative to this file)
4. Read fundamental references for component APIs, design tokens, and GraphQL conventions: `references/fundamental/`
5. Implement using ONLY the imports listed in the entry's `requiredImports`

## Rules

- ALWAYS cite the entry slug in a comment at the top of the file:
  `/* pattern: list/dense-scan */`
- NEVER mix patterns in a single page component
- ALWAYS use AppShell components — do NOT use raw HTML or third-party UI libraries
- If no entry matches, compose directly from fundamental references

### Cross-cutting UX rules (apply to every screen)

Full rationale in [`design-system.md`](references/fundamental/design-system.md) → Composition & emphasis rules.

- **One primary action per view:** at most one primary/filled `Button`; everything else is `outline`/`secondary`/`ghost`.
- **Status badges by semantic color:** a **filled** semantic variant for the record's primary/lifecycle status, **`outline-*`** for secondary statuses, **`subtle-*`** for tags; reserve brand `default` for non-status emphasis.
- **No duplicate actions:** an action lives in exactly one place — never repeat the same action in both `Layout.Header` and `ActionPanel`.
- **Action placement:** primary CTA + status in `Layout.Header`; workflow actions in `ActionPanel`; back/navigation in the breadcrumb — never in `ActionPanel`.
- **Metric tiles always go in a `Grid`** (`columns={{ initial: 1, md: 2, xl: 4 }}`) — never one-per-row.
- **Forms default to `form/modal`** — only build a routed full-page form when the design explicitly calls for one.
- **Handle every state:** loading (skeleton), empty (labelled empty state), and error (inline + retry) — never ship only the happy path.
