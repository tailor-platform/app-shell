# Accessibility Review Criteria

Accessibility is a default review surface for any interactive change.

## Baseline checks

### Semantics

- Prefer the correct native element before adding ARIA to a generic element.
- Do not replace a `button`, `input`, or `label` with a `div` unless there is a very strong reason.
- Table, dialog, listbox, combobox, and checkbox-like UI should preserve their expected semantics.

### Keyboard

- Controls should support expected keyboard interaction for their role.
- Overlay UI should handle focus entry, traversal, dismissal, and return.
- Reordering, selection, and sort interactions should not depend on pointer-only access.

### Accessible naming

- Every interactive control needs an accessible name.
- Icon-only controls need `aria-label` or an equivalent labeling path.
- Labels, descriptions, and error messages should stay connected when wrapping or composing controls.

### Announced state

Review whether state remains understandable through attributes such as:

- `aria-expanded`
- `aria-selected`
- `aria-invalid`
- `aria-disabled`
- `aria-busy`

### Complex widgets

For table/grid-like UI, check:

- header meaning
- sort state
- selection meaning
- whether sticky/pinned rendering preserves the same user meaning

## Review questions

- Does the interactive element have the correct semantics?
- Can the interaction be completed without pointer-only access?
- Does an icon-only control still have an accessible name?
- Do wrapper or layout changes silently break focus, state, or announced meaning?
