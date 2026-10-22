---
kind: code-backed
group: item-list
title: ItemList
description: Compact icon-and-label lists for consistent navigation inside and outside the Sidebar
sources:
  - packages/core/src/components/item-list/**
---

# ItemList

`ItemList` presents compact icon-and-label rows for navigation and actions. Use it for in-content navigation, tables of contents, or other lists that should share the Sidebar's list presentation without depending on its layout or providers.

It does not require `AppShell`, a router, or a Sidebar provider. Resource metadata, translations, permissions, and active-route matching remain the caller's responsibility.

## Import

```tsx
import { ItemList } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

## Sub-components

| Sub-component        | Description                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| `ItemList.Root`      | A semantic `ul`; accepts standard list props                                     |
| `ItemList.Item`      | A compact icon-and-label row containing a button or supplied interactive element |
| `ItemList.Group`     | A collapsible, indented child list; open by default                              |
| `ItemList.Section`   | A labeled, non-collapsible list whose items retain their normal indentation      |
| `ItemList.Separator` | A decorative divider that remains a valid list child                             |

## Items, Links, and Actions

`ItemList.Item` renders a `button` with `type="button"` by default. Use `onClick` for actions, or supply an anchor or application link through `render` for navigation.

`render` replaces the interactive element inside the row, not the containing `li`. `children` supplies its label, and `icon` supplies an optional decorative leading icon. Standard button props, classes, attributes, and refs apply to the inner operation. A disabled Item is skipped by Tab and cancels clicks, including navigation through a supplied link.

<!-- example: links-and-actions -->

`isActive` controls visual emphasis only. The caller owns active-route matching and should supply `aria-current="page"` on a link representing the current page. No selection state, `listbox` role, or `aria-selected` is implied.

### Item Props

| Prop        | Type           | Default | Description                                                          |
| ----------- | -------------- | ------- | -------------------------------------------------------------------- |
| `icon`      | `ReactNode`    | —       | Optional decorative leading icon                                     |
| `children`  | `ReactNode`    | —       | Compact row label                                                    |
| `render`    | `ReactElement` | —       | Replaces the inner button, for example with an anchor or Router link |
| `isActive`  | `boolean`      | `false` | Visual emphasis without route matching or selection state            |
| `disabled`  | `boolean`      | —       | Disables clicks and removes the operation from the tab order         |
| `className` | `string`       | —       | Classes applied to the inner operation                               |

Other standard button props, such as `onClick`, `title`, and ARIA attributes, are forwarded to the inner operation. Put link-specific props such as `href`, `target`, and `rel` on the element passed to `render`.

## Groups and Heading Hierarchies

Without `render`, clicking a group's heading toggles its child list. `defaultOpen` defaults to `true`; set it to `false` to start collapsed. Groups can be nested.

With `render`, the heading's main operation becomes the supplied link or action. A separate button, named by the group title, expands and collapses the group. Navigating therefore does not toggle it. `isActive` controls the main heading operation's visual emphasis.

For a table of contents, use a linked Group for a parent heading and Items for its child headings. Keep the list data aligned with the actual heading hierarchy and anchor IDs in the document.

<!-- example: linked-group -->

### Group Props

| Prop          | Type           | Default | Description                                                           |
| ------------- | -------------- | ------- | --------------------------------------------------------------------- |
| `title`       | `string`       | —       | Resolved group label                                                  |
| `icon`        | `ReactNode`    | —       | Optional decorative leading icon                                      |
| `render`      | `ReactElement` | —       | Replaces the main heading operation; expansion uses a separate button |
| `isActive`    | `boolean`      | `false` | Visual emphasis for the heading operation                             |
| `defaultOpen` | `boolean`      | `true`  | Initial uncontrolled expanded state                                   |
| `children`    | `ReactNode`    | —       | Nested Items, Groups, Sections, or Separators                         |

Other standard `li` props, including `className`, apply to the containing group item, not its heading operation.

## Sections and Separators

Use `Group` for hierarchy and `Section` for flat classification. A Section accepts a resolved string `title` and `children`, keeps child rows at their normal indentation, and does not add an interactive heading. Other standard `li` props apply to its outer item.

Neither Group nor Section requires wrapping its children in another `ItemList.Root`. Use `ItemList.Separator` between logical runs of items; it is decorative and renders a list item rather than an invalid direct `div` child of `ul`.

## Styling and Accessibility

- Keep labels concise; they truncate in narrow containers.
- Use `aria-label` or `aria-labelledby` on Root when a list needs an accessible name.
- Native links and buttons retain their keyboard interactions. Group buttons announce their expanded state and support Enter and Space.
- Resolve translated strings before passing them to `title`; ItemList does not translate labels.
- ItemList is an ordinary list, not a menu or selection widget. It does not provide arrow-key selection, search, reordering, or Sidebar icon-rail behavior.
- Existing Sidebar components retain route metadata resolution, rail tooltips and flyouts, and drawer dismissal while sharing the underlying list presentation.
