# Decision: inline cell editing in DataTable

> Status: **Open — for team input.** Every column type is implemented in this PR (text, number, money, link, dropdowns via `edit.options`, badge dropdowns and dates), so the proposal can be tried in the vite example (`/showcase/data-table-lab`) while the questions below are settled.
>
> Context: [platform-planning#1750](https://github.com/tailor-inc/platform-planning/issues/1750) (the UI Catalogue inline-edit pattern, left with @itsprade), the Larson IMS request in Slack (`#prj-larson-ims`), and [platform-planning#1428](https://github.com/tailor-inc/platform-planning/issues/1428). Related: [platform-planning#1115](https://github.com/tailor-inc/platform-planning/issues/1115) (optimistic rows) and [platform-planning#1161](https://github.com/tailor-inc/platform-planning/issues/1161) (LineItems).
>
> Scope: editing values in rows a DataTable already shows. Adding, removing or reordering rows is out of scope; that's document line items (#1161).

## Problem

Two teams have asked for the same thing:

- **Larson IMS (Slack).** They're moving about a dozen AG-Grid tables to `DataTable`. Regular lists already work, including filtering, sorting, pagination and row actions. The blocked tables are the ones where people fill in quantities: purchase orders, invoices, receipts, credit notes and stock adjustments. They need two things:
  1. **Typing into a cell, with basic rules**, such as whole numbers only, no negatives, or at most 2 decimal places.
  2. **Some rows editable and others not**, decided by their own logic. For example, a row becomes editable once it's selected, or only while it meets a condition.
- **Opportunity tracker ([#1428](https://github.com/tailor-inc/platform-planning/issues/1428)).** They hand-built popover + save + refetch cells for text, enum and decimal values. They're asking for one standard version, so every app looks and saves the same way.

Today DataTable only displays data. An app that needs editing draws its own inputs in `render`. That loses DataTable's typed formatting and fights with its row click, cell context menu and truncation.

## What exists today

- **DataTable is display-only.** Rows belong to the screen: DataTable renders `data.rows` as given and leaves sorting, filtering and paging to `CollectionControl`. There is no notion of cell focus or keyboard movement.
- **UI Catalogue pattern: "DataTable inline cell edit"** ([ui.tailor.tech](https://ui.tailor.tech/patterns/datatable-inline-edit), [#1750](https://github.com/tailor-inc/platform-planning/issues/1750)). It's built on DataTable `render`:
  - Underlined values open a small popover with the input and Cancel / Save.
  - Status is a badge plus a chevron menu; picking an option applies it immediately and shows a toast.
  - A "Confirmed" flag commits through a checkbox.
  - Its guidance: it suits a few edits on small lists. Use a Sheet or form for cross-field checks or large row counts.
- **The `list-dense-scan` pattern rules it out.** `docs-src/patterns/list-dense-scan.docs.outline.md` lines 32 and 89 say: "Inline editable cells — use pattern/detail or pattern/form/modal instead".
- **LineItems** ([#1161](https://github.com/tailor-inc/platform-planning/issues/1161), unmerged app-shell#238) is a document-line editor. It has cell editors but no validation rules, no per-row control, and no filtering or paging. That makes it a reference, not the base for list tables.
- **[#1115](https://github.com/tailor-inc/platform-planning/issues/1115)**: DataTable manages rendering state, and saving with optimistic updates and rollback belongs in a separate `useOptimisticRows` hook. The mutation callbacks were removed from `useDataTable` in app-shell#130.
- **`CsvImporter`**'s review grid, with `onCellEdit(row, columnKey, value)`, is the only inline editing in the package today.

## Proposal

Build inline editing into DataTable and configure it per column.

1. **Type straight into a cell.** Click or Tab into an editable cell and type. There's no popover and no form. This is where the proposal differs from the catalogue pattern (see [Alternatives](#alternatives-considered)).
2. **Show what's editable — spreadsheet-style.**
   - Editable cells look like the rest of the table: no input boxes, and the whole cell is the click target.
   - The cursor tells cells apart: a text cursor for typing cells, a pointer for dropdown and date cells, and "not allowed" for cells that can't be edited.
   - The cell being edited outlines its edges; dropdown and date icons appear on hover and focus, in a space kept free at the right edge so they never cover the value.
   - Row height and column width don't shift when a row becomes editable.
3. **Block impossible input as it's typed.**
   - With "no negatives" there's no minus sign. With "whole numbers" there's no decimal point. With "2 decimals" there's no third decimal digit.
   - Pasted text is cleaned up (thousands separators, full-width digits) and then checked. It is never silently rounded.
4. **Explain the other rules.**
   - A required value, a maximum, or the screen's own rule ("can't receive more than ordered") turns the cell red, with a tooltip saying why.
   - Enter and Tab won't save until it's fixed, and Esc puts the old value back.
   - Leaving the cell while it's still invalid reverts it.
5. **Let the screen decide which rows are editable.** The per-row check also knows whether the row is selected, so "editable once ticked" and "only while Draft" are one line each.
6. **Make keyboard data entry fast.**
   - Enter saves and moves down to the same column.
   - Tab saves and moves to the next editable cell, skipping read-only ones.
   - Esc undoes.
   - Japanese IME input is respected: pressing Enter to confirm a conversion doesn't save.
7. **Autosave on leave.**
   - A value saves when the user leaves the cell or presses Enter or Tab, and only if it actually changed: going from `10` to `10.00` is not a change.
   - There is no saving indicator.
   - If the screen's save fails, the cell goes back to the old value, and the screen can show its own toast.
   - Screens that hold edits for a Save button work the same way; their save just never fails.
8. **Leave everything else alone.** Filtering, sorting, paging, selection, row actions, pinned columns and column settings keep working. Existing tables don't change unless a column opts in.

### Every column type

| Column type      | How it's edited                                              | What the screen receives                                          |
| ---------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| `text`           | Type in the cell                                             | Text, or `null` when emptied                                      |
| `number`         | Type in the cell, with the rules above                       | A number, or `null`                                               |
| `money`          | Same as number; decimals follow the currency (USD 2, JPY 0)  | A number, or `null`                                               |
| `date`           | Pick from a calendar or type; date-time columns add the time | `"YYYY-MM-DD"`, a UTC ISO string for date-time columns, or `null` |
| `badge` (status) | Pick from a list, either one value or several                | The value (or list of values), or `null`                          |
| `link`           | Edit the text; it shows as plain text while editable         | Text, or `null`                                                   |

## API sketch

This follows the shapes DataTable already has:

- **`edit` sits on the column next to `type` / `typeOptions`** and narrows by `type`, like `typeOptions` and `accessor` do today (`packages/core/src/components/data-table/types.ts`). That means the value handed to `onCommit` has the right type for each column type.
- **`canEdit(row, { selected })`** mirrors `rowExpansion.canExpand(row)` and `RowAction.isDisabled(row)`.
- **Nothing changes in the `useDataTable` options or `DataTableContextValue`.**

```tsx
const { column } = createColumnHelper<ReceiptLine>();

column({
  id: "received",
  label: "Received",
  type: "number",
  edit: {
    canEdit: (row, { selected }) => selected && row.status === "open",
    min: 0,
    maxDecimals: 0, // whole numbers only
    required: true,
    validate: (value, row) =>
      value !== null && value > row.ordered ? `Can't exceed ordered (${row.ordered})` : undefined,
    // May return a promise; if it rejects, the cell reverts.
    onCommit: (row, value) => saveReceivedQty(row.id, value),
  },
});
```

- **The table never stores edits.** It calls `onCommit`, and the screen updates `data`: a local draft for a Save-button screen, or a mutation for autosave. While an `onCommit` promise is pending, the cell keeps showing the new value; if the promise rejects, the cell reverts. Richer optimistic behaviour stays with `useOptimisticRows` (#1115).
- **Rules by type:**
  - `text` / `link`: `required` and `validate` only.
  - `number` / `money`: `min`, `max` and `maxDecimals`. `maxDecimals` defaults to what the column displays; for money, the currency's decimals.
  - `date`: `min` and `max`.
  - `badge`: `options` (defaults to the column's enum filter options) and `multiple`.
- **Built from existing components:** `Input`, `DatePicker`, `Select`, `Tooltip` and `Badge`. There are no new dependencies. Rows need an `id` to be editable.

## Scope contract

- **Required behaviour:** Larson IMS's received-quantity column works on a paginated, filtered DataTable. It must be integer, ≥ 0 and ≤ ordered, editable only when the row is selected, entered row by row with Enter, and autosaved with a revert on failure.
- **Compatibility:**
  - No change to existing tables, the `useDataTable` options or the context. `edit` is optional on every column.
  - One display fix comes with it: a number column shows as many decimals as its editor allows. Today an unconfigured number column rounds to whole numbers, so a typed 2.5 would render as "3".
- **Intentionally unsupported in v1:**
  - yes/no flags (there's no boolean column type)
  - a bring-your-own editor for custom `render` columns
  - copying and pasting across several cells, fill-down, and undo
  - moving between cells with the arrow keys
  - a "changed" marker
  - a saving indicator
  - comma decimal separators (`1,5`)
  - adding or removing rows
- **Validation plan:**
  - Unit tests for parsing and rules.
  - Interaction tests for each column type: commit, revert, blocked keys, keyboard flow, per-row control and no-op saves.
  - Type tests for the value each column type receives.
  - A goods-receipt demo in the vite example, checked in the browser, including that row height stays fixed.

## Alternatives considered

- **Keep it a pattern (#1750 as it is).** No package change, but every app rebuilds the rules, per-row checks and keyboard flow, which is the per-app drift #1428 describes.
- **Popover editing, like the catalogue pattern.** This matches the existing pattern and suits occasional changes. But a click and a Save for every cell is too slow for filling in quantities down a column, which is what Larson IMS needs.
- **DataTable holds the drafts** (dirty tracking, "get changes"). This goes against #1115's direction that DataTable only renders. The screen already owns the rows.
- **Build on LineItems.** It's unmerged, it has no validation or per-row control, and it has no filtering or paging.

## Delivery

- **PR 1, which unblocks Larson IMS:**
  - text, number, money and link editing
  - rules and errors
  - per-row control
  - keyboard entry
  - autosave and revert
  - docs (`docs-src/components/data-table.docs.outline.md`)
  - pattern updates: rewrite `list-dense-scan`, and move the #1750 inline-edit pattern into `docs-src/patterns/`
  - a vite example
  - a `minor` changeset
- **PR 2 (folded in):** date and badge editing, plus dropdowns for `text` / `link` columns via `edit.options`, with the matching docs and example additions — built in the same PR so every column type can be reviewed together.

## For the call

- **Naming.** `edit` / `canEdit` / `onCommit`, or Base UI's `onValueCommitted` wording?
- **Leaving an invalid cell reverts it.** This is AG-Grid's default, and it means the data never disagrees with the screen, but the typed value is lost. Keep it? The other option is keeping the red value until it's fixed, and giving screens a way to ask "any invalid cells?" before Save.
- **Enter moves down** to the same column, spreadsheet-style, instead of staying put. OK?
- **One PR.** Date and badge editing were planned as a follow-up but are folded in, so every column type is reviewed together. OK, or split them back out?
- **#1115.** Ship the simple pending/revert behaviour with PR 1 and let `useOptimisticRows` build on it later, or wait for #1115?
- **Catalogue pattern.** Move #1750 into `docs-src/patterns/`, rewritten around the built-in feature, and retire the popover version?
- **Bring-your-own editor** (for flags, product search and similar): leave it out until a team asks?
- **Out of scope here.** The two open notes in `docs-src/pages/document-detail.docs.outline.md`, "a shared line-items component" and "in-place editing versus an edit route", stay open. This proposal covers list tables only.
