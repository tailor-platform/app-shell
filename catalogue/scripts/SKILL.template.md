---
name: app-shell-patterns
description: UI pattern catalog for building pages with @tailor-platform/app-shell components
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
