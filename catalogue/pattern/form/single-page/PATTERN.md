---
slug: pattern/form/single-page
name: Single Page Form
category: pattern
subcategory: form
description: Routed full-page form for moderate field count (6-15) without natural sectioning
requiredImports: [Layout, Form, Field, Fieldset, Input, Select, Button]
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

## Anti-patterns

- Two-column layout for unrelated fields — breaks the linear reading order
- No required-field markers — users can't predict which fields will error
- Errors shown above the form rather than below the offending field
- Choosing this pattern for a Create flow because it's a Create flow — without explicit need, use `form/modal`
