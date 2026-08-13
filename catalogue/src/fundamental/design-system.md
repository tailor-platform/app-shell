# Design System

Authority for **visual-only** decisions — tokens, theme imports, breakpoints intent, the `astw:` prefix, and custom-component conformance. For **React component APIs** (imports, props, JSX composition), pair this file with `components.md`; that split avoids duplicating tables and lengthy examples across both docs.

`@tailor-platform/app-shell` ships an opinionated design system as CSS variables, bridged into Tailwind v4's token namespace. Use it whether you are consuming AppShell components (most cases) or building a custom component to fill a gap.

**The tokens are the rails.** Consistency across customers, apps, and AI runs comes from the token system, not from rules written in prose. A hand-typed `#fff` or `padding: 13px` is not a "small deviation" — it is the mechanism by which consistency dies.

**Every token in this file is verified against the shipped CSS.** If a token is not listed here, assume it does not exist. Inventing a plausible-sounding token (`bg-surface-1`, `text-fg-muted`, `--space-4`) is the worst failure mode available to you: Tailwind emits **no CSS at all** for an unknown utility, so the class is silently dropped and the element renders unstyled. There is no error, no warning, and nothing in the console. When unsure, read `node_modules/@tailor-platform/app-shell/dist/themes/default.css` — it is the ground truth.

## 1. Setup

The app's CSS entrypoint (`index.css` / `globals.css`) needs exactly this:

```css
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";

/* Optional: at most one palette override, imported AFTER styles */
@import "@tailor-platform/app-shell/themes/bloom";
```

- **`tailwindcss`** — your app's own Tailwind build, which generates the utilities you write in your components.
- **`@tailor-platform/app-shell/styles`** — the single required import. It pulls in both the design tokens (the `@theme inline` bridge, so `bg-background` / `text-muted-foreground` resolve in _your_ Tailwind build) and AppShell's precompiled component CSS.
- **`@tailor-platform/app-shell/themes/*`** — optional palette overrides (`default`, `cream`, `bloom`). Import at most one, after `styles`. Palette selection is by CSS import; there is no runtime palette prop.

**Do not import `@tailor-platform/app-shell/theme.css`.** That export is a deprecated no-op shim, kept only so older apps keep building. It emits nothing. Older docs also referred to `app-shell.css`; prefer `styles`.

Tailwind v4 stays CSS-first; minimal `vite` / PostCSS wiring is in `project-setup.md`.

## 2. Theming via CSS variables

Tokens exist in two layers, and knowing which one you are touching matters:

1. **Raw CSS variables** (`--background`, `--primary`, `--radius`) — defined on `:root` in `themes/*.css`. These are what you **override**.
2. **The Tailwind bridge** (`@theme inline` in `theme.bridge.css`) — maps each raw variable into Tailwind's namespace (`--background` → `--color-background`), which is what makes `bg-background` a real utility. You do **not** edit this layer.

Override raw variables in `:root` (global) or a scoped selector, after the `styles` import:

```css
:root {
  --primary: #3b82f6;
  --background: #ffffff;
}

.dark {
  --background: #0a0a0a;
  --foreground: #fafafa;
}
```

Override at the highest scope where the change applies. Do not duplicate token values across files — change them at the source.

**Dark mode is a `.dark` class on `<html>`**, not a data attribute. AppShell's theme provider toggles `document.documentElement.classList` between `light` and `dark` and persists the choice under the `appshell-ui-theme` localStorage key; the bundled `AppearanceSwitcher` component drives it. The bridge registers `@custom-variant dark (&:where(.dark, .dark *))`, so the `dark:` variant works in your own markup.

AppShell primitives respond to dark mode automatically. Custom components inherit it for free as long as they reference tokens (`bg-card`, `text-muted-foreground`) and never inline literal colors.

## 3. Component styling with data attributes

AppShell's UI components support data-attribute-based styling, following the [Base UI data attributes](https://base-ui.com/react/handbook/styling#data-attributes) convention. Components expose `data-*` attributes that reflect their internal state, enabling CSS-only style control without JavaScript:

```css
/* Style a component based on its state */
.SwitchThumb[data-checked] {
  background-color: var(--status-completed);
}

.MenuItem[data-highlighted] {
  background-color: var(--accent);
  color: var(--accent-foreground);
}
```

This works with Tailwind as well — **use theme tokens**, not raw Tailwind grays:

