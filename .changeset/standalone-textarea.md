---
"@tailor-platform/app-shell": minor
---

Add standalone `Textarea` component

- New `Textarea` — a styled multi-line text control wrapping Base UI's field control rendered as a `<textarea>`. Integrates with `Field` and React Hook Form for label association, `aria-describedby`, `disabled`, and invalid/error state exactly like `Input`/`Checkbox` (no bespoke `error` prop), and works standalone outside a `Field.Root`. The invalid state is styled off both `data-invalid` (AppShell `Field.Root`) and `aria-invalid` (shadcn-style `FormControl`), so it fits either form stack.
- Unlike `Input`, it has no fixed height: `rows` sets the visible line count, `min-h-16` is the floor, and `resize-y` lets the user drag it taller. Previously the only multi-line route was `<Field.Control render={<textarea />} />`, which inherited the single-line `h-9` and clipped the box to 36px.
- Internal: `inputBaseClasses` now composes from a shared `controlBaseClasses` so `Input` and `Textarea` keep the same border/focus/placeholder treatment while owning their own height and padding. The emitted class list for `Input` and `Field.Control` is unchanged apart from ordering.
