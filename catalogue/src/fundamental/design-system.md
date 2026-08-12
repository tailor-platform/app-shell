# Design System

Authority for **visual-only** decisions — tokens, theme imports, breakpoints intent, `**astw:`** rules, and custom-component conformance. For **React component APIs** (imports, props, JSX composition), pair this file with `**components.md`\*\*; that split avoids duplicating tables and lengthy examples across both docs.

`@tailor-platform/app-shell` (ERP scaffolds target **≥0.36**; bump your app’s pinned version deliberately) ships an opinionated design system via CSS variables, delivered by the `styles` import. Use it whether you are consuming AppShell components (most cases) or building a custom component to fill a gap.

**The tokens are the rails.** Consistency across customers, apps, and AI runs comes from the token system, not from rules written in prose. A hand-typed `#fff` or `padding: 13px` is not a "small deviation" — it is the mechanism by which consistency dies. Every visual value you reach for must resolve to a token in this file. If a token is missing, add one; never inline.

## 1. Setup

Authoritative app wiring also lives in `**project-setup.md`**; **scaffold `index.css`\*\* currently does:

```css
@import "tailwindcss";
@import "tw-animate-css";

@import "@tailor-platform/app-shell/styles";
```

That is the whole wiring:

- `**styles**` (package export) — design tokens as CSS variables (light **and** dark), the Tailwind v4 `@theme inline` bridge, the `dark` custom variant, and the bundled component styles AppShell ships for primitives. One import, everything (since 1.7.0).
- `**tailwindcss**` — utilities; token-backed classes (`bg-background`, `text-muted-foreground`) resolve through the bridge that `styles` provides.

Older docs referred to `app-shell.css` or to a separate `@tailor-platform/app-shell/theme.css` import; use neither. `theme.css` is a deprecated no-op shim kept only so pre-1.6 apps keep building.

**Do not paste a `@theme inline` block, a `@custom-variant dark` rule, or a copy of AppShell's palette into the app's entry CSS.** A workaround for 1.5.0–1.6.1, where `styles` shipped without the bridge, did exactly that; from 1.7.0 those unlayered copies beat AppShell's layered palette and silently break dark mode. On 1.6.x the workaround is still load-bearing — upgrade to ≥1.7.0 before removing it. See [Styling and Theming → Upgrading from 1.5.x or 1.6.x](https://github.com/tailor-platform/app-shell/blob/main/docs/concepts/styling-theming.md#upgrading-from-15x-or-16x-remove-the-theme-bridge-workaround) for the removal steps.

Tailwind v4 stays CSS-first; minimal `vite` / PostCSS wiring is in `**project-setup.md**`.

## 2. Theming via CSS variables

AppShell controls its theme through CSS variables. Override them after the AppShell imports, using `:root` for light and `:root.dark` for dark — that pair wins against both the layered default palette and the unlayered branded ones (`cream`, `bloom`), which define their dark values on `:root.dark` and so outrank a bare `.dark`.

Override **only** the specific tokens you mean to change, and set each one in both modes — a `:root`-only override leaks its light value into dark mode:

```css
:root {
  --primary: #3b82f6;
}

:root.dark {
  --primary: #60a5fa;
}
```

Override at the highest scope where the change applies. Do not duplicate token values across files — change them at the source. Never copy the palette wholesale; tokens you did not copy stay on AppShell's values and the two halves drift apart on every upgrade.

**Dark mode** is driven by a `.dark` class on the root element, managed by AppShell (`useTheme()` / `<AppearanceSwitcher />`). AppShell primitives respect it automatically. Custom components inherit dark-mode behaviour for free as long as they reference tokens (`bg-background`, `text-foreground`) and never inline literal colors.

## 3. Component styling with data attributes

AppShell's UI components support data-attribute-based styling, following the [Base UI data attributes](https://base-ui.com/react/handbook/styling#data-attributes) convention. Components expose `data-`\* attributes that reflect their internal state, enabling CSS-only style control without JavaScript:

