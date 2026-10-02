# Decision: hue scales and semantic colour roles under `--status-*` and `--alert-*`

> Status: **Decided for the first step. Hue scales and semantic roles are added; `--status-*` and hue `--alert-*` alias the roles; Badge, Alert, CsvImporter and MetricCard read the roles.**
> Scope: `packages/core/src/assets/themes/default.css` (hue scales, gray scale, roles, aliases), the Tailwind bridge, and the components that read the roles: Badge, Alert, CsvImporter, MetricCard. `--destructive` and the theme accent scales are not part of this step.

## Context

`--status-*` and `--alert-*` define the same intents (success, warning, error, info) twice, with different values. Neither has a contrast threshold, and some shipped pairs fail WCAG 1.4.3 (white text on the amber warning Badge, for example). Soft backgrounds and borders were built with `color-mix(... 10%, transparent)` per component, with no shared alpha scale.

Tracking issues (tailor-inc/platform-planning):

- #1394 alpha scale for soft backgrounds and borders (primary)
- #1891 `--status-*` and `--alert-*` double-define the same intents
- #1892 no contrast thresholds; shipping pairs fail WCAG 1.4.3
- #1429 status colours are hard to tell apart under colour vision deficiency. This step does not solve it: labels still carry the meaning.

## Decision

### Hue scales (internal)

One gray scale and four hues. Each hue has 12 steps, 12 alpha steps and a contrast colour, for light (`:root`) and dark (`.dark`):

`--primitive-{blue|green|amber|red}-{1..12}`, `--primitive-{hue}-a{1..12}`, `--primitive-{hue}-contrast`

Gray is the Tailwind `neutral` family, `--primitive-gray-{50..950}`, declared once because it is the same in both modes. It is not generated with Radix: the default palette already used these exact values (`#0a0a0a`, `#737373`, `#e5e5e5`, `#fafafa`, `#a3a3a3`), and the Radix generator cannot produce them. In the default palette `--foreground`, `--muted-foreground`, `--border` and `--input` read gray steps (light 950 / 500 / 200 / 200, dark 50 / 400 for the two text tokens). Dark `--border` and `--input` stay translucent white, and all surfaces stay literal: they are theme inputs, not scale steps. No default value changes. cream and bloom keep their own values; a theme can later pick another family (slate for their navy ink). Gray has no alpha steps.

They are not bridged to Tailwind. Consumers use the semantic roles, not steps. The `--primitive-` prefix keeps the two layers readable as primitive then semantic, and avoids collisions with a consumer's own copy of Radix Colors. It is not `--palette-` because "palette" already names the theme files (default, cream, bloom). The role tokens have no prefix. The existing `--semantic-shadow-*` tokens are a different kind of token and are not part of this set.

### Semantic roles (public, bridged)

`--{info|success|warning|danger|neutral}-{role}`, bridged as `--color-{intent}-{role}` (5 intents x 8 roles = 40 utilities such as `bg-info-solid`).

| role          | hue source                      | neutral source                |
| ------------- | ------------------------------- | ----------------------------- |
| surface       | a3                              | `var(--muted)`                |
| surface-hover | a4                              | `var(--accent)`               |
| border        | a6                              | `var(--border)`               |
| solid         | 9                               | `var(--secondary)`            |
| solid-hover   | 10                              | `var(--accent)`               |
| text          | 11 (warning: 12 light, 11 dark) | `var(--foreground)`           |
| contrast      | contrast                        | `var(--secondary-foreground)` |
| indicator     | 9                               | `var(--muted-foreground)`     |

The full set is bridged, including roles no component uses yet (neutral solid roles, hue `border`), so the set is one coherent vocabulary and `--alert-*` can alias every role.

Adding a role or an intent touches four places in one commit: `default.css` (both the `:root, .dark` block and, if the role has a per-mode exception, the `.dark` rule), `theme.bridge.css`, the pinned counts in `theme-bridge.test.ts`, and the roles table in `docs-src/concepts/styling-theming.docs.outline.md`. The docs table is hand-written; only the bridge count is checked by a test.

The roles and the aliases are declared for `:root, .dark`, so a nested `.dark` wrapper resolves them against its own scales. The only per-mode override is `--warning-text` (step 12 in light, step 11 in dark).

### Aliases

- `--status-default | neutral | completed | attention | danger` alias the neutral indicator and the info, success, warning and danger `solid` roles. `--status-default` therefore follows `--muted-foreground` instead of the fixed `#737373` it had: `#a3a3a3` in dark default, and translucent ink in cream and bloom.
- `--alert-{success,warning,error,info}-{background,border,foreground}` alias `surface`, `border` and `text` (`error` reads the `danger` intent).
- `--alert-{h}-foreground-muted` aliases `--alert-{h}-foreground` at full strength. The first plan used 85% of the text colour; over the surface that is 4.26:1 (info), 3.78:1 (success) and 4.23:1 (danger) in light mode, and no opacity below about 97% passes. Keeping the alias on `--alert-{h}-foreground` also keeps the override chain: a consumer who overrides the foreground gets a matching description.
- `--alert-neutral-*` keeps its values, expressed through the neutral roles.

### Badge

Filled, subtle and outline-dot variants read the semantic roles with `astw:` utilities. `default` and `neutral` are unchanged.

### Contrast contract

