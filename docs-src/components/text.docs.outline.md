---
kind: code-backed
group: text
title: Text
description: Text with a typography role, rendered as an element you choose
sources:
  - packages/core/src/components/text/**
---

# Text

The `Text` component applies a [typography role](../concepts/styling-theming.md#typography) to its content. A role sets font size, line height, font weight, and letter spacing together. The role does not set the color, and it does not choose the HTML element. Use the `render` prop to choose the element (Base UI render pattern).

## Import

```tsx
import { Text } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

<!-- api -->

All standard HTML attributes are also accepted. Put an attribute that belongs to one element, such as `htmlFor` on a `label`, on the `render` element:

```tsx
<Text variant="label-md" render={<label htmlFor="quantity" />}>
  Quantity
</Text>
```

Some lint rules report this example; see [Lint](#lint).

## Roles

`variant` takes one of the ten roles. Each role renders a default element when you do not pass `render`:

| `variant`         | Default element | Use                                             |
| ----------------- | --------------- | ----------------------------------------------- |
| `heading-lg`      | `h2`            | Page title (`Layout.Header`)                    |
| `heading-md`      | `h2`            | Section heading, card title                     |
| `heading-sm`      | `h2`            | Sub-section heading                             |
| `body-md`         | `p`             | Body copy, descriptions (default role)          |
| `body-sm`         | `p`             | Caption, timestamp, metadata                    |
| `body-md-relaxed` | `p`             | Long text, such as a chat message or a document |
| `body-sm-relaxed` | `p`             | Long text at the small size                     |
| `label-md`        | `span`          | Field label, short UI text, figures in a table  |
| `label-sm`        | `span`          | Small label, badge text                         |
| `code-sm`         | `span`          | ID and code. `Text` adds `font-mono` for you    |

<!-- example: roles -->

The sizes and line heights are in the [Typography section of the styling guide](../concepts/styling-theming.md#typography).

## Heading Level

All three heading roles render `h2` by default. The heading level comes from the document structure, not from the visual size, so set it with `render`:

```tsx
<Text variant="heading-md" render={<h3 />}>
  Line items
</Text>
```

To use a heading role for text that is not a heading, render a `div` or a `span`:

```tsx
<Text variant="heading-md" render={<div />}>
  1,240 orders
</Text>
```

## Lint

Some `jsx-a11y` rules check that an element has text inside it, for example `heading-has-content` for `<h3 />` and `label-has-associated-control` for `<label />`. These rules report the element in `render` as empty, because they do not see that `Text` passes its children to that element. If your app enables them, disable the rule on that line. ESLint and oxlint both read this comment:

```tsx
// eslint-disable-next-line jsx-a11y/heading-has-content -- Text renders the children
<Text variant="heading-md" render={<h3 />}>
  Line items
</Text>
```

## Color and Modifiers

Set the color with a color token in `className`. Four modifiers may also be combined with a role: `leading-none` for single-line text, `tabular-nums`, `font-medium` or `font-semibold` for emphasis, and `uppercase`.

<!-- example: color-and-modifiers -->

```tsx
<Text variant="body-md" className="text-muted-foreground">
  Orders sent this month.
</Text>
<Text variant="heading-md" render={<h3 />} className="leading-none">
  Card title
</Text>
<Text variant="label-md" className="tabular-nums">
  1,240.00
</Text>
```

Do not combine a role with other `leading-*`, `tracking-*`, or `text-*` size values. Pick a different `variant` instead. A `text-*` size class such as `text-sm` has no effect on `Text`: AppShell's stylesheet loads after yours, so the role's size wins.

## Using Roles Without Text

Each role is also a plain utility, for example `text-heading-md`. Use the utility when you style your own element and do not need `Text`:

```tsx
<th className="text-label-md text-muted-foreground">Amount</th>
```

## TypeScript

```typescript
import { type TextProps } from "@tailor-platform/app-shell";
```

## Accessibility

- A heading role renders a real heading (`h2`) by default, so screen readers list it with the other headings. Set the level with `render` so the levels follow the page structure.
- Do not choose a heading level for its size. `Text` keeps the size and the level separate.
- `body-*` roles render `p`. Inside another `p`, render a `span` instead (`<Text render={<span />}>`): the browser closes the outer `p` before the inner one, so React warns and server rendering fails to hydrate. Inside inline elements such as `button`, `label` or `span`, a `p` is invalid HTML too, so render a `span` there as well.

## Palettes

The `cream` and `bloom` palettes set the line height and letter spacing of `h1` to `h6` elements. Under these palettes, a heading role on a heading element uses the palette values (line height 1.2, letter spacing `-0.03em`), including when you add `leading-none`. The same role on a `div` or `span` uses the role values. See the [Typography section of the styling guide](../concepts/styling-theming.md#typography).

## Related Components

- [Card](./card.md) - The table above lists `heading-md` for card titles
- [Layout](./layout.md) - The table above lists `heading-lg` for the page title

AppShell's own components, including these two, still use the stock utilities. They will move to the roles in a later change.
