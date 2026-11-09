# Decision: one stacking rule for floating UI

> Status: **Decided for steps 1 and 2, step 3 implemented. Step 1 (tailor-platform/app-shell#668): the Toaster portals to `body`, `--z-toast` (100) is added, the layout root is isolated, and two guard tests hold the rule. Step 2: the docs state the rule, the stacked-modal guideline and the three tokens; see [Decided on 2026-11-08](#decided-on-2026-11-08-step-2). Step 3 (tailor-platform/app-shell#689): the tokens are `--z-nav` (10), `--z-portal` (50) and `--z-toast` (100); `--z-sidebar`, `--z-popup` and `--z-overlay` are aliases until the next major (tailor-inc/platform-planning#2084), and `--z-sidebar-rail` is a value inside the sidebar.**
> Scope: the stacking order of dialogs, sheets, menus, selects, comboboxes, tooltips and toasts in `packages/core`; the `--z-*` tokens in `globals.css`. The toast position on narrow screens (step 4) is a later step.

## Context

Proposal: tailor-inc/platform-planning#2349. Bug: tailor-inc/platform-planning#2040.

`<Toaster />` was rendered next to the route outlet, inside the content column. The column's scroll container uses `mask-image` for the scroll fade, which creates a stacking context. Dialogs, sheets and popups all portal to the end of `body`, so a toast inside the column could never paint above their backdrop, whatever its z-index (Sonner sets `999999999`). Reproduced on `main` at `cc749d5` and `8cc5cb6` in the vite example: the toast was behind the Dialog backdrop and behind the Sheet in 5 of 5 runs each, at 1280 and 375, light and dark.

## Decision

### The rule

> Layers are ordered by how much they interrupt and how long they stay. Inside the band of layers you open and work in, the most recently opened layer is nearest to you.

| Layer       | Token                             | Value | Where it renders              |
| ----------- | --------------------------------- | ----- | ----------------------------- |
| Page        | —                                 | —     | the layout root               |
| Nav         | `--z-sidebar`, `--z-sidebar-rail` | 10/20 | the layout root               |
| Portal band | `--z-popup`, `--z-overlay`        | 50    | a portal at the end of `body` |
| Toast       | `--z-toast`                       | 100   | a portal at the end of `body` |

### The mechanism, not the values, defines the order

1. **One exit.** Every floating component renders through a portal to the end of `body`: Dialog, Sheet, Menu, Select, Combobox, Tooltip, the command palette (a Dialog), the sidebar flyout, and now the Toaster. Nothing floating stays inside the content column.
2. **Open order inside the band.** Popups and overlays share the value 50 on purpose. The order is the order of opening: a select opened inside a dialog is above the dialog because it was portaled later. A static value cannot express this.
3. **An isolated root.** The sidebar wrapper, the root shared by `SidebarLayout` and `GlobalHeaderLayout`, has `isolation: isolate`. A z-index set inside the page is ordered within the page and cannot reach the portal band. The tokens become a statement of intent, not a contract consumers must keep by hand.
4. **Guards.** `tests/floating-portal.test.tsx`: when open, the popup of each floating component is inside a portal that is a direct child of `body`, even when mounted under a stacking context. `tests/z-index-usage.test.ts`: a viewport-fixed element never uses a raw `z-*` utility, no raw value reaches 50, inline `zIndex` goes through `var(--z-*)`, and every token referenced is declared. Raw `z-10` and `z-20` stay allowed for local layering inside a component (a sticky table header, the timeline rails). `tests/browser/stacking.test.tsx` checks the result with `elementFromPoint`: Dialog on Dialog, Dialog on Sheet, a Menu inside a Dialog, each with a toast.

### The toast is the one layer that needs a value

The Toaster mounts once at startup, so it is earlier in `body` than any dialog opened later. `--z-toast` lifts it above the band.

The value is set as an inline style on Sonner's `[data-sonner-toaster]`, not as a `astw:z-(--z-toast)` class. Sonner injects its stylesheet at runtime without a cascade layer, and an unlayered rule wins over any rule in `@layer utilities` regardless of specificity. Measured in Chrome on 2026-11-01: a layered rule on the attribute or on a class left the computed z-index at `999999999`; an inline style gave `100`. The Portal components already set their z-index inline the same way.

### The Toaster renders after mount

`Toaster` creates the portal in an effect and renders nothing before. AppShell does not support server rendering, so there is no server-side test for this.

## What changes for consumers

- A toast is now visible above an open dialog or sheet. A toast fired from inside a dialog, for example "save failed", no longer disappears behind the backdrop.
- The Toaster element moves from the content column to the end of `body`. Styles that targeted it through the column's ancestors no longer match. The `theme` prop and the `--normal-*` variables are unchanged, and dark mode still applies because the `dark` class is on `<html>`.
- `isolation: isolate` on the layout root changes nothing inside AppShell. A consumer who relied on an in-page element with a high z-index covering a dialog will see the dialog on top instead. This is the intended behaviour.
- A consumer who places fixed UI outside the layout root above 100 covers toasts.

## Checked before deciding

- Clicking a toast does not close an open dialog or sheet: Base UI ignores presses on elements it did not mark as outside, and the Toaster carries `aria-live`, which `markOthers` skips. The browser test covers it.
- The Toaster does not get `aria-hidden` or `inert` while a modal is open, for the same reason. The browser test covers it.
- AppShell and Base UI 1.8.0 do not use the native `<dialog>` or the Popover API. If a later version adopts the top layer, z-index stops applying to those layers, because the top layer is ordered by insertion.

## Decided on 2026-11-08 (step 2)

Decided in tailor-inc/platform-planning#2349 (comment of 2026-11-08). Step 2 writes these into the docs (`docs-src/concepts/styling-theming`, `components/dialog`, `components/sheet`, `patterns/form-modal`). It changes no component.

### Stacked modals: two levels at most

- A second modal is for a confirmation or a warning only: a confirm before discarding changes, or a picker opened from a form modal (tailor-inc/platform-planning#786).
- `Escape` and an outside press close only the top modal. When the second modal closes, focus returns to the element that opened it.
- A screen that needs a third level uses a step inside the dialog instead.
- This is a docs guideline. The components do not enforce it.

Checked in Base UI 1.8.0 (`dialog/root/useDialogRoot`): `escapeKey` and the outside-press check are gated on `isTopmost`, which counts nested open dialogs through the React context of the parent `Dialog.Root`. The docs therefore say to render the second dialog inside the first one's content. `DialogPopup` passes `finalFocus` as `returnFocus`, so focus returns to the trigger or the previously focused element. Not verified in a browser test; the regression test in `tests/browser/stacking.test.tsx` checks only the paint order.

### Three tokens, named by layer

| Token        | Value | Use                                                       | Old names, kept as aliases |
| ------------ | ----- | --------------------------------------------------------- | -------------------------- |
| `--z-nav`    | 10    | persistent navigation that never blocks the page          | `--z-sidebar`              |
| `--z-portal` | 50    | everything rendered through a portal: popups and overlays | `--z-popup`, `--z-overlay` |
| `--z-toast`  | 100   | toast                                                     | —                          |

- One token for the portal band, because popups and overlays already share one value and the order inside the band comes from the open order. Two names suggest that one is above the other. If someone raises `overlay` above `popup`, a Select opened inside a Dialog goes behind the Dialog, the same failure as tailor-inc/platform-planning#1967. The difference between a popup and an overlay is a behaviour contract (an overlay blocks the page), and the docs table keeps that distinction.
- `--z-sidebar-rail` becomes a value inside the sidebar and leaves the docs table.
- A skip link needs no fourth token. It is in the nav layer.
- The aliases are removed in the next major (tailor-inc/platform-planning#2084).
- The rename landed as step 3 in tailor-platform/app-shell#689.

## Not in this step

- ~~Renaming the tokens to `--z-nav` / `--z-portal` with the old names kept as aliases (step 3 in #2349).~~ Done; see the status line.
- The toast's bottom inset on narrow screens, which must clear the bottom bar, the keyboard and the safe area (step 4, under tailor-inc/platform-planning#2207).
- A different value for `--z-toast`; 100 is the proposed value in #2349.

## Open questions

- While a modal is open, keyboard focus stays inside the modal. Whether a keyboard user can reach a toast's action button is not verified.
