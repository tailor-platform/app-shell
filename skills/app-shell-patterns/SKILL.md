---
name: app-shell-patterns
description: UI pattern catalog for building pages with @tailor-platform/app-shell components
---

# App-Shell Patterns

## Purpose

Select and implement the correct UI pattern using @tailor-platform/app-shell components.

## Available Patterns

### pattern/list

| Slug | Name | Description |
| ---- | ---- | ----------- |
| `pattern/list/dense-scan` | Dense Scan List | High-density scannable list for browsing large record sets |

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
