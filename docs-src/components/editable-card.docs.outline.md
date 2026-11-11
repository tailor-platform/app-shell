---
kind: code-backed
group: editable-card
title: EditableCard
description: Record card edited in place — fields keep their exact position between view and edit, with a save per card
sources:
  - packages/core/src/components/editable-card/**
---

# EditableCard

`EditableCard` shows part of a record as a card and lets the user edit it in place. View and edit are one card with one field list, so every field keeps its exact position when Edit is pressed — only its value turns into a control. Save submits only this card, so a page can hold several cards that are each saved on their own.

Use it on detail pages where users change a few values at a time. For a whole record, or a form with its own URL, use [`FormLayout`](./form-layout.md) in a page or dialog instead. For a card that is never edited, use [`DescriptionCard`](./description-card.md).

## Import

```tsx
import { EditableCard } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

`value` is how the field reads in view mode. The children are the control shown in edit mode. A field without children, or with `readOnly`, keeps its value in edit mode.

## Sub-components

| Sub-component        | Description                                                                   |
| -------------------- | ----------------------------------------------------------------------------- |
| `EditableCard`       | The card: title, Edit / Cancel / Save, and a `FormLayout` grid for the fields |
| `EditableCard.Field` | One field, drawn the same way in view and edit mode                           |

## Props

### EditableCard Props

| Prop              | Type                                        | Default | Description                                                                                                               |
| ----------------- | ------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `title`           | `ReactNode`                                 | -       | Card title. It stays on one line in both modes                                                                            |
| `columns`         | `1 \| 2 \| 3 \| 4`                          | `3`     | The most columns to show, as in `FormLayout`                                                                              |
| `editing`         | `boolean`                                   | -       | Edit mode (controlled)                                                                                                    |
| `defaultEditing`  | `boolean`                                   | `false` | Initial edit mode when uncontrolled                                                                                       |
| `onEditingChange` | `(editing: boolean) => void`                | -       | Called on Edit, Cancel, Escape, and after a successful save                                                               |
| `onSave`          | `(values: Values) => void \| Promise<void>` | -       | Called with the named fields' values once they pass validation. Return a promise to stay in edit mode until it resolves   |
| `onCancel`        | `() => void`                                | -       | Called when the user cancels editing, with Cancel or Escape                                                               |
| `errors`          | `Record<string, string \| string[]>`        | -       | Errors to show under fields, keyed by field `name` — as `errors` on `Form`. A field's error clears when the user edits it |
| `editDisabled`    | `boolean`                                   | `false` | Disables Edit — for example while another card on the page is being edited                                                |
| `className`       | `string`                                    | -       | Additional CSS classes                                                                                                    |
| `style`           | `CSSProperties`                             | -       | Inline styles                                                                                                             |

`Values` defaults to `Record<string, unknown>`. Pass the shape of the named fields as a type argument to type `onSave`: `<EditableCard<OrderValues> onSave={(values) => …}>`.

### EditableCard.Field Props

| Prop       | Type                                      | Default | Description                                                                                     |
| ---------- | ----------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `label`    | `string`                                  | -       | Field label, shown in both modes                                                                |
| `value`    | `ReactNode`                               | -       | How the value reads in view mode — text, a Badge, a link. `null`, `undefined` and `""` show "–" |
| `children` | `ReactNode`                               | -       | The control shown in edit mode. Leave it out for a field that is never editable                 |
| `name`     | `string`                                  | -       | The key of this field's value in `onSave`. Required when the field has `children`               |
| `span`     | `2 \| 3 \| "full"`                        | -       | Grid columns the field covers, as `span` on `Field.Root`                                        |
| `readOnly` | `{ kind?: ReadOnlyKind; reason: string }` | -       | Keeps the field read-only in edit mode, with a hint that gives the reason                       |
| `required` | `boolean`                                 | -       | Shows the required marker in edit mode. Put `required` on the control as well                   |

`EditableCard.Field` must be rendered inside an `EditableCard`; on its own it throws. To type the `readOnly` value separately, use `EditableCardFieldProps["readOnly"]`.

## Fields you can't edit

Read-only fields are never hidden, greyed out or turned into disabled inputs — any of those would move or restyle them. They keep their view rendering (a status badge stays a badge) and, in edit mode, show an icon after the label. Its tooltip gives `reason`; `kind` picks the icon:

| `kind`         | For                                                               | Icon       |
| -------------- | ----------------------------------------------------------------- | ---------- |
| `"system"`     | Status, document number, created by, last updated                 | Cog        |
| `"calculated"` | Due date, totals — keep the value updating while editing          | Calculator |
| `"locked"`     | Values frozen by the record's state (supplier after confirmation) | Lock       |
| `"permission"` | Values this user isn't allowed to change                          | Shield     |

Write the reason so it tells the user what to do: "Can't change after the order is confirmed. Cancel and re-create it instead."

## Saving

Save validates the fields first: a required field left empty, or any other invalid value, keeps the card in edit mode and shows the browser's message under the field, and `onSave` is not called.

`onSave` receives the values of the fields that have a `name`. If it returns a promise, Save and Cancel are disabled and the form is marked `aria-busy` until it settles; the card leaves edit mode when the promise resolves. When the promise rejects, or `onSave` throws, the card stays in edit mode with the user's changes so they can retry. The card logs the error to the console but doesn't show it: report it yourself. Pass errors for particular fields back through `errors` — each shows under its field, and focus moves to the first one — and show anything else in a toast.

<!-- example: server-errors -->

For a page of several cards, keep one card in edit mode at a time: control `editing` and set `editDisabled` on the others, so there is never more than one set of unsaved changes.

## Keyboard and focus

- Edit moves focus to the first control in the card.
- Escape cancels, as Cancel does, and `onCancel` is called. An Escape that a control handles itself — closing a Select, Combobox or DatePicker popup — only closes the popup.
- Cancel, Escape and a successful save return focus to the Edit button.
- When `editing` is changed from outside the card, focus is left where it is.

## Keeping fields in place

The card renders the same cell for each field in both modes: the same grid slot, a label row of fixed height and a value slot the height of a control (`Field.Value`). A few things are still yours to keep:

- Show every field in both modes. An empty value shows "–" rather than hiding the field.
- Put multi-line controls (a `Textarea`) last, with `span="full"`: they are taller than a value, so they grow their own row.
- Validation messages appear under a field and push the rows below it down. The card adds a `Field.Error` to each editable field, so don't add your own.