```css
/* Style a component based on its state */
.SwitchThumb[data-checked] {
  background-color: green;
}

.MenuItem[data-highlighted] {
  background-color: var(--color-primary);
  color: white;
}
```

This works with Tailwind as well — **use theme tokens**, not raw Tailwind grays:

```tsx
<Switch.Thumb className="bg-surface-3 data-[checked]:bg-primary" />
```

Check each component's API reference (`components.md`) for the data attributes it exposes. Custom components must follow the same convention (see Section 6).

## 4. Tokens

The values below come from the `styles` import. **Use the token, never hand-type the value.** A hex literal or magic px in a PR is a review failure.

### Color

Four families. Pick by **intent**, not by visual taste.

| Family     | Token                    | Use                                 | Tailwind                      |
| ---------- | ------------------------ | ----------------------------------- | ----------------------------- |
| Surface    | `--color-surface-1`      | page background                     | `bg-surface-1`                |
| Surface    | `--color-surface-2`      | card on page                        | `bg-surface-2`                |
| Surface    | `--color-surface-3`      | nested card on card                 | `bg-surface-3`                |
| Foreground | `--color-fg-default`     | primary text                        | `text-fg-default`             |
| Foreground | `--color-fg-muted`       | secondary text, descriptions        | `text-fg-muted`               |
| Foreground | `--color-fg-subtle`      | tertiary text, captions, timestamps | `text-fg-subtle`              |
| Brand      | `--color-primary`        | primary buttons, links, focus rings | `bg-primary` / `text-primary` |
| Brand      | `--color-primary-hover`  | brand hover state                   | `hover:bg-primary-hover`      |
| Brand      | `--color-primary-active` | brand pressed state                 | `active:bg-primary-active`    |
| Status     | `--color-danger`         | destructive actions, errors         | `bg-danger` / `text-danger`   |
| Status     | `--color-warning`        | non-blocking caution                | `bg-warning` / `text-warning` |
| Status     | `--color-success`        | confirmations, completed states     | `bg-success` / `text-success` |
| Status     | `--color-info`           | neutral callouts                    | `bg-info` / `text-info`       |

```tsx
// Good — Button exposes a destructive variant; prefer variants over bolting tokens on className when available
<div className="bg-surface-1 text-fg-default">…</div>
<Button variant="destructive">Delete</Button>

// Bad — raw colors bypass the theme
<div style={{ background: "#fff", color: "#111" }}>…</div>
```

Never reach for raw color names. If a status doesn't fit, that's a content problem, not a token problem.

### Spacing

Linear scale on a 4px base. Padding, margin, and gap all come from this scale. Tailwind's `p-4`, `gap-2`, `mt-8` resolve to the same tokens.

| Token        | Value | Common use                |
| ------------ | ----- | ------------------------- |
| `--space-0`  | 0     | reset                     |
| `--space-1`  | 4px   | tight icon-text gap       |
| `--space-2`  | 8px   | inline gap, small padding |
| `--space-3`  | 12px  | row gap, button padding   |
| `--space-4`  | 16px  | card padding, default gap |
| `--space-6`  | 24px  | section gap               |
| `--space-8`  | 32px  | major section gap         |
| `--space-12` | 48px  | page section break        |
| `--space-16` | 64px  | hero spacing              |

```tsx
// Good — scale step
<div className="flex gap-3 p-4">…</div>

// Bad — magic value
<div className="p-[13px]">…</div>
```

Hand-typing `padding: 13px` is a smell. Round to the nearest scale step; if nothing fits, the layout is wrong, not the scale.

### Typography

Named roles. Each token bundles font-size + line-height + weight. Pick by **role**, not by size. Don't set `font-size` and `line-height` independently.

