---
name: app-shell-patterns
description: "Best-practice UI patterns and correct component usage for building pages in apps that use @tailor-platform/app-shell. Use when: building or editing any screen, page, list, table, detail view, form, modal, dialog, wizard, or bulk/confirm/toast interaction in an app with @tailor-platform/app-shell installed — or when choosing the right AppShell component, layout, or design token for a UI."
---

# App-Shell Patterns

## Purpose

Select and implement the correct UI pattern using @tailor-platform/app-shell components.

## Fundamental References

These are the foundational rules that underpin all patterns. All patterns build on top of these references.

{{FUNDAMENTAL_TABLE}}

## Available Patterns

{{PATTERNS_TABLE}}

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
