---
kind: prose
group: migrations
title: Migrations
description: Breaking changes and required migration steps for AppShell upgrades, newest first
---

# Migrations

Every change that requires you to edit your application before or after upgrading, newest first.

This page is deliberately narrow. It is **not** a changelog — see [`packages/core/CHANGELOG.md`](../packages/core/CHANGELOG.md) for the full release history including features and fixes. A change belongs here only if an app that does nothing will break, misbehave, or silently drift.

Each entry states which versions are affected, what breaks, how to detect it, and what to change. Entries stay here permanently; they are not pruned when they get old, because apps upgrade across arbitrary version gaps.

| Version       | Change                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1.18.0        | [Destructive colours now resolve to the danger roles](#1180-destructive-colours-now-resolve-to-the-danger-roles)             |
| 1.17.0        | [Status and alert tokens now resolve to the colour roles](#1170-status-and-alert-tokens-now-resolve-to-the-colour-roles)     |
| 1.15.0        | [Base UI 1.8.0 breaks closed-`Select` and dialog-click tests](#1150-base-ui-180-breaks-closed-select-and-dialog-click-tests) |
| 1.12.0        | [`DateField` / `DatePicker` field chrome moved to `Field.Root`](#1120-datefield--datepicker-field-chrome-moved-to-fieldroot) |
| 1.11.0        | [React 19.2.7 and React Router v8 required](#1110-react-1927-and-react-router-v8-are-now-required)                           |
| 1.11.0        | [Non-modal `Sheet` renders no backdrop](#1110-non-modal-sheet-no-longer-renders-a-backdrop)                                  |
| 1.8.0         | [`stream` removed from `useAIChat()`](#180-stream-removed-from-useaichat)                                                    |
| 1.5.0 → 1.7.0 | [Remove the theme bridge workaround](#150--170-remove-the-theme-bridge-workaround)                                           |
| 1.5.0         | [`loader` removed from file-based pages](#150-loader-removed-from-file-based-page-definitions)                               |
| 1.3.0         | [Column inference and badge defaults changed](#130-column-inference-and-badge-defaults-changed)                              |
| 1.0.2         | [`Toaster` no longer accepts `richColors`](#102-toaster-no-longer-accepts-richcolors)                                        |
| before 1.0    | [Pre-1.0 breaking changes](#before-10)                                                                                       |

## 1.18.0: destructive colours now resolve to the danger roles

**Applies to:** apps that show `Button variant="destructive"` in dark mode, apps that use `text-destructive`, `border-destructive` or `bg-destructive` on their own elements, and apps whose theme overrides `--destructive` or `--destructive-foreground`.

1.18.0 makes `--destructive` and `--destructive-foreground` aliases of `--danger-solid` and `--danger-contrast`. The names, `Button variant="destructive"` and `text-destructive` keep working and are not deprecated. Nothing errors. Three things change silently:

- **Dark-mode `Button variant="destructive"` is a full `#dc2626` fill.** It was `#f87171` at 60% opacity. The text is `--danger-contrast` (white) and the hover fill is `--danger-solid-hover` instead of 90% opacity. Light mode keeps `#dc2626`.
- **`text-destructive` resolves to the solid.** In dark mode it changes from `#f87171` to `#dc2626`, which is 3.71:1 on the dark card, below 4.5:1 for text. Components shipped with AppShell now use `text-danger-text` for error text, and invalid borders and focus rings read `--danger-solid`. In dark mode the invalid border changes from `#f87171` to `#dc2626`.
- **Themes that override `--destructive` no longer reach the components.** `Button`, invalid `Input`, `Textarea`, `Checkbox`, `Field` and `DateField` borders and rings, error text and the `CsvImporter` error cells read `--danger-*`. An override of `--destructive` still changes `bg-destructive` and `text-destructive` on your own elements, so the two reds can drift apart. The `cream` and `bloom` palettes no longer set `--destructive`; their values were the same as the default.

How to detect it: search the app for `destructive` in class names and in theme CSS, including Theme Generator output that sets `--destructive`. Compare `Button variant="destructive"`, an invalid `Input` and an error message in light and dark mode after upgrading.

What to change:

- For text, replace `text-destructive` with `text-danger-text`. `text-destructive` still works; use it only where the solid colour is intended.
- For tints and borders, use `bg-danger-surface` and `border-danger-border` instead of `bg-destructive/10` and `border-destructive/30`.
- In a theme that recolours destructive actions, set `--danger-solid` (and `--danger-solid-hover`, `--danger-text`, `--danger-contrast` as needed) instead of `--destructive`. Remove `--destructive` and `--destructive-foreground` from the theme.

The roles are documented in [Styling & theming](./concepts/styling-theming.md#brand--action). The decision record is `decisions/semantic-color-roles.md`.

## 1.17.0: status and alert tokens now resolve to the colour roles

**Applies to:** apps that use `bg-status-*`, `text-status-*` or `bg-alert-*` utilities, and apps whose theme overrides `--status-*`, `--alert-*` or `--destructive` to recolour `Badge`, `Alert`, `CsvImporter` or `MetricCard`.

1.17.0 adds semantic colour roles, `--{info|success|warning|danger|neutral}-{surface|surface-hover|border|solid|solid-hover|text|contrast|indicator}`, bridged as Tailwind colours such as `bg-success-surface` and `text-danger-text`. The old `--status-*` and `--alert-*` tokens still exist and still work, but they no longer hold their own colours: each one now resolves to a role (for example `--status-completed` is `var(--success-solid)`). They are deprecated and will be removed in the next major. Nothing errors. Three things change silently:

- **Colours change.** `bg-status-*` and `bg-alert-*` resolve to the role values. For example `bg-status-completed` is `#15803d` instead of `#22c55e`. `--status-default` follows `--muted-foreground` instead of a fixed `#737373`.
- **Component recolouring moves to the roles.** `Badge`, `Alert`, `CsvImporter` and `MetricCard` read the roles directly. A theme that overrides `--status-*` or `--alert-*` no longer changes these components; override `--{intent}-*` instead. `Badge` `error` / `subtle-error` and `Alert` `error` read `--danger-*`, so overriding `--destructive` no longer reaches them either. `Button variant="destructive"` and `text-destructive` still follow `--destructive`.
- **`text-status-*` loses contrast in dark mode.** The `--status-*` values are now the step-9 fills, which are below 4.5:1 as text on the dark card.

How to detect it: search the app for `status-`, `alert-` and theme overrides of `--status-`, `--alert-` and `--destructive`. Compare `Badge` and `Alert` in light and dark mode after upgrading.

What to change:

- Replace `text-status-completed` with `text-success-text`, `text-status-attention` with `text-warning-text`, `text-status-danger` with `text-danger-text`, and `text-status-neutral` with `text-info-text`.
- Replace `bg-status-completed/10 border-status-completed/30` style tints with `bg-success-surface border-success-border`. The same applies to the other intents and to `bg-alert-*` / `border-alert-*`.
- In a theme that recolours the status components, set the roles (`--success-solid`, `--danger-text`, ...) instead of `--status-*`, `--alert-*` or `--destructive`.

The roles are documented in [Styling & theming](./concepts/styling-theming.md#semantic-color-roles). The decision record is `decisions/semantic-color-roles.md`.

## 1.15.0: Base UI 1.8.0 breaks closed-`Select` and dialog-click tests

**Applies to:** apps with unit tests that assert `Select` options without opening the `Select`, and apps with Playwright tests that click buttons inside a `Dialog` or `AlertDialog`.

1.15.0 updates the bundled `@base-ui/react` from 1.6.0 to 1.8.0 (1.12.0 to 1.14.0 used 1.6.0). The AppShell API is unchanged and the app behaves the same for the people using it. Two upstream behaviour changes do break tests that relied on the old behaviour, so an app that changes nothing can still go red in CI after upgrading. The fix is in the tests, not the app.

### `Select` options are not in the DOM until it opens

A closed `Select` used to render its options into the DOM. It no longer does, so a test that asserts option text with `getByText` on a closed `Select` fails with "Unable to find an element".

Open the `Select` first, then wait for the option:

```tsx
await userEvent.click(screen.getByRole("combobox", { name: "Auto Renewal Period" }));
expect(await screen.findByText("1 Month")).toBeInTheDocument();
```

### Dialog scroll lock can move a button under a Playwright click

Opening a `Dialog` or `AlertDialog` applies a scroll lock that shifts the layout slightly. Playwright can judge a button stable and then click where it used to be, so the click lands on the backdrop and closes the dialog. The test then times out waiting for the dialog, and the Playwright call log shows the click being retried after "element was detached from the DOM".

Press the button instead of clicking it. `press` does not use coordinates, so the layout shift cannot affect it:

```ts
const confirm = page.getByRole("alertdialog").getByRole("button", { name: "Delete" });
await expect(confirm).toBeVisible();
await confirm.press("Enter");
```

Do not reach for `click({ force: true })`. It only skips Playwright's stability check, and the click can still miss.

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

What remains is short — [`examples/vite-app/src/index.css`](../examples/vite-app/src/index.css) is a working reference for the shape (it also imports a branded palette, which is optional):

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
