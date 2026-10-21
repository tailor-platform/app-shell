# Decision: typography role tokens

> Status: **Decided — add 10 typography role tokens as CSS variables with Tailwind `text-*` utilities, a `Text` component on top of them, and use them in AppShell's own components (see "Third change"). "Fourth change" adds element components such as `Text.h1`.**
> Scope: role names and values, how they reach Tailwind, the rules for combining them, and the `Text` component (see "Second change" at the end). "Third change" covers applying the roles to AppShell components and moving sizes below 12px to 12px.

## Context

Tracking issue: tailor-inc/platform-planning#1580 ([analysis comment](https://github.com/tailor-inc/platform-planning/issues/1580#issuecomment-5855498547)).

Until now, AppShell defined only the font family (`--font-sans`). `docs/concepts/styling-theming.md` told consumers to compose text from stock Tailwind utilities and gave a table of eight pairings. A measurement of four sources on 2026-09-27 counted how often real code matched that table. The match rate counts only className strings that set a size and at least one more property (weight, line height, or letter spacing):

| Source                                                            | Usages | Combinations that match the table |
| ----------------------------------------------------------------- | ------ | --------------------------------- |
| AppShell components (`packages/core/src/components`, `ebd92cf`)   | 238    | 17%                               |
| UI Catalogue pages and patterns (`tailor-inc/app-web`, `a5872bb`) | 321    | 15%                               |
| erp-kit scaffold (`tailor-platform/erp-kit`, `a736aeb`)           | 528    | 40%                               |
| AppShell catalogue folder (AI reference code, `ebd92cf`)          | 24     | 50%, from 6 combinations          |

The catalogue folder is the AI reference code that has since moved to `docs-src/`. Its sample is too small to compare with the others. The same numbers are in the analysis comment on #1580.

The most common unlisted combination was `text-sm font-medium` (a label). It appears in all four sources. Code also used arbitrary sizes such as `text-[10px]`, and set line height explicitly in about 8 to 11% of places.

The styling guide says "the tokens are the rails". Typography had no tokens, so nothing gave a reader or an AI agent a name to pick.

## Decision

### Tokens are the source of truth

Each role is a named set of four values: size, line height, weight, and letter spacing. A `Text` component can be added later as a thin layer on top. The tokens come first, because consumers, AI agents, and future components all need the same names.

### Two layers, as for colors

- `themes/default.css` holds the values as `--type-<role>-<size|line-height|weight|letter-spacing>` on `:root`. A palette or an app can override them. They have no `--app-shell-` prefix, like the colour roles and `--semantic-shadow-*`. `--app-shell-font-sans` needs the prefix because `--font-*` is a Tailwind theme namespace; `--type-*` is not, and the bridge writes `--text-<role>`, so the names do not clash with the app's Tailwind. 1.17.0 shipped the variables as `--app-shell-type-*` before this rename, so each bridge entry reads the old name first (`var(--app-shell-type-<role>-<slot>, var(--type-<role>-<slot>))`). The fallback sits in the bridge, not in `default.css`, so it is resolved on the element that uses the utility: an app that overrides an old name keeps its value on `:root` and on any other element. The old names are deprecated and will be removed in the next major.
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

Four stock Tailwind utilities may be combined with a role: `leading-none` (compact, single-line text only), `tabular-nums`, `font-semibold` for emphasis on inline text, and `uppercase`. This is a documented rule and has no code. Emphasis uses `font-semibold` only, not `font-medium`. Body roles are 400 and label roles are 500, so `font-medium` makes no change on a label and only a small change on body text. One emphasis weight also removes the choice between the two. Other `leading-*`, `tracking-*`, and `text-[Npx]` values are not combined with a role. When a role and `leading-none` are merged with `cn()`, write `leading-none` after the role; a size class removes an earlier `leading-*` class in `tailwind-merge`, the same as for a stock size such as `text-lg`.

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