A unit test (`semantic-contrast.test.ts`) computes contrast from `default.css` for light and dark and asserts at least 4.5:1 for: `contrast` on `solid` and on `solid-hover`; `text` on `surface`; the alert foreground and description on the alert background. The last two are checked over `--card` and `--background`.

Not guaranteed:

- Hover surfaces. Light-mode text on `surface-hover` is 4.22:1 (danger, over both pages), 4.34:1 (success over `--background`) and 4.51:1 (success over `--card`). Subtle Badge hover can fall below 4.5:1 for danger and success. The test holds `text` on `surface-hover` at a floor of 4.2:1 so it cannot get worse unnoticed. This is a floor, not a pass. Changing the step is a design decision for a later change.
- The `cream` and `bloom` palettes and their tinted shell backgrounds (for example `text` on `surface` over the bloom light shell `#efe8ff` is 4.16:1 for success and 4.15:1 for danger).
- The neutral intent, which keeps the pre-existing system tokens.
- Warning `solid` against the card as a fill: 2.15:1 in light mode. `--status-attention` is unchanged (`#f59e0b`), so `text-status-attention` is still low contrast on light surfaces. CsvImporter now uses the warning text role instead.

## Provenance

Seeds: blue `#2563eb` (Tailwind blue-600), green `#15803d` (green-700), amber `#f59e0b` (amber-500), red `#dc2626` (red-600). Each is the lightest Tailwind step with white text at 4.5:1 or more; amber is the documented exception, and its `contrast` colour is pinned to the light step 12 `#4f3515` in both modes (dark text on a bright solid). Scales come from Radix `generateRadixColors` with gray `#737373` and backgrounds `#fafafa` (light) and `#0a0a0a` (dark), generated by `primitive-lab-gen/gen.ts`. The values in `default.css` are copied from its output without edits.

The "alpha" steps are translucent only where the generator could express them. In light mode, warning a3, a4 and a6, info a6 and danger a4 are opaque 6-digit hex. So the warning surface, surface-hover and border, the info border and the danger surface-hover do not blend with a tinted parent. Dark mode has no opaque values among a3, a4 and a6. Fixing the generator is a later step.

## Target shape

This step is the status part of a two-axis palette. The rest is planned as follows, so the roles added here do not need to change later:

| Axis               | Scale                                                                          | Roles                                                                                                                          | Step                           |
| ------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| Status (this step) | `--primitive-{blue,green,amber,red}-*`                                         | `--{info,success,warning,danger}-{role}`                                                                                       | done                           |
| Ink and lines      | `--primitive-gray-*`                                                           | base tokens read it (`--foreground`, `--muted-foreground`, `--border`, `--input`)                                              | done for default; themes later |
| Danger action      | red                                                                            | `--destructive` becomes an alias of `--danger-solid` once its text and border uses move to `--danger-text` / `--danger-border` | next                           |
| Brand              | an accent scale per theme (bloom and cream read blue, theme-tailor reads cyan) | `--primary`, `--ring` and brand tints read accent steps                                                                        | with the Theme Generator       |

`--status-*` and `--alert-*` stay as aliases for consumer code. Shipped components read the roles.

The component variant names (`Badge` and `Alert` `error`, Badge `neutral`) are public API and are not renamed here. Aligning them with the intent names (`error` → `danger`) is a breaking change; it is a candidate for the next major, together with deprecating `--status-*` and `--alert-*`.

## Out of scope

- `--destructive` and `--destructive-foreground` aliasing. Themes override `--destructive`, and it is used as solid, text and border at once, so it needs its own change. Button is untouched.
- Remapping surfaces or other themes onto the gray scale; gray alpha steps.
- Theme accent scales (the brand axis) and the Theme Generator.
- Bridging hue scales to Tailwind.
- New Badge or Alert variants, icons in Badge.
- Semantic-role swatches on the `/showcase/colors` page.

## Consequences

- Names do not change: `bg-status-*`, `bg-alert-*` and `text-destructive` keep working. Values do.
- `--status-*` are now fill and indicator colours. In dark mode they are step 9 values (`#15803d`, `#dc2626`, `#2563eb`), which are below 4.5:1 as text on the dark card (success 3.57:1, danger 3.71:1, info 3.47:1). CsvImporter text and the custom-components example moved to `text-{intent}-text`. Other consumers that use `text-status-*` in dark mode will see lower contrast.
- Badge `error` and `subtle-error`, and Alert `error`, no longer follow `--destructive`. They use the danger role in both modes. Button and `text-destructive` still follow `--destructive`, so in dark mode a Badge error (`#dc2626`) and a destructive Button (`#f87171`) differ. Consumers who override `--destructive` for Alert or Badge must override `--danger-*` or `--alert-error-*` instead.
- The warning Badge text is dark (`#4f3515`) instead of white.
- Alert description text is the same colour as the Alert title in the default palette.
- Consumers who override `--status-*` or `--alert-*` keep working for their own `bg-status-*` and `bg-alert-*` utilities, which read those tokens. The shipped components (Badge, Alert, CsvImporter, MetricCard — its trend colours were literal `green-600` / `red-600` before) read the roles, not `--status-*` or `--alert-*`. To recolour them, override the roles (`--{intent}-*`); overriding `--status-*` or `--alert-*` no longer changes the components. `--status-*` and `--alert-*` remain for existing consumer code and are not used by components any more.
- cream, bloom and `_template.css` values are not edited. The header comments now list `--{intent}-{role}` among the inherited tokens.