| Token     | Tailwind       | Use                          |
| --------- | -------------- | ---------------------------- |
| `display` | `text-display` | hero / marketing surfaces    |
| `h1`      | `text-h1`      | page title                   |
| `h2`      | `text-h2`      | section heading              |
| `h3`      | `text-h3`      | subsection / card title      |
| `h4`      | `text-h4`      | nested heading               |
| `body-lg` | `text-body-lg` | emphasised body              |
| `body`    | `text-body`    | default body copy            |
| `body-sm` | `text-body-sm` | dense rows, secondary copy   |
| `caption` | `text-caption` | timestamps, labels, metadata |
| `mono`    | `text-mono`    | IDs, code, numbers in tables |

```tsx
<h2 className="text-h2">Section</h2>
<p className="text-body text-fg-muted">Description copy</p>
<span className="text-caption text-fg-subtle">Updated 2h ago</span>
```

### Radius

Pick by component role. A card is always `md`, regardless of its size on screen.

| Token           | Use                 |
| --------------- | ------------------- |
| `--radius-sm`   | inputs, small chips |
| `--radius-md`   | cards, buttons      |
| `--radius-lg`   | modals, sheets      |
| `--radius-xl`   | large surfaces      |
| `--radius-full` | pills, avatars      |

### Elevation

Higher elevation reads as "more transient" — match the component's lifetime. Never hand-craft a `box-shadow`.

| Token           | Use                      |
| --------------- | ------------------------ |
| `--elevation-0` | flat surface             |
| `--elevation-1` | persistent panel, card   |
| `--elevation-2` | sticky bar, hovered card |
| `--elevation-3` | popover, menu            |
| `--elevation-4` | modal, dialog, sheet     |

### Motion

Duration paired with easing. Match motion to the change's lifetime — short events get short durations.

| Token             | ~Duration | Use                            |
| ----------------- | --------- | ------------------------------ |
| `--motion-fast`   | 120ms     | hover, focus, button press     |
| `--motion-base`   | 200ms     | state changes (toggle, select) |
| `--motion-slow`   | 320ms     | entrance, dialog open          |
| `--motion-slower` | 500ms     | full-page transitions          |
| `--ease-out`      | —         | entrances, reveals             |
| `--ease-in-out`   | —         | symmetric state changes        |

```css
.menu-item {
  transition: background-color var(--motion-fast) var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .menu-item {
    transition: none;
  }
}
```

Always wrap motion in `@media (prefers-reduced-motion: reduce)` and collapse to instant or near-instant transitions. AppShell components handle this internally; custom components must do the same.

### Z-index

Never invent a z value. If you need a new layer, add a token; never `z-index: 9999`. Popups and overlays share `50` intentionally — sequencing comes from DOM order, not z escalation.

| Token              | Value | Use                           |
| ------------------ | ----- | ----------------------------- |
| `--z-sidebar`      | 10    | persistent sidebar            |
| `--z-sidebar-rail` | 10    | sidebar collapsed rail        |
| `--z-popup`        | 50    | menu, tooltip, popover        |
| `--z-overlay`      | 50    | modal, sheet, dialog backdrop |

### Icon sizes

Pair icon size with the surrounding text scale. Pass via the `size` prop, not raw width/height.

| Token       | Pairs with text       |
| ----------- | --------------------- |
| `--icon-sm` | `body-sm`, `caption`  |
| `--icon-md` | `body`, `body-lg`     |
| `--icon-lg` | `h3`, `h4`            |
| `--icon-xl` | `h1`, `h2`, `display` |

```tsx
<Icon name="check" size="md" />
```

### Breakpoints

| Token | Width  |
| ----- | ------ |
| `sm`  | 640px  |
| `md`  | 768px  |
| `lg`  | 1024px |
| `xl`  | 1280px |
| `2xl` | 1536px |

**ERP target is `xl`/`2xl` desktop.** Pages should be designed for those widths first; smaller breakpoints exist for graceful degradation, not parity. Don't waste effort on mobile-first composition unless a screen explicitly calls for it. A list page that collapses gracefully at `md` is fine; a list page redesigned for `sm` is over-investment.