- **No visual change in the first change.** No component used the roles yet. The default, cream, and bloom palettes render as before.
- **cream and bloom `h1` to `h6` rule.** Both palettes set `line-height: 1.2` and `letter-spacing: -0.03em` on `html :where(h1, h2, h3, h4, h5, h6)` outside any `@layer`. That rule wins over a role utility on those elements, so a heading role on an `h1` to `h6` gets the palette values for line height and letter spacing. It also wins over any `leading-*` or `tracking-*` class on those elements, including the `leading-none` in the card title pairing: an `h3` with `text-heading-md leading-none` has a line height of 1.2 under cream and bloom, and 1.0 under the default palette. The same classes on a `div` or `span` render as documented. This PR keeps the rule and documents the effect. Open question for the maintainers: what does this rule protect, and should it stay once heading roles exist?
- **Keyboard hint.** The earlier pairing table listed "keyboard hint" with `font-mono text-xs`. The only keyboard hint in the code (the sidebar ⌘K hint) uses `text-xs font-normal`. The new table has no keyboard hint row.
- **Follow-up changes** (not in this PR): apply the roles to core components; `overline`; migrate 10px and 11px text to 12px; a `Text` component (added in a second change, see below); numeric DataTable columns with `tabular-nums` and right alignment as the default; a MetricCard value role and a display role above 24px.
- **Docs example.** The live example in the docs uses `div` and `p` elements. The docs app runs the bloom palette, and its `h1` to `h6` rule would otherwise change the heading rows.

## Second change: the `Text` component

> Status: **Decided.** Applying the roles to core components is a third change.

- **API.** `Text` takes the role as `variant`. The prop is not called `role`, because `role` is an ARIA attribute. The element is set with Base UI's `render` prop, as in `Button`, the sidebar primitives, and the breadcrumb. AppShell has no `as` or `asChild` prop.
- **Default elements.** The three heading roles render `h2`. The body roles, including the relaxed variants, render `p`. `label-md`, `label-sm`, and `code-sm` render `span`. All headings share one default so that no heading level is implied by size. `h2` is the default because a page has one `h1` (`Layout.Header`), and `Dialog.Title` from Base UI also renders `h2`. A default is hard to change later, because every call site without `render` would get a different element.
- **Lint.** The `jsx-a11y/heading-has-content` rule reports `render={<h3 />}` as an empty heading, and the function form `render={(props) => <h3 {...props} />}` too. Apps that enable the rule disable it on that line. A `level` prop would avoid this, but it would add a second way to choose the element next to `render`. The documentation shows the disable comment instead. _Updated by the fourth change: headings now use `Text.h1` to `Text.h6`, and the disable comment remains only for other elements in `render`._
- **No color or modifier props.** Color and the four modifiers stay in `className`, as for the utilities. A consumer `leading-none`, `font-semibold`, or `tracking-*` overrides the role even though AppShell's prefixed sheet loads later, because the role reads the shared `--tw-leading`, `--tw-font-weight`, and `--tw-tracking` variables first. `tests/browser/theme.test.tsx` checks the computed styles in Chromium; `tests/typography-compile.test.ts` retains the full role-declaration checks.
- **No `textVariants` export.** tailor-inc/platform-planning#1580 asked for a variants export. It is descoped, not deferred. The `text-<role>` utilities already apply the same role mappings, so a cva export would be a third way to do the same thing, and it would put `astw:`-prefixed classes into consumer code. Unlike `Button` and `Badge`, `Text` does not export its cva function.
- **`code-sm` includes `font-mono`.** The utility cannot set the font family, but the component can.
- **cream and bloom.** The `h1` to `h6` rule is unchanged. The default `h2` takes the palette's line height and letter spacing under these palettes, the same as existing headings in AppShell components today.

## Third change: roles in AppShell components

> Status: **Decided.**

