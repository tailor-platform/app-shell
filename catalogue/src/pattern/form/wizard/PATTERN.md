---
slug: pattern/form/wizard
name: Wizard Form
category: pattern
subcategory: form
description: Multi-stage create flow with 3-7 steps and per-step validation gates
requiredImports: [Layout, Card, Badge, Form, Fieldset, Field, Select, Button]
tags: [form, wizard, multi-step, stepper, onboarding]
do:
  - Multi-stage Create with 3-7 steps
  - Onboarding and request flows where users should focus on one step at a time
  - Per-step validation gates progression
dont:
  - Single screen of fields — use form/modal or form/single-page
  - More than 7 steps — split into separate routed pages or reduce scope
  - CSV/spreadsheet import — use the CsvImporter component, not a hand-built wizard
---

# pattern/form/wizard

## When to Use

- Multi-stage Create with 3–7 steps
- Onboarding and request flows where users should focus on one step at a time
- Per-step validation gates progression

For CSV/spreadsheet import specifically, use the `CsvImporter` component — it already implements
the upload → map → validate → confirm flow. Don't rebuild it here.

## Page Implementation

<!-- source: wizard-form.tsx -->

## Constraints

- Max 7 steps — more than that causes user abandonment
- Back-navigation must preserve prior step's input
- Validation must be per-step — don't defer until final submit
- Step indicator collapses to "Step 2 of 4" label below 1024px
- One `<Form>` rendered per step, keyed by step index so it remounts cleanly
- Accumulated values live in a `draft` state object above the `Form`; each step's fields read
  their initial value from it via `defaultValue`

## Form state

Rules that apply to every `form/*` pattern are in **`components.md`** → Forms, with a worked example
in **`form/modal`** → Form state: `Form` + `Field` is the default stack, submit via `onFormSubmit`,
dropdowns need only a wrapping `Field.Root` (no `name`, no state), server errors route through
`errors`, and React Hook Form is an optional escape hatch.

The wizard's specific mechanic: **make "Next" a `type="submit"` button.** `onFormSubmit` fires only
after the current step's fields pass validation, so progression is gated natively — no manual
validity check, and no deferring errors to the final submit. The handler merges that step's values
into `draft` and advances; on the last step it calls the completion callback instead.

Because each step's `Form` unmounts on navigation, values must be lifted into `draft` — that is
what makes Back non-destructive. Every field, dropdowns included, is uncontrolled and re-reads its
prior value from `draft` via `defaultValue`; nothing needs an `onChange`.

## Anti-patterns

- More than 7 steps — users lose context and abandon
- No back-navigation preservation — pressing Back loses prior step's input
- Validation deferred until final submit — failures force full re-traversal
- A plain `onClick` "Next" that advances without validating — use `type="submit"` and let
  `onFormSubmit` gate it
- Wrapping all steps in one `<Form>` and hiding inactive ones — hidden required fields block submit
- Hand-building a CSV import wizard — use `CsvImporter`