Two-column **behavior** (right rail stacks under `**lg`**): respect AppShell defaults — do not force side-by-side grids on narrow viewports. `**Layout`column width table** numbers live in`**components.md` → Layout**; reuse them instead of guessing rem values here.

## 5. The `astw:` prefix

AppShell exposes **layout / sizing / overflow** escapes on some components via props like `containerClassName`, `contentClassName`, `className` on roots. Prefix those utilities with `**astw:`\*\* so they apply to the wrapper AppShell controls.

**Do not duplicate full component trees here.** Typical patterns (full `**DataTable`** composition, `**Sheet`+ footer**,`**Table.Root` + card insets**) live in `**components.md`\*\* with JSX you can copy.

Minimal illustrations — same rules apply to other `*ClassName` hooks:

```tsx
<Table.Root containerClassName="astw:px-6 astw:max-h-96 astw:overflow-y-auto" />
<Sheet contentClassName="astw:w-[480px] astw:flex astw:flex-col astw:gap-4" />
```

Rules:

- `**astw:**` only on AppShell `*ClassName` / root `className` hooks each component exposes. Use **plain** Tailwind (`flex`, `gap-4`, `bg-surface-1`, …) on **your** markup.
- Stick to **layout** utilities (`flex`, `grid`, `max-h-*`, `min-h-0`, `overflow-*`, widths). Avoid painting over internal AppShell padding or colors via `astw:` — prefer an upstream prop or composition change.
- Steps like `**astw:p-4`\*\* still resolve through tokens — never arbitrary `astw:p-[13px]`.

## 6. When AppShell doesn't have a component you need

Most ERP screens compose entirely from AppShell primitives. When you hit a gap, work through this decision tree before building anything:

### Decision tree

1. **Can you compose existing AppShell primitives?** A "card with metric and trend arrow" is `Card` + `Stat` + `Icon`, not a new component. Compose first.
2. **If composition won't work, is the behavior one-off?** Build it locally under `src/components/<name>/` and flag it for the `build-component` skill, which promotes useful customs into AppShell upstream.
3. **If it's already proven reusable across 2+ apps**, skip local entirely — use the `build-component` skill to add it to AppShell directly.

### Conformance rules (non-negotiable for any custom component)

- **Tokens only.** No hex literals, no magic px values, no hand-rolled shadows. Every visual property maps to a token from Section 4.
- **Base UI data-attribute pattern for state.** Expose `data-*` attributes that reflect internal state; never style off React props alone. A custom toggle exposes `data-checked`; a custom step indicator exposes `data-active`, `data-completed`, etc.
- **Compose AppShell primitives inside.** If the custom needs a button, use `Button` — not raw `<button>`. Same for `Input`, `Badge`, `Icon`. The custom's job is composition, not reinvention.
- **Document with a `README.md`** in the component folder listing: purpose, props, tokens used, and a brief justification for why this can't be composed from existing AppShell primitives.
- **Match accessibility behavior** of the closest AppShell equivalent — focus management, ARIA roles/attributes, keyboard interactions. Reach for Base UI primitives if the behavior is non-trivial.

Example skeleton for a local custom component:

```tsx
// src/components/StepIndicator/index.tsx
import { Icon } from "@tailor-platform/app-shell";

type Props = { steps: string[]; current: number };

export function StepIndicator({ steps, current }: Props) {
  return (
    <ol className="flex gap-2">
      {steps.map((label, i) => (
        <li
          key={label}
          data-active={i === current ? "" : undefined}
          data-completed={i < current ? "" : undefined}
          className="
            flex items-center gap-2 px-3 py-2 rounded-md
            bg-surface-2 text-fg-muted text-body-sm
            data-[active]:bg-primary data-[active]:text-fg-default
            data-[completed]:text-success
          "
        >
          {i < current && <Icon name="check" size="sm" />}
          {label}
        </li>
      ))}
    </ol>
  );
}
```

Notice: tokens for every value, `data-*` attributes for state, no hex literals, AppShell `Icon` composed inside.

### Promotion path

