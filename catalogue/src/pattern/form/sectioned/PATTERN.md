---
slug: pattern/form/sectioned
name: Sectioned Form
category: pattern
subcategory: form
description: Complex form with 15+ fields organized into named fieldset sections
requiredImports: [Layout, Card, Form, Fieldset, Field, Combobox, Button]
tags: [form, sections, fieldset, settings, complex]
do:
  - Form is complex with 15+ fields or multiple grouped sections (Identity, Pricing, Inventory)
  - Configure-style settings pages with named boundaries
dont:
  - Simple Create/Edit — use form/modal (the default)
  - Routed Create/Edit at moderate size with no grouping — use form/single-page
  - Step-gated validation across stages — use form/wizard
---

# pattern/form/sectioned

## When to Use

- Form is complex with 15+ fields or multiple grouped sections (Identity, Pricing, Inventory)
- Configure-style settings pages with named boundaries

## Page Implementation

<!-- source: sectioned-form.tsx -->

## Constraints

- Max ~6 sections — more than that is too hard to scan; promote to `form/wizard`
- Required-marker convention must be consistent across all sections
- One `Card.Root` per section, titled via `Card.Header title` + `description`; `Fieldset.Root`
  inside supplies the field grouping and the responsive grid
- Save/Cancel belong in `Layout.Header`, wired with `<Button type="submit" form="…">` matching the
  `Form`'s `id` (requires 1.13.0+)
- Section headings must match anchor-nav labels — derive both from one `SECTIONS` array so they
  cannot drift
- A single `<Form>` wraps every section — do not nest a `Form` per section

## Form state

Rules that apply to every `form/*` pattern are in **`components.md`** → Forms, with a worked example
in **`form/modal`** → Form state: `Form` + `Field` is the default stack, submit via `onFormSubmit`,
dropdowns need only a wrapping `Field.Root` (no `name`, no state), server errors route through
`errors`, and React Hook Form is an optional escape hatch.

At 15+ fields the temptation to reach for a form library is strongest, and it is usually wrong:
every field here — text, number, and dropdown alike — is uncontrolled and arrives through
`onFormSubmit`. The only per-field extra is `itemToStringValue` on dropdowns whose items are
objects rather than strings.

## Anti-patterns

- More than ~6 sections — hard to scan; promote to `form/wizard`
- Required-marker convention varies between sections — pick one rule and apply everywhere
- Section headings that don't match anchor-nav labels
- A separate `<Form>` per section — submit and validation then fragment across the page
- Mirroring field values into `useState` to "keep the payload together" — `onFormSubmit` already
  returns the whole payload
- Submitting an object-valued dropdown without `itemToStringValue` — the value arrives as JSON
