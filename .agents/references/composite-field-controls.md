# Composite Field Controls Review Criteria

Composite field controls are a default review surface when one user-facing field is implemented by composing multiple internal parts instead of a thin wrapper around a single Base UI primitive.

Review these changes as **field semantics and composite-control design**, not as ordinary input wrappers.

This usually includes controls backed by:

- segmented or multi-part visible UI
- hidden or proxy inputs for form submission and browser validity
- popup and typed-input combinations that must agree on one semantic value
- multiple input paths that must converge on one meaning
- `Field.Root` / `Form` integration that native inputs would get for free

This same review surface applies to any field-like control where AppShell is bridging one user-facing field across several internal pieces.

Thin Base UI wrappers are still the default. When AppShell introduces a field-like control that Base UI does not provide directly, review it against the same consumer contract and integration shape as nearby Base UI-backed controls. Internal complexity does not justify a parallel public API or weaker `Field.Root` / `Form` integration.

## Baseline checks

### Justify the extra complexity

Before accepting a new abstraction or bridge layer, ask whether the control really needs composite-field behavior. Thin Base UI wrappers are still the default; custom state machines, proxy inputs, or bridge layers need a concrete reason.

### Keep the public API aligned with the Base UI-backed control family

Even when internals are special, the public contract should still look like the rest of AppShell where possible. Use nearby Base UI-backed controls as the comparison baseline, especially `Select`, `Combobox`, `Autocomplete`, and normal `Field.Root` composition patterns.

Review for consistency around:

- `value`, `defaultValue`, `onValueChange` / `onChange`
- controlled vs uncontrolled ownership
- `disabled`, `readOnly`, `required`, `invalid`
- `id`, `name`, `aria-label`, `aria-labelledby`, `aria-describedby`
- `className`
- natural `Field.Root` composition

Be skeptical when a composite field control invents a parallel API unless the underlying semantics truly differ.

### One semantic value across all input paths

Check whether these paths still converge on the same meaning when they exist:

- typed input
- segmented editing
- keyboard shortcuts
- assisted selection UI
- programmatic value updates
- submitted form value / browser validity

A user should not get different results depending on which input path they used.

### Field/Form bridge correctness

Review whether the control still behaves like one field from the form system's perspective:

- label click focuses the usable control
- descriptions and errors stay attached
- proxy or hidden input value matches visible state
- invalid state reaches `Field.Error` / submit blocking correctly
- dirty / touched / focused transitions still make sense

### Empty and invalid semantics

Check whether the meaning stays clear for:

- empty vs unset vs partially edited
- invalid typed value vs valid-but-out-of-range value
- unavailable value vs range violation
- emitted value vs displayed text vs validation message

### Selection, bounds, and availability semantics

For controls with richer selection behavior, also review:

- bounds or range limits
- unavailable values or options
- focused item vs selected value
- free-entry behavior vs assisted-selection behavior

## Current AppShell examples

- `packages/core/src/components/field.tsx` defines the baseline `Field.Root` contract that all field-like controls should fit into.
- `packages/core/src/components/select.tsx`, `packages/core/src/components/combobox.tsx`, and `packages/core/src/components/autocomplete.tsx` show the simpler control-family contract that composite controls should still resemble from the outside.
- `packages/core/src/components/date-field/date-field.tsx` splits the problem into a11y labeling, proxy-input ownership, and `Field` / `Form` bridging.
- `packages/core/src/components/date-field/use-date-field-state.ts` owns the segmented editing state machine, shortcut handling, controlled/uncontrolled behavior, and invalid-reason semantics.
- `packages/core/src/components/date-field/date-input-group.tsx` renders the visible segmented `role="group"` UI and wires keyboard shortcuts plus popover opening.
- `packages/core/src/components/calendar/calendar.tsx` is the closed, standalone calendar surface that picker-style controls compose with.

## Expected evidence

Prefer focused interaction evidence for the risky paths: keyboard editing, `Field.Root` composition, invalid-state handling, assisted-selection synchronization, and submitted form behavior.

## Review questions

- Does the control still behave like one semantic field across every input path it exposes?
- Does the public API still match the surrounding control family instead of inventing a parallel contract?
- Do label, description, error, validity, and submitted value stay attached to the same field meaning?
- If the control supports both free entry and assisted selection, do those paths agree on the same value semantics?
