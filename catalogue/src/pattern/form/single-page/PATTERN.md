---
slug: pattern/form/single-page
name: Single Page Form
category: pattern
subcategory: form
description: Routed full-page form for moderate field count (6-15) without natural sectioning
requiredImports: [Layout, Form, Field, Textarea, Select, Button]
tags: [form, page, create, edit, routed]
do:
  - A routed Create or Edit page that the design has explicitly called out (e.g. /orders/create)
  - Moderate field count (roughly 6-15) without natural sectioning, completed in one pass
dont:
  - Default Create/Edit with no explicit routing requirement — use form/modal (the default)
  - 15+ fields or grouped concerns — use form/sectioned
  - Multi-stage flow — use form/wizard
---

# pattern/form/single-page

## When to Use

- A routed Create or Edit page that the design has explicitly called out
- Moderate field count (roughly 6–15) without natural sectioning, completed in one pass

## Page Implementation

<!-- source: single-page-form.tsx -->

## Constraints

- Single column full width below 1024px; single column max-w constrained at 1024–1280px
- Without an explicit routed-page requirement, the answer is `form/modal`
- A `/create` or `/edit` route in the screen spec does NOT require a full-page replacement
- Save/Cancel belong in `Layout.Header`, wired with `<Button type="submit" form="…">` matching the
  `Form`'s `id` (requires 1.13.0+)
- Validation lives on the fields (`required`, `pattern`, `min`, `type`) with a matching
  `Field.Error match="…"`; `Form` gates submit on it

## Form state

Rules that apply to every `form/*` pattern are in **`components.md`** → Forms, with a worked example
in **`form/modal`** → Form state: `Form` + `Field` is the default stack, submit via `onFormSubmit`,
dropdowns need only a wrapping `Field.Root` (no `name`, no state), server errors route through
`errors`, and React Hook Form is an optional escape hatch.

This pattern is the reference for the simple case: every field, dropdowns included, is
uncontrolled and arrives through `onFormSubmit`. No component state at all.

## Anti-patterns

- Two-column layout for unrelated fields — breaks the linear reading order
- No required-field markers — users can't predict which fields will error
- Errors shown above the form rather than below the offending field
- Choosing this pattern for a Create flow because it's a Create flow — without explicit need, use `form/modal`
- Making fields controlled "for consistency" — nothing on this page needs React state
- Giving `Select` a `name` to make it submit — inside a `Field.Root` that is already handled
