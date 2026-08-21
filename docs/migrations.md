---
title: Migrations
description: Breaking changes and required migration steps for AppShell upgrades, newest first
---

# Migrations

Every change that requires you to edit your application before or after upgrading, newest first.

This page is deliberately narrow. It is **not** a changelog — see [`packages/core/CHANGELOG.md`](../packages/core/CHANGELOG.md) for the full release history including features and fixes. A change belongs here only if an app that does nothing will break, misbehave, or silently drift.

Each entry states which versions are affected, what breaks, how to detect it, and what to change. Entries stay here permanently; they are not pruned when they get old, because apps upgrade across arbitrary version gaps.

| Version       | Change                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1.13.0        | [Japanese text renders in Noto Sans JP](#1130-japanese-text-renders-in-noto-sans-jp)                                         |
| 1.12.0        | [`DateField` / `DatePicker` field chrome moved to `Field.Root`](#1120-datefield--datepicker-field-chrome-moved-to-fieldroot) |
| 1.11.0        | [React 19.2.7 and React Router v8 required](#1110-react-1927-and-react-router-v8-are-now-required)                           |
| 1.11.0        | [Non-modal `Sheet` renders no backdrop](#1110-non-modal-sheet-no-longer-renders-a-backdrop)                                  |
| 1.8.0         | [`stream` removed from `useAIChat()`](#180-stream-removed-from-useaichat)                                                    |
| 1.5.0 → 1.7.0 | [Remove the theme bridge workaround](#150--170-remove-the-theme-bridge-workaround)                                           |
| 1.5.0         | [`loader` removed from file-based pages](#150-loader-removed-from-file-based-page-definitions)                               |
| 1.3.0         | [Column inference and badge defaults changed](#130-column-inference-and-badge-defaults-changed)                              |
| 1.0.2         | [`Toaster` no longer accepts `richColors`](#102-toaster-no-longer-accepts-richcolors)                                        |
| before 1.0    | [Pre-1.0 breaking changes](#before-10)                                                                                       |

## 1.13.0: Japanese text renders in Noto Sans JP

**Applies to:** apps rendering Japanese text, and any app whose build size or stylesheet size is
budgeted.

`@tailor-platform/app-shell/styles` now bundles Noto Sans JP Variable alongside Inter. Japanese
text previously drew from the operating system's font — Hiragino Sans on macOS, Yu Gothic UI on
Windows — and now draws from Noto Sans JP on every platform.

This fixes `font-medium` on Windows, where Yu Gothic UI has no 500 weight and `font-weight: 500`
resolved down to Regular, making it invisible in Japanese. Current macOS was not affected (it
ships Hiragino Sans W5). It is a visual change to every existing Japanese screen on both.

**How to detect it.** Japanese runs measure about 6% narrower than before, because the bundled
face is `size-adjust: 94%` to match Inter optically. Narrower text can _relieve_ truncation and
wrapping but cannot cause it, so the risk is under-filled boxes and changed ellipsis positions
rather than overflow. Latin is unaffected — it still resolves to Inter. Line box heights are
unchanged: the face carries ascent/descent overrides matching Inter's.

Check any layout pinned to the old Japanese metrics: fixed-width labels that relied on
truncating, tables whose columns were sized by eye against Hiragino or Yu Gothic, and anything
asserting on rendered width in a snapshot or visual-regression test.

**What it costs.** About 5 MB of woff2 subsets land in your build output even if your app renders
no Japanese, and the stylesheet grows from about 98 KB to 200 KB uncompressed (15 KB to 45 KB
gzipped). Users download only the subsets their content touches — nothing at all with no
Japanese on screen, since the faces are restricted to Japanese codepoint blocks.

**To keep the previous rendering,** or to use a brand font, set `--app-shell-font-sans` and do not
name a Japanese family. Each face carries a `unicode-range`, so nothing is downloaded if nothing
references it (the files still ship in the build output):

```css
@import "@tailor-platform/app-shell/styles";

:root {
  --app-shell-font-sans: "Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

Note the weight scale assumes real 400/500/600/700 faces exist. Opting out restores the original
bug: `font-medium` will again be indistinguishable from body text in Japanese on Windows.

## 1.12.0: `DateField` / `DatePicker` field chrome moved to `Field.Root`

**Applies to:** apps passing `label`, `description`, `errorMessage`, or `hideTimeZone` to `DateField` or `DatePicker`.

The date controls now follow the same composition model as `Field`, `Select`, `Combobox`, and `Autocomplete`. Field chrome (`label`, `description`, `errorMessage`) has moved out of the control and into `Field.Root`. `hideTimeZone` is removed — it was accepted by the prop types but had no effect.

TypeScript will error on the removed props; delete them and compose with `Field.Root` instead.

Before:

```tsx
<DatePicker
  label="Delivery date"
  description="When should we ship your order?"
  minValue={today(getLocalTimeZone())}
  errorMessage={error}
  isInvalid={!!error}
/>
```

After:

```tsx
<Field.Root invalid={!!error}>
  <Field.Label>Delivery date</Field.Label>
  <DatePicker aria-label="Delivery date" minValue={today(getLocalTimeZone())} />
  <Field.Description>When should we ship your order?</Field.Description>
  <Field.Error match={!!error}>{error}</Field.Error>
</Field.Root>
```

`isInvalid` remains a top-level prop for externally-controlled invalid styling. Semantic date props (`isRequired`, `isDisabled`, `isReadOnly`, `minValue`, `maxValue`, `isDateUnavailable`) remain top-level and unchanged. Standalone usage still works with an accessible name:

```tsx
<DateField aria-label="Invoice date" />
```

## 1.11.0: React 19.2.7 and React Router v8 are now required

**Applies to:** every app upgrading to 1.11.0.

The minimum supported `react` and `react-dom` is raised to `19.2.7`, and AppShell moves to React Router v8. React 18 is no longer supported.

Upgrade `react` and `react-dom` to `>=19.2.7` in the same change. If your app imports from `react-router` directly, review the React Router v8 release notes for its own breaking changes — AppShell re-exports a subset (`useNavigate`, `useParams`, `useLocation`, and friends), and those are unaffected.

Note that 1.10.1 deliberately stayed on React Router v7 to pick up its security fixes while avoiding v8. Going 1.10.1 → 1.11.0 therefore crosses a router major.

## 1.11.0: non-modal `Sheet` no longer renders a backdrop

**Applies to:** apps using `<Sheet.Root modal={false}>`.

A non-modal sheet previously still rendered a backdrop, dimming and blocking the page behind it. It now omits the backdrop, which is what `modal={false}` implies. Nothing errors — the page behind simply stays undimmed and interactive.

If you relied on the dimming, drop `modal={false}` and use a modal sheet.

## 1.8.0: `stream` removed from `useAIChat()`

**Applies to:** apps passing `stream` to `useAIChat()`, or constructing an `AIGatewayChatRequest` by hand.

AppShell now selects streaming or JSON transport automatically from the model, so the option is gone. TypeScript errors on the removed property; delete it. There is no replacement.

## 1.5.0 → 1.7.0: remove the theme bridge workaround

**Applies to:** apps that pasted the `@theme inline` block, `@custom-variant dark`, and AppShell's palette into their entry CSS — the workaround for `styles` shipping without the Tailwind bridge.

**`styles` regained the bridge in 1.7.0.** On 1.5.0–1.6.1 the workaround is load-bearing, so upgrade to 1.7.0 or later _before_ deleting any of it. Remove it earlier and every AppShell-token utility — `bg-card`, `bg-background`, `text-muted-foreground`, `border-border` — stops resolving, while `dark:` variants fall back to Tailwind's `prefers-color-scheme` default and stop tracking the `.dark` class.

From 1.7.0 the workaround is not merely redundant. It actively breaks dark mode, and the build succeeds with no warning:

- Your pasted `:root` and `.dark` blocks are unlayered, so they beat AppShell's layered default palette. Colours freeze at the values you copied, and any surface AppShell has added since has no dark value at all — so it renders light colours in dark mode: white text on white cards, unreadable disabled inputs.
- `@custom-variant dark (&:is(.dark *))` overrides AppShell's `&:where(.dark, .dark *)`. The `:is(.dark *)` form matches only _descendants_ of `.dark`, so `dark:` utilities stop applying to the `.dark` element itself.

### Removing it

Delete from your entry CSS:

- the `@theme inline { … }` block,
- the `@custom-variant dark (…)` rule,
- every `:root` and `.dark` block copied from AppShell's palette — **all** of it, including the `*-foreground` pairs, `--status-*`, `--alert-*`, `--sidebar-*` and `--semantic-shadow-*`. The foregrounds are what leave text white on white, so a partial deletion reproduces the bug.
- any `@import "@tailor-platform/app-shell/theme.css"` (a no-op shim since 1.6.0, kept only so older apps keep building).

To find it, search every CSS file the app loads — not just the entry point, since `app/` and `styles/` are as common as `src/`:

```bash
grep -rnE "@theme inline|@custom-variant|app-shell/theme\.css|--(card|popover|muted|sidebar|destructive|accent)(-foreground)?:" --include="*.css" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next .
```

Excluding `node_modules` matters: AppShell's own palette files declare these tokens too, and they must not be touched. In your own CSS, hits are either the workaround, which goes, or deliberate overrides, which should take the `:root` / `:root.dark` form described in [Overriding tokens](./concepts/styling-theming.md#overriding-tokens).

What remains is short — [`examples/vite-app/src/index.css`](https://github.com/tailor-platform/app-shell/blob/main/examples/vite-app/src/index.css) is a working reference for the shape (it also imports a branded palette, which is optional):

```css
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";

html,
body {
  margin: 0;
  padding: 0;
}
```

### Verifying

Toggle dark mode and confirm a real surface changes: inspect a `Card` and watch its computed `background-color` go from `rgb(255, 255, 255)` to `rgb(23, 23, 23)` on the default palette.

Reading the token directly also works — `getComputedStyle(document.documentElement).getPropertyValue("--card")` returns the winning declaration, so a stale copy shows up as its own value. Just compare against the authored notation: AppShell writes `rgba(23, 23, 23, 1)`, not `#171717`, and the computed value preserves that form.

## 1.5.0: `loader` removed from file-based page definitions

**Applies to:** file-based routing apps that set `loader` in `Page.appShellPageProps`.

`loader` was an incomplete API exposed by accident, and `guards` is now the single source of page-level route behaviour. Move any access checks into a guard, and any data loading into the page component or your data layer.

## 1.3.0: column inference and badge defaults changed

**Applies to:** apps using `inferColumns()`, or `DataTable`'s status badges.

Two changes that alter rendering without any error:

- `inferColumns()` no longer sets a default `render`. A column with neither an explicit `type` nor `render` now displays `—` for null and empty values, matching typed-column behaviour.
- Badge variant resolution moved into a shared helper whose default is `outline-neutral`. `DataTable` previously defaulted to `neutral`, so unstyled status badges change appearance.

Set `type` or `render` explicitly on any column whose previous rendering you want back, and pass an explicit variant where the old badge styling mattered. `BadgeVariantType` is deprecated in favour of `BadgeVariant`.

## 1.0.2: `Toaster` no longer accepts `richColors`

**Applies to:** apps passing `richColors` to `<Toaster>`.

The prop is removed, and toasts no longer colour-code the success, error, warning, and info variants. TypeScript errors on the prop; delete it.

## Before 1.0

Pre-1.0 releases changed the public API often, mostly around authentication and routing. If you are upgrading from a 0.x version, work through these in order — several supersede each other, so applying them out of sequence will not land you in the right place.

Each is summarised here; [`packages/core/CHANGELOG.md`](../packages/core/CHANGELOG.md) carries the full before/after code for every one.

| Version | Change                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.33.0  | `AsyncFetcherFn` receives `string \| null` instead of `string`. It is called with `null` when the user has typed nothing — return initial items, or an empty array to show nothing until they type.                                                                                                                                                                                |
| 0.28.0  | `EnhancedAuthClient.getAuthHeadersForQuery()` removed. Pass `fetch: authClient.fetch` to your GraphQL client instead; it handles DPoP proofs and token refresh transparently.                                                                                                                                                                                                      |
| 0.27.0  | Module-level `guards` and `loaders` no longer cascade to child resources — declare them on each resource or page. A module without a `component` no longer auto-redirects to its first visible resource and must declare `guards`, or it throws at runtime.                                                                                                                        |
| 0.26.0  | Authentication moved to `@tailor-platform/auth-public-client` with DPoP. `AuthProvider` requires a `client` from `createAuthClient`, `apiEndpoint` is gone, `useAuth` returns its fields directly rather than under `authState`, and built-in user fetching (`meQuery`, `AuthState.user`, `DefaultUser`, `AuthRegister`) is removed — fetch the user with your own GraphQL client. |
| 0.24.0  | `accessControl` replaced by the `guards` array on `defineModule`/`defineResource`. `RedirectConfig` and `redirectToResource` removed — use `guards` with `redirectTo()`.                                                                                                                                                                                                           |
| 0.19.0  | `BuiltinIdPAuthProvider` → `AuthProvider`, `useBuiltinIdpAuth` → `useAuth`. The `buildAuthorizationUrl`, `exchangeCodeForToken`, `prepareLogin`, and `handleOAuthCallback` utilities are no longer exported.                                                                                                                                                                       |
| 0.13.0  | `defaultResourceRedirectPath` removed from `defineModule` in favour of a `redirectToResource` helper — which 0.24.0 then removed in turn. Coming from 0.13.0 or earlier, go straight to the 0.24.0 form: `guards` with `redirectTo()`.                                                                                                                                             |
| 0.4.0   | `meta.title` no longer renders the page title automatically. The title is passed to the resource component via props (`ResourceComponentProps`); render it yourself.                                                                                                                                                                                                               |