When a custom component proves reusable across 2+ apps, promote it upstream into AppShell via the `build-component` skill (a separate skill at `~/.claude/skills/build-component/`). The skill handles API design, exports, test coverage, and the upstream PR. Local custom components should be considered staging — not a permanent home.

## 7. Quick reference

### Where to look

| Concern                                             | File                               |
| --------------------------------------------------- | ---------------------------------- |
| Component imports, props, JSX composition           | **`components.md`**                |
| Page / screen layout patterns                       | **`patterns/<type>/<slug>.md`**    |
| Design tokens, `astw:` rules, custom UI conformance | **this file** (`design-system.md`) |

**`components.md`** holds long JSX compositions (e.g. **`DataTable`**, **card + `Table`**). **Do not copy those trees into this file** — link back here only for tokens and `astw:` policy.

`patterns/` is organised by page type: `patterns/list/`, `patterns/detail/`, `patterns/form/`, `patterns/interaction/`. Pick the slug matching the screen you're building.

### Semantic decisions

| Intent                             | Pick                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Destructive action (delete, void)  | Prefer **`Button`** `variant="destructive"`; use danger tokens on custom surfaces; confirm in dialog at elevation `4` |
| Non-blocking caution               | `bg-warning`                                                                                                          |
| Confirmation / completed state     | `bg-success`                                                                                                          |
| Neutral callout                    | `bg-info`                                                                                                             |
| Persistent panel (sidebar, header) | elevation `1`                                                                                                         |
| Hovered / sticky surface           | elevation `2`                                                                                                         |
| Popover / menu / tooltip           | elevation `3`, `--motion-fast`                                                                                        |
| Modal / sheet / dialog             | elevation `4`, `--motion-slow` entrance                                                                               |
| Hover / focus transition           | `--motion-fast`                                                                                                       |
| State change (toggle, select)      | `--motion-base`                                                                                                       |
| Two-column detail at <1024         | right column collapses below main — do not override                                                                   |
| Inline ID, code, table number      | `text-mono`                                                                                                           |
| Timestamp, label, subtle metadata  | `text-caption text-fg-subtle`                                                                                         |

### Composition & emphasis rules

These are visual-composition rules every screen must follow, regardless of pattern. They exist because emphasis only works when it is scarce.

**Emphasis budget.** Attention is a budget you spend once per scan region.

- **One primary action per view.** A screen (or a card/section) has at most one filled/primary `Button`; everything else is `outline`, `secondary`, or `ghost`. If two things look equally important, neither reads as important.
- **Badges** encode status by semantic color, with a clear primary/secondary split:
  - A record's **primary / lifecycle status** (PO status, SO status) → a **filled semantic** variant (`success` / `warning` / `error` / `info` / `neutral`) — one per row in a list, one in a detail header.
  - **Secondary statuses** (delivery, billing, fulfilment) and dense supporting columns → **`outline-*`** (with status dot).
  - **Tags / labels** ("New", "Returned") → **`subtle-*`**.
  - Reserve **`default`** (brand fill) for non-status emphasis — never the brand color as a routine status. The defect to avoid: making _every_ chip a loud fill, or giving secondary statuses the same weight as the primary one. (Variants: **`components.md`** → `Badge`.)
- **Color:** status colors (`success`/`warning`/`error`/`info`) signal meaning, not decoration — don't tint neutral content.

**Hierarchy.** One `h1` per page (the `Layout.Header` title). Section headings step down (`h2` → `h3`); never skip levels for size — pick the role token (`design-system.md` §4 Typography), not the pixel size.

**States — never ship only the happy path.** Every data-backed screen handles:

- **Loading** — skeleton/placeholder, not a blank flash.
- **Empty** — a labelled empty state (what it is, how to add the first record), not a bare empty table.
- **Error** — an inline error with a retry affordance, not a silent failure.

**Spacing rhythm.** Use the spacing scale (§4) consistently — equal gaps between sibling sections, consistent card padding. A one-off `gap` or `padding` that doesn't match its siblings reads as a mistake.