- **Text or the role utility.** Content text renders with `Text`: titles, descriptions, captions, hints, messages, error text, and key and value display. Text that is part of a control, or sits inside one, keeps the role utility: buttons, inputs, menu, listbox, palette and tab items and their group labels, badges, counters, toolbars, pagination, and table cells. cva strings, shared class strings, and containers that set the size for their children also keep the utility. Radix Themes, Primer, and the Atlassian Design System split their components the same way. Polaris uses its `Text` almost everywhere; Mantine and Chakra do not use theirs inside components.
- **`render` and `data-slot`.** A Base UI part, or an element whose tag differs from the role's default, is passed with `render` (for a plain `h1` to `h6`, `p`, `span`, or `div`, see the fourth change), for example `<Text variant="heading-md" render={<BaseDialog.Title data-slot="dialog-title" {...props} />} />`. The `data-slot` stays on the render element, because its props win over the `data-slot="text"` that `Text` sets.
- **Lint.** Where `render` gets an empty `h1`, `h3`, `h4`, `a`, or `label`, the matching `jsx-a11y` rule is disabled on that line, as the `Text` documentation shows for apps. _Updated by the fourth change: headings now use `Text.h1` to `Text.h6`, so only the `a` and `label` disable comments remain._
- **`Text` passes children only when given.** A render part that supplies its own content keeps it. Base UI's `Field.Error` shows the validation message this way.
- **Value changes.** Text below 12px moves to 12px. Line heights outside the allowed modifiers move to the role's line height, or to a relaxed role for chat messages. The uppercase section labels, the ActivityCard day label, and the menu group label use `label-sm` at weight 500. `code-sm` adds 2px of line height. In key and value pairs, the key is `label-md` with a muted color and the value is `body-md`, the same as numbers in DataTable. An `h1` to `h6` element takes a heading role (chat empty state title, default sidebar app title). `Alert.Title` drops `tracking-tight`. A selected item (sidebar, chat history, DataTable filter panel) uses `font-semibold` with its background, as Primer and Polaris do.
- **Element types do not change.** Under the cream and bloom palettes, headings render as before. The open question about their `h1` to `h6` rule stays open.
- **Guard.** `tests/typography-usage.test.ts` fails on a raw Tailwind text size in a component, on a role class with an unknown name, and on `text-code-sm` without `font-mono`.

## Fourth change: element components

> Status: **Decided.** Tracking issue: tailor-inc/platform-planning#2225 (under the umbrella tailor-inc/platform-planning#2214). Discussed in `#pf-app-shell` on 2026-10-27.

- **API.** `Text.h1` to `Text.h6`, `Text.p`, `Text.span`, and `Text.div` always render their named element. They take `variant`, `className`, the element's own attributes, and a ref typed for the element. They do not take `render`. `Text` and its `render` prop do not change, and `render` stays the way to compose with another component. The names are lowercase to show that each one is an HTML element with a default role, not a higher-level component.
- **Why this is not a second way to choose the element.** The second change rejected a `level` prop because it would sit next to `render`. The element components split the work instead: a plain HTML element uses `Text.<element>`, and composition uses `render`. An `as` prop was also considered and dropped, because it does the same thing as `Text.h1`.
- **Defaults.** `Text.h1` is `heading-lg`, `Text.h2` is `heading-md`, and `Text.h3` to `Text.h6` are `heading-sm`. `Text.p` is `body-md`. `Text.span` is `label-md`, not `body-md`, to follow the default elements of `Text`: body roles render `p`, and label and code roles render `span`. `Text.div` is `body-md`, the default role of `Text`, because `div` is a block element like `p`. A default is only a starting point; any role works on any element.
- **Lint.** `jsx-a11y/heading-has-content` does not report `<Text.h1>`, because the rule sees the element name `Text.h1`, not `h1` (checked with oxlint 1.64). Headings no longer need the disable comment. Note that the rule also does not report an empty `<Text.h1 />`.
- **Scope.** Only the elements above. Other elements, such as `code`, `small`, `pre`, `blockquote`, `figcaption`, `time`, `kbd`, and `label`, use `Text` with `render`, and the disable comment where a lint rule reports the empty element. More elements can be added if they are used often.
- **No exported props type.** `React.ComponentProps<typeof Text.h2>` gives the props type. A named export would be another public name that cannot be removed later without a breaking change, while adding one later is not breaking.
- **Implementation.** The element components render the element directly, without Base UI's `useRender`, because they take no `render` prop. They set `data-slot="text"` and the same classes as `Text`.
- **Documentation.** The heading examples in the quickstart, the styling guide, and the `app-shell-patterns` skill use the element components.
- **AppShell's own components.** A follow-up change replaced the 43 places where a component passed a plain `h1` to `h6`, `p`, `span`, or `div` to `render` with the element components, and removed the 13 `heading-has-content` disable comments. Each place keeps its role: it writes `variant` only where the role differs from the element's default (36 places), so the rendered element and classes do not change. A `data-slot` or other attribute on the render element moves to the element component, where it still wins over `data-slot="text"`. `render` stays for Base UI parts and other components (`Dialog.Title`, `Field.Error`, `Link`) and for other elements (`dt`, `dd`, `code`, `pre`, `caption`, `address`, `a`). The document detail page example changed in the same way.
