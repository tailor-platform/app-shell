---
"@tailor-platform/app-shell": minor
---

Add standalone `Checkbox` component

- New `Checkbox` — a styled boolean control wrapping Base UI's checkbox. Supports controlled (`checked`) and uncontrolled (`defaultChecked`) use, an `indeterminate` state, and an optional inline `label`. Integrates with `Field` and React Hook Form for label association, `disabled`, and invalid/error state exactly like `Input`/`Select` (no bespoke `error` prop) — drive it via `Controller` with `onCheckedChange`/`inputRef`. The invalid state is styled off both `data-invalid` (AppShell `Field.Root`) and `aria-invalid` (shadcn-style `FormControl`), so it fits either form stack.
- DataTable now uses `Checkbox` internally for row selection, the header select-all (indeterminate), the enum and case-sensitive filter controls, and the column-settings visibility toggles — replacing the previously hand-rolled, slightly inconsistent checkbox styling with one shared control.
