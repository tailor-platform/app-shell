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

### Colour contrast

- Text needs 4.5:1 against its background. Non-text UI that people need to see, such as input borders, focus rings and meaningful icons, needs 3:1 (WCAG 1.4.3 and 1.4.11).
- Use the semantic colour roles: `{intent}-text` on `{intent}-surface`, and `{intent}-contrast` on `{intent}-solid`. `packages/core/tests/browser/semantic-contrast.test.ts` checks these pairs. A new pair outside them is not checked.
- Do not show a state by colour alone. Add text or an icon.
- The styling guide (`docs/concepts/styling-theming.md`) lists the known exceptions next to the thresholds.

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
- Does new text or a new colour pair meet 4.5:1 for text and 3:1 for non-text UI?
- Do wrapper or layout changes silently break focus, state, or announced meaning?