```tsx
<Switch.Thumb className="bg-muted data-[checked]:bg-primary" />
```

Check each component's API reference (`components.md`) for the data attributes it exposes. Custom components must follow the same convention (see Section 6).

## 4. Tokens

Everything below is verified present in the shipped CSS. **Use the token, never hand-type the value.** A hex literal or magic px in a PR is a review failure.

### Color

Colors follow shadcn-style semantic naming: a surface token and its matching `-foreground` pair. Pick by **intent**, not by visual taste. Pair a background with its own foreground — `bg-card` goes with `text-card-foreground`.

#### Surface & chrome

| Token                                | Use                           | Tailwind                                 |
| ------------------------------------ | ----------------------------- | ---------------------------------------- |
| `--background` / `--foreground`      | page background, default text | `bg-background` / `text-foreground`      |
| `--card` / `--card-foreground`       | card and panel surfaces       | `bg-card` / `text-card-foreground`       |
| `--popover` / `--popover-foreground` | menus, popovers, tooltips     | `bg-popover` / `text-popover-foreground` |
| `--muted` / `--muted-foreground`     | subtle fills; secondary text  | `bg-muted` / `text-muted-foreground`     |
| `--border`                           | hairlines, dividers           | `border-border`                          |
| `--input`                            | form control borders          | `border-input`                           |
| `--ring`                             | focus rings                   | `ring-ring` / `outline-ring`             |

Surfaces are named by **role**, not by depth — there is no numbered `surface-1/2/3` ladder, and no third tier of body text below `muted-foreground`. Stack depth with `background` → `card` → `muted` plus a border or shadow, and reach for `popover` when the surface actually floats.

#### Brand & action

| Token                                        | Use                              | Tailwind                                     |
| -------------------------------------------- | -------------------------------- | -------------------------------------------- |
| `--primary` / `--primary-foreground`         | primary buttons, emphasis        | `bg-primary` / `text-primary-foreground`     |
| `--secondary` / `--secondary-foreground`     | secondary buttons, neutral chips | `bg-secondary` / `text-secondary-foreground` |
| `--accent` / `--accent-foreground`           | hover and selected nav states    | `bg-accent` / `text-accent-foreground`       |
| `--destructive` / `--destructive-foreground` | destructive actions, errors      | `bg-destructive` / `text-destructive`        |

There are no `-hover` or `-active` brand tokens. Express interaction states with Tailwind variants and opacity — `hover:bg-primary/90`, `active:bg-primary/80` — which is what AppShell's own components do.

#### Status

Five status colors, used for badge fills and status dots:

| Token                | Use                      | Tailwind              |
| -------------------- | ------------------------ | --------------------- |
| `--status-default`   | none / not applicable    | `bg-status-default`   |
| `--status-neutral`   | informational            | `bg-status-neutral`   |
| `--status-completed` | success, completed       | `bg-status-completed` |
| `--status-attention` | warning, needs attention | `bg-status-attention` |
| `--status-danger`    | error, blocked           | `bg-status-danger`    |

Prefer `Badge` with a semantic variant (`success`, `warning`, `error`, `info`, `neutral`) over applying these directly — the variants already pair fill and foreground correctly. Reach for the raw token only on custom surfaces.

#### Sidebar & charts

`--sidebar`, `--sidebar-foreground`, `--sidebar-border`, `--sidebar-primary(-foreground)`, `--sidebar-accent(-foreground)`, `--sidebar-ring` → `bg-sidebar`, `text-sidebar-foreground`, and so on. These let a palette tint the shell independently of page content.

`--chart-1` … `--chart-5` → `bg-chart-1`, `text-chart-1`, `fill-chart-1`. Use them in order for categorical series.

#### Alerts — variables only, no utilities

`--alert-{neutral,success,warning,error,info}-{background,foreground,foreground-muted,border}` exist as raw CSS variables but are **deliberately not in the Tailwind bridge**. `bg-alert-success-background` is not a class and will emit nothing.

Use the `Alert` component. If you genuinely need these on a custom surface, reference them directly:

```tsx
<div style={{ borderColor: "var(--alert-warning-border)" }} />
```

```tsx
// Good — semantic token pairs, and a variant where one exists
<div className="bg-card text-card-foreground">…</div>
<Button variant="destructive">Delete</Button>
<Badge variant="warning">Pending review</Badge>

// Bad — raw colors bypass the theme
<div style={{ background: "#fff", color: "#111" }}>…</div>

// Bad — these classes do not exist and render as nothing at all
<div className="bg-surface-1 text-fg-muted">…</div>
```

