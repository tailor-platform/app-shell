# Decision: typography role tokens

> Status: **Decided for the first change — add 10 typography role tokens as CSS variables with Tailwind `text-*` utilities. No component uses them yet.**
> Scope: role names and values, how they reach Tailwind, and the rules for combining them. This does not cover applying roles to AppShell components, a `Text` component, or sizes below 12px.

## Context

Tracking issue: tailor-inc/platform-planning#1580 ([analysis comment](https://github.com/tailor-inc/platform-planning/issues/1580#issuecomment-5855498547)).

Until now, AppShell defined only the font family (`--font-sans`). `docs/concepts/styling-theming.md` told consumers to compose text from stock Tailwind utilities and gave a table of eight pairings. A sample of four sources on 2026-09-27 measured how often real code matched that table, counting whole combinations of size, weight, and line height:

| Source                                       | Combinations that match the table      |
| -------------------------------------------- | -------------------------------------- |
| AppShell components (238 usages)             | 17%                                    |
| UI catalogue pages and patterns (321 usages) | 15%                                    |
| erp-kit templates                            | 40% (combinations that include a size) |

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

- Line height is stored as a unitless ratio (`calc(32 / 24)`), so the line box scales with the size. The line boxes are on a 4px grid. `code-sm` (18px) is the one step of 2px, chosen because the current `font-mono text-xs` gives 16px, which is tight for monospace text.
- Every role sets letter spacing, including `0em`, so that no role inherits letter spacing from a parent.
- Labels keep weight 500, the value used today.
- The relaxed variants exist for body text only. They are for long text such as chat messages and documents.
- `overline` is not included. It is planned as a scoped role in a later change.

### Modifiers

Four stock Tailwind utilities may be combined with a role: `leading-none` (compact, single-line text only), `tabular-nums`, `font-medium` or `font-semibold` for emphasis on inline text, and `uppercase`. This is a documented rule and has no code. Other `leading-*`, `tracking-*`, and `text-[Npx]` values are not combined with a role.

A stock `leading-*`, `font-*`, or `tracking-*` on the same element still overrides the role value, because the emitted rule reads `--tw-leading`, `--tw-font-weight`, and `--tw-tracking` first.

### Other rules

- 12px is the minimum size. Existing 10px and 11px text moves to a 12px role in a separate change.
- A role does not choose the HTML element. The element comes from the document structure.
- A role carries no color.
- The card title direction is `heading-md` with `leading-none`. It is documented in the pairing table only. No component changes in this PR.

### `cn()` knows the role names

`tailwind-merge` reads an unknown `text-*` value as a text color. Without a change, `cn("text-label-md", "text-muted-foreground")` keeps only the color. AppShell components pass consumer `className` through `cn()` today, so this would drop a role as soon as a consumer follows the documented pairings. Core's `cn()` now registers the ten role names in the `font-size` group. The documentation shows the same setting for consumers who have their own `cn()`.

## Consequences and open questions

- **No visual change.** No component uses the roles yet. The default, cream, and bloom palettes render as before.
- **cream and bloom `h1` to `h6` rule.** Both palettes set `line-height: 1.2` and `letter-spacing: -0.03em` on `html :where(h1, h2, h3, h4, h5, h6)` outside any `@layer`. That rule wins over a role utility on those elements, so a heading role on an `h1` to `h6` gets the palette values for line height and letter spacing. This PR keeps the rule and documents the effect. Open question for the maintainers: what does this rule protect, and should it stay once heading roles exist?
- **Keyboard hint.** The earlier pairing table listed "keyboard hint" with `font-mono text-xs`. The only keyboard hint in the code (the sidebar ⌘K hint) uses `text-xs font-normal`. The new table has no keyboard hint row.
- **Follow-up changes** (not in this PR): apply the roles to core components; `overline`; migrate 10px and 11px text to 12px; a `Text` component; numeric DataTable columns with `tabular-nums` and right alignment as the default; a MetricCard value role and a display role above 24px.
- **Docs example.** The live example in the docs uses `div` and `p` elements. The docs app runs the bloom palette, and its `h1` to `h6` rule would otherwise change the heading rows.
