# ActionPanel

A presentational card component that renders a title and a vertical list of actions. Each action is a row with an icon and label, triggered by `onClick` (button) or `href` (link). Designed for document-detail and sidebar layouts in ERP-style applications where the list of actions is often **backend-driven** and **status-dependent**.

---

## Table of contents

- [Overview](#overview)
- [Design decisions and rationale](#design-decisions-and-rationale)
- [API reference](#api-reference)
- [Usage](#usage)
- [Backend-driven actions (recommended pattern)](#backend-driven-actions-recommended-pattern)
- [Comparison with other patterns](#comparison-with-other-patterns)
- [Accessibility and behavior](#accessibility-and-behavior)
- [Layout and styling](#layout-and-styling)
- [Examples](#examples)

---

## Overview

**ActionPanel** is a presentational component with no internal business logic. It does not know about “documents,” APIs, or mutations. The parent is responsible for:

- Deciding **which** actions to show (e.g. from backend or from business logic).
- Deciding **what** each action does (via `onClick` or `href`).
- Setting **loading** and **disabled** state when executing async work.

This keeps the component simple, testable, and easy to use from both hand-written code and AI-generated code. It also fits the industry-standard pattern where the **backend** owns “which actions are available” and the **frontend** owns “how to render and execute” them.

---

## Design decisions and rationale

### 1. Presentational API (no document prop)

We chose a **flat list of items** (`ActionItem[]`) instead of a document-scoped API where the component receives a `document` and an array of “action definitions” that know how to execute with that document.

**Why:**

- **Simplicity:** The contract is “an array of { key, label, icon, onClick or href }.” No providers, no render props, no generic document type to thread through.
- **Flexibility:** The parent can close over the current document (or anything else) when building the list: `onClick: () => confirmOrder(doc)`.
- **Backend-driven:** When the API returns “available action keys,” the app can resolve them with a registry and pass a resolved list. The component does not need to know where the list came from.
- **AI-friendly:** Generating a list of items with `onClick`/`href` is straightforward; generating correct provider/render-props code is error-prone.

So: the component stays **presentational**; “document scope” and “which actions” live in the parent or in app-level conventions (e.g. a registry + hook).

### 2. Per-action loading state

We added an optional **`loading`** property to each `ActionItem` so that when the parent is performing an async operation (e.g. calling the backend), it can show a spinner in that row and make the row non-interactive.

**Why:**

- **Backend-driven flows:** User clicks “Confirm” → parent calls API → parent sets `loading: true` for that action → panel shows spinner and disables the row → on success/error, parent sets `loading: false`.
- **Clear feedback:** Users see which action is in progress without guessing.
- **No extra state in the component:** The component does not run mutations; it only reflects the loading state the parent passes in.

When `loading` is true:

- The icon slot shows a small inline spinner (same 16px size so layout does not shift).
- The row is non-clickable and uses the same disabled styling as `disabled`.
- For links (`href`), the row is rendered as a disabled button with `aria-busy` instead of an `<a>`, so the user cannot navigate while the action is in progress.

### 3. No secondary actions (split-button) in the first version

We did not add a “secondary action” (e.g. a small icon button beside the main action) to keep the API small and the implementation simple. If needed later, `ActionItem` can be extended with something like `secondaryAction?: { icon, onClick, title }` and the row layout updated.

### 4. Title aligned with icon, reduced padding

- **Title alignment:** The title uses the same left offset as the **start of the action row content** (the icon). So we use `pl-3` on the title to match the row’s `px-3`; with shared `px-4` on the card, the title and the first icon align.
- **Padding:** We use `px-4` (16px) for horizontal padding and `pt-6` / `pb-4` for vertical spacing so the panel is compact but readable. Gap between action rows is `0` so the list is dense.

---

## API reference

### ActionPanelProps

| Prop       | Type           | Required | Description                              |
| ---------- | -------------- | -------- | ---------------------------------------- |
| `title`    | `string`       | Yes      | Card title (e.g. "Actions")              |
| `actions`  | `ActionItem[]` | Yes      | List of actions to render                |
| `className`| `string`       | No       | Additional CSS classes for the card root |

### ActionItem

| Property   | Type            | Required | Description                                                                 |
| ---------- | --------------- | -------- | --------------------------------------------------------------------------- |
| `key`      | `string`        | Yes      | Unique key for React (and for stable identity when merging backend + extensions) |
| `label`    | `string`        | Yes      | Visible label                                                               |
| `icon`     | `ReactNode`     | Yes      | Icon; rendered in a 16px slot (e.g. `<ReceiptIcon />`)                       |
| `onClick`  | `() => void \| Promise<void>` | No | Called when the row is clicked (button only; ignored when `href` is set)   |
| `href`     | `string`        | No       | If set, the row renders as `<a href={href}>` for navigation                 |
| `disabled` | `boolean`       | No       | When true, row is non-interactive and styled as disabled                    |
| `loading`  | `boolean`       | No       | When true, row shows spinner in icon slot and is non-interactive            |

**Rules:**

- Use **either** `onClick` **or** `href` per action (not both in a meaningful way; `href` takes precedence when the row is not disabled/loading).
- When `loading` or `disabled` is true, the row is non-interactive and does not fire `onClick` or navigate via `href`.

---

## Usage

### Basic: static list with onClick and href

```tsx
import { ActionPanel } from "@tailor-platform/app-shell";

<ActionPanel
  title="Actions"
  actions={[
    {
      key: "create-invoice",
      label: "Create new sales invoice",
      icon: <ReceiptIcon />,
      onClick: () => openCreateInvoiceModal(),
    },
    {
      key: "view-docs",
      label: "View documentation",
      icon: <ExternalLinkIcon />,
      href: "/docs",
    },
  ]}
/>
```

### With loading (e.g. after user clicks)

The parent owns async behavior and sets `loading: true` for the action in progress.

```tsx
const [loadingKey, setLoadingKey] = useState<string | null>(null);

const handleConfirm = async () => {
  setLoadingKey("confirm");
  try {
    await confirmOrder(orderId);
  } finally {
    setLoadingKey(null);
  }
};

<ActionPanel
  title="Actions"
  actions={[
    {
      key: "confirm",
      label: "Confirm order",
      icon: <CheckIcon />,
      onClick: handleConfirm,
      loading: loadingKey === "confirm",
    },
  ]}
/>
```

### Empty state

When `actions.length === 0`, the panel shows a single line: “No actions available” (muted text). No need to handle that in the parent unless you want to hide the panel entirely.

---

## Backend-driven actions (recommended pattern)

In ERP apps, the list of actions often comes from the **backend** (or from business logic that depends on document type and status). The recommended pattern:

1. **Backend** returns the document (with status, etc.) and the **available action keys** (e.g. `["confirm", "cancel", "create_invoice"]`).
2. **Frontend** keeps a **registry:** `actionKey → { label, icon, execute(doc) }`.  
   - `execute(doc)` typically calls the platform API (e.g. `POST /documents/:id/actions/:actionKey`) or opens a flow (modal, new page).
3. **Page** (or a hook):
   - Fetches document + available actions.
   - Builds `ActionItem[]` by mapping each backend key to the registry entry and wiring `onClick: () => registry[key].execute(doc)`.
   - Tracks loading (e.g. per key) and passes `loading: actionKey === loadingKey` into the corresponding item.
4. **ActionPanel** receives the **resolved** list and stays presentational.

This way:

- The component does not need a “document” prop or knowledge of the backend.
- The same panel works for any entity (orders, invoices, etc.) as long as the parent builds the list from the registry.
- Extensions can add more entries to the registry and merge their keys with the backend’s list; the component just renders the merged list.

---

## Comparison with other patterns

### Provider-based / document-scoped actions (e.g. Omakase-style)

Some codebases use a pattern where:

- The component receives a `document` and a list of **action definitions** (each with an `ExecuteProvider` that runs a mutation and exposes `execute(document)` and `isLoading`).
- The component renders each action as a provider and a button that calls `execute(document)` and shows a spinner when loading.

**ActionPanel** does **not** use that pattern. Comparison:

| Aspect              | ActionPanel (this component)     | Provider-based (e.g. Omakase)        |
| ------------------- | --------------------------------- | ------------------------------------ |
| Document            | Parent closes over doc in onClick | Component receives `document` prop   |
| Execution           | Parent passes `onClick` / `href`  | Each action has `ExecuteProvider`   |
| Loading             | Parent sets `loading` on item     | Provider exposes `isLoading`        |
| Complexity          | Low (flat data)                   | Higher (providers, render props)     |
| Best for            | Any app; backend-driven lists     | Large apps with heavy encapsulation  |

For **Tailor Platform**, we chose the presentational + registry pattern so that:

- The **library** stays simple and easy to document.
- **Apps** can adopt a backend-driven + registry convention without the component needing to know about it.
- **AI agents** and new developers can use the component without learning a provider pattern.

---

## Accessibility and behavior

- **List structure:** The action list uses `role="list"` and each row wrapper uses `role="listitem"`.
- **Buttons and links:** Rows are either `<button type="button">` or `<a>` so they are focusable and keyboard-activatable. Focus visible ring is applied via Tailwind.
- **Loading:** When `loading` is true, the row is a disabled button with `aria-busy="true"`. The spinner in the icon slot is `aria-hidden` so the row’s `aria-busy` is the only loading announcement.
- **Disabled:** When `disabled` is true, the row has `aria-disabled="true"` and the button is `disabled` (or the link is not rendered; a disabled-style button is shown instead when there is an `href` and loading/disabled).
- **Data attributes:** Each row has `data-slot="action-panel-item"` and `data-key={key}` for testing and tooling.

---

## Layout and styling

- **Card:** Full width (`astw:w-full`), card background, rounded corners, border, subtle shadow. Override with `className` if needed.
- **Header:** Horizontal padding `px-4`; top padding `pt-6`; bottom padding `pb-2`; title has `mb-2` and `pl-3` so it aligns with the action row icon.
- **Action list:** Horizontal padding `px-4`; bottom padding `pb-4`; no gap between rows (`gap-0`).
- **Action row:** Each row has `px-3 py-2`, icon in a 16px slot, then label. Icon and label are separated by `gap-2`. When loading, the icon slot shows a 16px spinner so layout does not shift.
- **Spinner:** Inline SVG circle with `astw:animate-spin`; no separate Spinner component is exported. The spinner is an implementation detail of ActionPanel.

All styling uses Tailwind v4 with the `astw:` prefix so it works in the AppShell theme and does not require consumers to import extra CSS.

---

## Examples

### Inline example (with loading)

```tsx
<ActionPanel
  title="Actions"
  actions={[
    { key: "1", label: "Create invoice", icon: <ReceiptIcon />, onClick: () => openModal() },
    { key: "2", label: "View docs", icon: <DocIcon />, href: "/docs" },
    { key: "3", label: "Saving…", icon: <SaveIcon />, onClick: () => {}, loading: true },
  ]}
/>
```

### Live demo in this repo

- **Action Panel Demo page:** `examples/app-module` defines a dedicated “Action Panel Demo” resource that shows a simple list with `onClick` and `href`.
- **2-column layout:** The “2 Columns” layout page includes an ActionPanel in the second column with a **loading example:** “Create new sales invoice” sets `loading: true` for 1.5 seconds on click, then shows an alert. This demonstrates how to wire loading state from the parent.

Run the example app (e.g. `pnpm dev` from the repo root) and open the Custom Page → Action Panel Demo and Layout → 2 Columns to see the component in use.

---

## Summary

- **ActionPanel** is a presentational card that renders a title and a list of actions (icon + label).
- Each action is either a button (`onClick`) or a link (`href`). Optional `disabled` and `loading` per action.
- Designed for **backend-driven** lists: parent (or app convention) builds the list from API + registry and passes a resolved `ActionItem[]`.
- Keeps the library simple, scalable for ERP-style UIs, and easy to use for both developers and AI-generated code. For more detail on the public API, see the main [API docs](../../../../docs/api.md#actionpanel).