### Spacing

**AppShell defines no spacing tokens.** Use Tailwind's default 4px-based scale (`p-4`, `gap-2`, `mt-8`) — the same scale AppShell's own components use internally. There is no `--space-*` variable.

```tsx
// Good — scale step
<div className="flex gap-3 p-4">…</div>

// Bad — magic value
<div className="p-[13px]">…</div>
```

Hand-typing `padding: 13px` is a smell. Round to the nearest scale step; if nothing fits, the layout is wrong, not the scale.

### Typography

**AppShell defines no typography scale tokens.** There is no `text-h1`, `text-body`, or `text-caption`. The only typography token is `--font-sans` (Inter Variable) → `font-sans`, which the base layer already applies to `body`.

Compose roles from stock Tailwind utilities. These pairings are what AppShell's own components use — match them so your screens sit consistently alongside the primitives:

| Role                              | Utilities                                 |
| --------------------------------- | ----------------------------------------- |
| Page title (`Layout.Header`)      | `text-2xl font-bold tracking-tight`       |
| Section heading                   | `text-lg font-semibold`                   |
| Card title                        | `text-lg font-semibold leading-none`      |
| Body copy                         | `text-sm`                                 |
| Secondary copy, descriptions      | `text-sm text-muted-foreground`           |
| Caption, timestamp, metadata      | `text-xs text-muted-foreground`           |
| Numeric value in a table or field | `text-sm font-medium tabular-nums`        |
| ID, code, keyboard hint           | `font-mono text-xs text-muted-foreground` |

```tsx
<h2 className="text-lg font-semibold">Section</h2>
<p className="text-sm text-muted-foreground">Description copy</p>
<span className="text-xs text-muted-foreground">Updated 2h ago</span>
```

Always use `tabular-nums` for numbers that stack in a column — without it, digits jitter between rows.

### Radius

`--radius` (`0.625rem`) is the base; the bridge derives four steps from it. Pick by component role — a card is always `md`, regardless of its size on screen.

| Token         | Value          | Use                 | Tailwind     |
| ------------- | -------------- | ------------------- | ------------ |
| `--radius-sm` | `radius − 4px` | inputs, small chips | `rounded-sm` |
| `--radius-md` | `radius − 2px` | buttons, cards      | `rounded-md` |
| `--radius-lg` | `radius`       | modals, sheets      | `rounded-lg` |
| `--radius-xl` | `radius + 4px` | large surfaces      | `rounded-xl` |

`rounded-full` (pills, avatars) is a stock Tailwind utility — there is no `--radius-full` token, but the class works.

Changing `--radius` alone rescales all four steps together.

### Shadow

Four mode-aware shadows. There are **no `--elevation-*` tokens**; the scale is expressed as shadows. Never hand-craft a `box-shadow`.

| Token                  | Bridged to  | Use                               |
| ---------------------- | ----------- | --------------------------------- |
| `--semantic-shadow-xs` | `shadow-xs` | hairline lift, active nav item    |
| `--semantic-shadow-sm` | `shadow-sm` | cards, persistent panels          |
| `--semantic-shadow-md` | `shadow-md` | popovers, menus, hovered surfaces |
| `--semantic-shadow-lg` | `shadow-lg` | modals, dialogs, sheets           |

Higher shadow reads as "more transient" — match it to the component's lifetime. Each token carries a different value in dark mode, so using the token (rather than a literal) is what keeps depth legible on both backgrounds.

### Motion

**AppShell defines no motion tokens.** There is no `--motion-fast` or `--ease-out` variable. Use Tailwind's `duration-*` and `ease-*` utilities. AppShell uses `tw-animate-css` internally for its own enter/exit animations, but those classes are prefixed and are not available to your app — add `@import "tw-animate-css";` to your own entrypoint if you want them.

| Intent                        | Utilities                  |
| ----------------------------- | -------------------------- |
| Hover, focus, button press    | `duration-150 ease-out`    |
| State change (toggle, select) | `duration-200 ease-in-out` |
| Entrance, dialog open         | `duration-300 ease-out`    |

```tsx
<div className="transition-colors duration-150 ease-out motion-reduce:transition-none" />
```

