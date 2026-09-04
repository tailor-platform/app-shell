---
slug: pattern/form/modal
name: Modal Form
category: pattern
subcategory: form
description: Default form pattern for Create/Edit — keeps user in context on the parent screen
requiredImports: [Dialog, Button, Form, Field, Layout]
tags: [form, modal, dialog, create, edit, inline-add]
do:
  - Default for most Create and Edit forms — keeps user in context on parent screen
  - Inline add of a related entity from another screen (add address from order detail)
  - Quick configuration changes and single-purpose forms (rename, change status)
  - Any form the design hasn't explicitly called out as a full-page routed screen
dont:
  - Design explicitly calls for a full-page (non-overlay) routed Create or Edit
  - Form is complex with 15+ fields or multiple grouped sections — use form/sectioned
  - Multi-stage flow with per-step validation — use form/wizard
---

# pattern/form/modal

## When to Use

- Default for most Create and Edit forms — keeps user in context on parent screen
- Inline add of a related entity from another screen (add address from order detail)
- Quick configuration changes and single-purpose forms (rename, change status)
- Any form the design hasn't explicitly called out as a full-page routed screen

## Page Implementation

<!-- source: modal-form.tsx -->

## Route-driven Variant

<!-- source: modal-form-routed.tsx -->

## Constraints

- Dialog renders full-screen sheet below 1024px; centered max-w-md at 1024–1280px
- Route-driven variant requires both parent path and create/edit path to render the same component
- `onOpenChange` must navigate back — just calling `setOpen(false)` leaves the URL broken
- Use `<Form onFormSubmit>`, never a bare `<form onSubmit>` — see **Form state** below
- Cancel must be `type="button"`; inside a `<Form>` an untyped `<button>` defaults to `submit`

## Form state

Applies to every `form/*` pattern. Full detail in **`components.md`** → Forms.

`form/composer` follows all of this too, with one documented exception noted below: its body is
controlled, because a composer reads the value during render to gate its submit and swap its
placeholder.

- **`Form` + `Field` is the default stack.** They wrap Base UI and ship with AppShell — no extra
  dependency.
- **Submit via `onFormSubmit(values)`.** It fires only after validation passes. Do not hand-roll
  `<form onSubmit>` + `new FormData(...)` — that skips validation and server-error routing.
- **`onFormSubmit` reads registered `Field.Root`s, not the DOM.** So every control — including
  `Select`, `Combobox`, and `Autocomplete` — just needs wrapping in a `Field.Root name="…"`. They
  need **no `name` of their own and no `useState`**. Mirroring field values into React state is the
  most common thing to get wrong here. The exception is a value the component must read _during
  render_ — a submit gate, a dependent placeholder, a live character count. That state is
  load-bearing, not mirrored; see `form/composer`.
- **`Field.Control` is already a styled input.** Write `<Field.Control />`, not
  `<Field.Control render={<Input />} />`.
- **Object items need `itemToStringValue`.** Items shaped `{ value, label }` submit `value`
  automatically; any other object submits as a JSON string unless you supply it.
- **Server errors go through `Form`'s `errors` prop**, keyed by field `name` — not a toast or a
  banner. They clear when the user edits the field.
- **React Hook Form is optional**, consumer-installed, and only warranted for cross-field
  validation, field arrays, or a Zod resolver. It composes with `Field`: drive the control from a
  `Controller` and spread `fieldState` onto `Field.Root`.

## Anti-patterns

- Nesting modals — opening a Dialog from inside another Dialog
- Modal containing a wizard — promote to a routed `form/wizard`
- Save closes the dialog but parent state is stale — wire refetch or optimistic update
- Building a routed Create/Edit page when the design didn't explicitly call for one — modal is the default
- Registering the create path as a separate top-level route — that unmounts the parent list
- Reaching for React Hook Form on a form this size — `onFormSubmit` already covers it
- Holding a `Select`/`Combobox` value in `useState` just to submit it — `Field.Root` already does
- Surfacing API validation failures in a toast or banner instead of routing them via `errors`
