# Complex Form Controls Review Criteria

Review these changes as **composite control design**, not as ordinary input wrappers.

## Why this area exists in AppShell

Some AppShell controls cannot be thin Base UI wrappers because one user-visible field is backed by multiple moving parts:

- segmented or multi-part visible UI
- hidden proxy inputs for form submission and browser validity
- multiple input paths that must converge on one semantic value
- `Field.Root` / `Form` integration that native inputs would get for free

This is why `DateField` / `DatePicker` / `Calendar` work is riskier than a normal `Input`, `Select`, or `Checkbox` change.

## Current AppShell examples

- `packages/core/src/components/date-field/date-field.tsx` splits the problem into a11y labeling, proxy-input ownership, and `Field` / `Form` bridging.
- `packages/core/src/components/date-field/use-date-field-state.ts` owns the segmented editing state machine, shortcut handling, controlled/uncontrolled behavior, and invalid-reason semantics.
- `packages/core/src/components/date-field/date-input-group.tsx` renders the visible segmented `role="group"` UI and wires keyboard shortcuts plus popover opening.
- `packages/core/src/components/field.tsx` defines the baseline `Field.Root` contract that Base UI-backed controls are expected to fit into.
- `packages/core/src/components/select.tsx`, `packages/core/src/components/combobox.tsx`, and `packages/core/src/components/autocomplete.tsx` show the simpler control-family contract that complex controls should still resemble from the outside.
- `packages/core/src/components/calendar/calendar.tsx` is the closed, standalone calendar surface that picker-style controls compose with.

## Area-exclusive review checks

### Justify the extra complexity

Before accepting a new abstraction or bridge layer, ask whether the control really needs composite-control behavior. Thin Base UI wrappers are still the default; custom state machines and proxy inputs need a concrete reason.

### Keep the public API aligned with the control family

Even when internals are special, the public contract should still look like the rest of AppShell where possible. Review for consistency around:

- `value`, `defaultValue`, `onValueChange` / `onChange`
- controlled vs uncontrolled ownership
- `disabled`, `readOnly`, `required`, `invalid`
- `id`, `aria-label`, `aria-labelledby`, `aria-describedby`
- `className`
- natural `Field.Root` composition

Be skeptical when a complex control invents a parallel API unless the underlying semantics truly differ.

### One semantic value across all input paths

Check whether these paths still converge on the same meaning:

- typed input
- segmented editing
- keyboard shortcuts
- calendar selection
- programmatic value updates
- submitted form value / browser validity

A user should not get different results depending on which input path they used.

### Field/Form bridge correctness

Review whether the control still behaves like one field from the form system's perspective:

- label click focuses the usable control
- descriptions and errors stay attached
- proxy input value matches visible state
- invalid state reaches `Field.Error` / submit blocking correctly
- dirty / touched / focused transitions still make sense

### Empty and invalid semantics

Check whether the meaning stays clear for:

- empty vs unset vs partially edited
- invalid typed value vs valid-but-out-of-range value
- unavailable date/value vs range violation
- emitted value vs displayed text vs validation message

### Date/calendar-specific semantics

For date-like controls, also review:

- locale-driven segment ordering
- timezone handling
- min/max bounds
- unavailable dates
- focused date vs selected date
- free-entry behavior vs calendar clamping/selection behavior

## Expected evidence

Prefer focused interaction evidence for the risky paths: keyboard editing, `Field.Root` composition, invalid-state handling, and calendar/picker synchronization.

## Pair with

- `../cross-cutting/component-design.md`
- `../cross-cutting/accessibility.md`
- `../cross-cutting/react.md`
