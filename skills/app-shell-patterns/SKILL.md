---
name: app-shell-patterns
description: UI pattern catalog for building pages with @tailor-platform/app-shell components
---

# App-Shell Patterns

## Purpose

Select and implement the correct UI pattern using @tailor-platform/app-shell components.

## Available Patterns

### pattern/detail

| Slug                               | Name                     | Description                                                           |
| ---------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| `pattern/detail/hero-with-actions` | Hero With Actions Detail | Single-record detail view with workflow actions and activity timeline |

### pattern/form

| Slug                       | Name             | Description                                                                       |
| -------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `pattern/form/modal`       | Modal Form       | Default form pattern for Create/Edit — keeps user in context on the parent screen |
| `pattern/form/sectioned`   | Sectioned Form   | Complex form with 15+ fields organized into named fieldset sections               |
| `pattern/form/single-page` | Single Page Form | Routed full-page form for moderate field count (6-15) without natural sectioning  |
| `pattern/form/wizard`      | Wizard Form      | Multi-stage create flow with 3-7 steps and per-step validation gates              |

### pattern/interaction

| Slug                               | Name         | Description                                                           |
| ---------------------------------- | ------------ | --------------------------------------------------------------------- |
| `pattern/interaction/confirm`      | Confirm      | Confirmation dialog before destructive or irreversible actions        |
| `pattern/interaction/multi-select` | Multi Select | Floating bottom action bar for bulk operations on selected list rows  |
| `pattern/interaction/toast`        | Toast        | Lightweight feedback after mutations — success or error notifications |

### pattern/list

| Slug                      | Name            | Description                                                                                             |
| ------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `pattern/list/dense-scan` | Dense Scan List | High-density scannable list backed by GraphQL connections with DataTable, sort, filters, and pagination |

## How to Use

1. Identify the user's intent (list, detail, form, interaction)
2. Match constraints to a pattern slug from the tables above
3. Read the pattern's detailed spec: `patterns/<slug>.md` (relative to this file)
4. Implement using ONLY the imports listed in the pattern's `requiredImports`

## Rules

- ALWAYS cite the pattern slug in a comment at the top of the file:
  `/* pattern: list/dense-scan */`
- NEVER mix patterns in a single page component
- ALWAYS use AppShell components — do NOT use raw HTML or third-party UI libraries
- If no pattern matches, compose directly from component documentation

## Component Reference

All components are imported from `@tailor-platform/app-shell`:

```tsx
import {
  DataTable,
  useDataTable,
  Button,
  Badge,
  Dialog,
  Form,
  Input,
} from "@tailor-platform/app-shell";
```