Always give motion a reduced-motion escape (`motion-reduce:transition-none`, or a `@media (prefers-reduced-motion: reduce)` block in CSS). AppShell components handle this internally; custom components must do the same.

### Z-index

These exist as raw `:root` variables in the shipped base layer, but are **not** bridged into Tailwind — `z-sidebar` is not a class. Use the stock numeric utility, or reference the variable when you need it to track AppShell's layering:

| Token              | Value | Use                           |
| ------------------ | ----- | ----------------------------- |
| `--z-sidebar`      | 10    | persistent sidebar            |
| `--z-sidebar-rail` | 20    | sidebar collapsed rail        |
| `--z-popup`        | 50    | menu, tooltip, popover        |
| `--z-overlay`      | 50    | modal, sheet, dialog backdrop |

```tsx
<div className="z-50" />
<div className="z-[var(--z-popup)]" />
```

Never invent a z value — `z-index: 9999` is always wrong. Popups and overlays share `50` intentionally: sequencing comes from DOM order, not z escalation.

### Icons

**AppShell exports no `Icon` component and defines no `--icon-*` tokens.** Icons come from [`lucide-react`](https://lucide.dev), which AppShell already depends on. Size them with Tailwind, pairing icon size to the adjacent text:

| Text size          | Icon class |
| ------------------ | ---------- |
| `text-xs`          | `size-3`   |
| `text-sm`          | `size-4`   |
| `text-lg`          | `size-5`   |
| `text-2xl` (title) | `size-6`   |

```tsx
import { Check } from "lucide-react";

<Check className="size-4" />;
```

### Breakpoints

Stock Tailwind breakpoints — AppShell does not change them.

| Token | Width  |
| ----- | ------ |
| `sm`  | 640px  |
| `md`  | 768px  |
| `lg`  | 1024px |
| `xl`  | 1280px |
| `2xl` | 1536px |

**ERP target is `xl`/`2xl` desktop.** Pages should be designed for those widths first; smaller breakpoints exist for graceful degradation, not parity. Don't waste effort on mobile-first composition unless a screen explicitly calls for it. A list page that collapses gracefully at `md` is fine; a list page redesigned for `sm` is over-investment.

Two-column **behavior** (right rail stacks under `lg`): respect AppShell defaults — do not force side-by-side grids on narrow viewports. The `Layout` column width table lives in `components.md` → Layout; reuse those numbers instead of guessing rem values here.

## 5. The `astw:` prefix

AppShell exposes **layout / sizing / overflow** escapes on some components via props like `containerClassName` and `className` on roots. Prefix those utilities with `astw:` so they apply to the wrapper AppShell controls.

**Do not duplicate full component trees here.** Typical patterns (full `DataTable` composition, `Sheet` + footer, `Table.Root` + card insets) live in `components.md` with JSX you can copy.

Minimal illustration — the same rules apply to other `*ClassName` hooks:

```tsx
<Table.Root containerClassName="astw:px-6 astw:overflow-y-auto" />
```

Rules:

- `astw:` only on AppShell `*ClassName` / root `className` hooks each component exposes. Use **plain** Tailwind (`flex`, `gap-4`, `bg-background`, …) on **your** markup.
- Stick to **layout** utilities (`flex`, `grid`, `max-h-*`, `min-h-0`, `overflow-*`, widths). Avoid painting over internal AppShell padding or colors via `astw:` — prefer an upstream prop or composition change.
- Steps like `astw:p-4` still resolve through the scale — never arbitrary `astw:p-[13px]`.

## 6. When AppShell doesn't have a component you need

Most ERP screens compose entirely from AppShell primitives. When you hit a gap, work through this decision tree before building anything:

### Decision tree

1. **Can you compose existing AppShell primitives?** A "card with a metric and a trend arrow" is `MetricCard`, or `Card` plus a lucide icon — not a new component. Compose first, and check `components.md` for what already exists before concluding there is a gap.
2. **If composition won't work, is the behavior one-off?** Build it locally under `src/components/<name>/` and flag it for the `build-component` skill, which promotes useful customs into AppShell upstream.
3. **If it's already proven reusable across 2+ apps**, skip local entirely — use the `build-component` skill to add it to AppShell directly.

### Conformance rules (non-negotiable for any custom component)

- **Tokens only.** No hex literals, no magic px values, no hand-rolled shadows. Every visual property maps to a token from Section 4 — and only to a token that actually exists there.
- **Base UI data-attribute pattern for state.** Expose `data-*` attributes that reflect internal state; never style off React props alone. A custom toggle exposes `data-checked`; a custom step indicator exposes `data-active`, `data-completed`, etc.
- **Compose AppShell primitives inside.** If the custom needs a button, use `Button` — not raw `<button>`. Same for `Input`, `Badge`, `Card`. The custom's job is composition, not reinvention.
- **Document with a `README.md`** in the component folder listing: purpose, props, tokens used, and a brief justification for why this can't be composed from existing AppShell primitives.
- **Match accessibility behavior** of the closest AppShell equivalent — focus management, ARIA roles/attributes, keyboard interactions. Reach for Base UI primitives if the behavior is non-trivial.

Example skeleton for a local custom component:

```tsx
// src/components/StepIndicator/index.tsx
import { Check } from "lucide-react";

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
            flex items-center gap-2 rounded-md px-3 py-2
            bg-muted text-sm text-muted-foreground
            data-[active]:bg-primary data-[active]:text-primary-foreground
            data-[completed]:text-status-completed
          "
        >
          {i < current && <Check className="size-4" />}
          {label}
        </li>
      ))}
    </ol>
  );
}
```

Notice: every value is a real token, `data-*` attributes carry state, no hex literals, and the icon comes from `lucide-react` rather than a nonexistent `Icon` component.

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

| Intent                             | Pick                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Destructive action (delete, void)  | `Button variant="destructive"`; `bg-destructive` on custom surfaces; confirm in a dialog at `shadow-lg` |
| Non-blocking caution               | `Badge variant="warning"`, or `bg-status-attention`                                                     |
| Confirmation / completed state     | `Badge variant="success"`, or `bg-status-completed`                                                     |
| Neutral callout                    | `Badge variant="info"`, or the `Alert` component                                                        |
| Persistent panel (sidebar, header) | `shadow-sm`                                                                                             |
| Hovered / sticky surface           | `shadow-md`                                                                                             |
| Popover / menu / tooltip           | `bg-popover`, `shadow-md`, `duration-150`                                                               |
| Modal / sheet / dialog             | `shadow-lg`, `duration-300` entrance                                                                    |
| Hover / focus transition           | `duration-150 ease-out`                                                                                 |
| State change (toggle, select)      | `duration-200 ease-in-out`                                                                              |
| Two-column detail at <1024         | right column collapses below main — do not override                                                     |
| Inline ID, code, table number      | `font-mono text-xs` (identifiers) / `tabular-nums` (figures)                                            |
| Timestamp, label, subtle metadata  | `text-xs text-muted-foreground`                                                                         |

### Composition & emphasis rules

These are visual-composition rules every screen must follow, regardless of pattern. They exist because emphasis only works when it is scarce.

**Emphasis budget.** Attention is a budget you spend once per scan region.

- **One primary action per view.** A screen (or a card/section) has at most one filled/primary `Button`; everything else is `outline`, `secondary`, or `ghost`. If two things look equally important, neither reads as important.
- **Badges** encode status by semantic color, with a clear primary/secondary split:
  - A record's **primary / lifecycle status** (PO status, SO status) → a **filled semantic** variant (`success` / `warning` / `error` / `info` / `neutral`) — one per row in a list, one in a detail header.
  - **Secondary statuses** (delivery, billing, fulfilment) and dense supporting columns → **`outline-*`** (with status dot).
  - **Tags / labels** ("New", "Returned") → **`subtle-*`**.
  - Reserve **`default`** (brand fill) for non-status emphasis — never the brand color as a routine status. The defect to avoid: making _every_ chip a loud fill, or giving secondary statuses the same weight as the primary one. (Variants: **`components.md`** → `Badge`.)
- **Color:** status colors signal meaning, not decoration — don't tint neutral content.

**Hierarchy.** One `h1` per page (the `Layout.Header` title). Section headings step down in weight and size; never skip levels for size — pick the role from §4 Typography, not the pixel size.

**States — never ship only the happy path.** Every data-backed screen handles:

- **Loading** — skeleton/placeholder, not a blank flash.
- **Empty** — a labelled empty state (what it is, how to add the first record), not a bare empty table.
- **Error** — an inline error with a retry affordance, not a silent failure.

**Spacing rhythm.** Use the spacing scale (§4) consistently — equal gaps between sibling sections, consistent card padding. A one-off `gap` or `padding` that doesn't match its siblings reads as a mistake.
