# Decision: typography role tokens

> Status: **Decided for the first change — add 10 typography role tokens as CSS variables with Tailwind `text-*` utilities. No component uses them yet.**
> Scope: role names and values, how they reach Tailwind, and the rules for combining them. This does not cover applying roles to AppShell components, a `Text` component, or sizes below 12px.

## Context

Tracking issue: tailor-inc/platform-planning#1580 ([analysis comment](https://github.com/tailor-inc/platform-planning/issues/1580#issuecomment-5855498547)).

Until now, AppShell defined only the font family (`--font-sans`). `docs/concepts/styling-theming.md` told consumers to compose text from stock Tailwind utilities and gave a table of eight pairings. A sample of four sources on 2026-09-27 measured how often real code matched that table, counting whole combinations of size, weight, and line height:

| Source                          | Usages | Combinations that match the table |
| ------------------------------- | ------ | --------------------------------- |
| AppShell components             | 238    | 17%                               |
| UI catalogue pages and patterns | 321    | 15%                               |
| erp-kit templates               | 528    | 35% (\*)                          |
| Catalogue (small sample)        | 24     | 50%, from 6 combinations          |

(\*) 40% if the denominator is only the combinations that include a size. The catalogue sample is too small to compare with the others.

The most common unlisted combination was `text-sm font-medium` (a label). It appears in all four sources. Code also used arbitrary sizes such as `text-[10px]`, and set line height explicitly in about 8 to 11% of places.

The styling guide says "the tokens are the rails". Typography had no tokens, so nothing gave a reader or an AI agent a name to pick.

## Decision

### Tokens are the source of truth

Each role is a named set of four values: size, line height, weight, and letter spacing. A `Text` component can be added later as a thin layer on top. The tokens come first, because consumers, AI agents, and future components all need the same names.

### Two layers, as for colors

- `themes/default.css` holds the values as `--app-shell-type-<role>-<size|line-height|weight|letter-spacing>` on `:root`. A palette or an app can override them.
- `theme.bridge.css` maps them to Tailwind with `--text-<role>` and its `--line-height`, `--font-weight`, and `--letter-spacing` suffixes, inside the existing `@theme inline`.

`@theme inline` writes literal values into the utility. If the values sat in the bridge, they could not be overridden on `:root`. So the bridge holds only `var()` references.

The `--text-*` namespace cannot set `font-family`. `code-sm` therefore requires `font-mono` on the element.

### Ten roles

| Role              | Size | Line height | Weight | Letter spacing |
| ----------------- | ---- | ----------- | ------ | -------------- |
| `heading-lg`      | 24px | 32px        | 700    | -0.025em       |
| `heading-md`      | 18px | 28px        | 600    | 0              |
| `heading-sm`      | 14px | 20px        | 600    | 0              |
| `body-md`         | 14px | 20px        | 400    | 0              |
| `body-sm`         | 12px | 16px        | 400    | 0              |
| `label-md`        | 14px | 20px        | 500    | 0              |
| `label-sm`        | 12px | 16px        | 500    | 0              |
| `code-sm`         | 12px | 18px        | 400    | 0              |
| `body-md-relaxed` | 14px | 24px        | 400    | 0              |
| `body-sm-relaxed` | 12px | 20px        | 400    | 0              |

- Line height is stored as a unitless ratio (`calc(32 / 24)`), so the line box scales with the size. The line boxes are on a 4px grid. `code-sm` uses an 18px line box (ratio 1.5). The current `font-mono text-xs` gives 16px (ratio 1.33). The 2px step is a design choice for monospace text, not a measured result.
- Every role sets letter spacing, including `0em`, so that no role inherits letter spacing from a parent.
- Labels keep weight 500, the value used today.
- The relaxed variants exist for body text only. They are for long text such as chat messages and documents.
- `overline` is not included. It is planned as a scoped role in a later change.

### Modifiers

Four stock Tailwind utilities may be combined with a role: `leading-none` (compact, single-line text only), `tabular-nums`, `font-medium` or `font-semibold` for emphasis on inline text, and `uppercase`. This is a documented rule and has no code. Other `leading-*`, `tracking-*`, and `text-[Npx]` values are not combined with a role. When a role and `leading-none` are merged with `cn()`, write `leading-none` after the role; a size class removes an earlier `leading-*` class in `tailwind-merge`, the same as for a stock size such as `text-lg`.

A stock `leading-*`, `font-*`, or `tracking-*` on the same element still overrides the role value, because the emitted rule reads `--tw-leading`, `--tw-font-weight`, and `--tw-tracking` first.

### Other rules

- 12px is the minimum size. Existing 10px and 11px text moves to a 12px role in a separate change.
- A role does not choose the HTML element. The element comes from the document structure.
- A role carries no color.
- The card title direction is `heading-md` with `leading-none`. It is documented in the pairing table only. No component changes in this PR.

### `cn()` knows the role names

`tailwind-merge` reads an unknown `text-*` value as a text color. Without a change, `cn("text-label-md", "text-muted-foreground")` keeps only the color. AppShell components pass a consumer `className` through `cn()` today, so `<Component className="text-label-md text-muted-foreground">` would lose the role even though nothing in core uses roles yet (checked with `tailwind-merge` on `"astw:flex astw:text-sm"` merged with `"text-label-md text-muted-foreground"`: the role is removed). Core's `cn()` therefore registers the ten role names in the `font-size` group. The documentation shows the same setting for consumers who have their own `cn()`.

This registration is a deviation from the first plan, which left `cn()` for the change that applies roles to components. It is kept in this PR because of the case above. The change is limited to `packages/core/src/lib/utils.ts` and its test, and can be reverted on its own.

Limit: this does not let a role replace a size that core sets on its own element. Core classes carry the `astw:` prefix, and `tailwind-merge` reads that prefix as a variant, so `cn("astw:text-sm", "text-label-md")` keeps both classes. The same limit applies today to any unprefixed `text-*` class. Which of the two wins then depends on CSS order. Overriding an `astw:text-*` size from a consumer `className` is not supported; it needs the follow-up change that applies roles in core components. The role list in `utils.ts` and the roles in `default.css` must stay in sync; `utils.test.ts` checks this.

## Consequences and open questions

- **No visual change.** No component uses the roles yet. The default, cream, and bloom palettes render as before.
- **cream and bloom `h1` to `h6` rule.** Both palettes set `line-height: 1.2` and `letter-spacing: -0.03em` on `html :where(h1, h2, h3, h4, h5, h6)` outside any `@layer`. That rule wins over a role utility on those elements, so a heading role on an `h1` to `h6` gets the palette values for line height and letter spacing. It also wins over any `leading-*` or `tracking-*` class on those elements, including the `leading-none` in the card title pairing: an `h3` with `text-heading-md leading-none` has a line height of 1.2 under cream and bloom, and 1.0 under the default palette. The same classes on a `div` or `span` render as documented. This PR keeps the rule and documents the effect. Open question for the maintainers: what does this rule protect, and should it stay once heading roles exist?
- **Keyboard hint.** The earlier pairing table listed "keyboard hint" with `font-mono text-xs`. The only keyboard hint in the code (the sidebar ⌘K hint) uses `text-xs font-normal`. The new table has no keyboard hint row.
- **Follow-up changes** (not in this PR): apply the roles to core components; `overline`; migrate 10px and 11px text to 12px; a `Text` component; numeric DataTable columns with `tabular-nums` and right alignment as the default; a MetricCard value role and a display role above 24px.
- **Docs example.** The live example in the docs uses `div` and `p` elements. The docs app runs the bloom palette, and its `h1` to `h6` rule would otherwise change the heading rows.
