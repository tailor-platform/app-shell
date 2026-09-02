# @tailor-platform/app-shell

## 1.13.0

### Minor Changes

- 41ae0e3: Add `filter.operators` on DataTable columns to narrow which conditions the built-in filter UI exposes.
  
  ```tsx
  column({
    label: "Customer",
    filter: { field: "customer", type: "string", operators: ["contains", "eq"] },
  });
  ```
  
  `inferColumns()` now also accepts `filter: { operators: [...] }` so metadata-derived columns can use the same restriction.
- fdf7e6a: Bundle Noto Sans JP so `font-medium` is a real weight in Japanese text.
  
  Inter carries no CJK glyphs, so Japanese fell through to the system font. On Windows that is Yu Gothic UI, which ships only Light/Semilight/Regular/Semibold/Bold — no 500 — so CSS weight matching resolved `font-weight: 500` down to Regular and `font-medium`, the weight behind most labels, table cells and card titles, was indistinguishable from body copy. Current macOS was unaffected, since it ships Hiragino Sans W5. Bundling a variable font makes the weight scale hold on every platform instead of depending on what the OS installs.
  
  `@tailor-platform/app-shell/styles` now ships Noto Sans JP Variable (continuous 100–900 axis) alongside Inter, metric-harmonised against it so mixed Japanese/Latin strings read at one optical size and a line containing Japanese is exactly as tall as one without. No import change is needed.
  
  **This changes how Japanese text renders.** Japanese previously drew from the OS font (Hiragino Sans on macOS, Yu Gothic UI on Windows) and now draws from Noto Sans JP. Japanese runs measure about 6% narrower, which can relieve truncation and wrapping but not cause it; Latin is unaffected. Layouts pinned to the old Japanese metrics may need a look.
  
  It also adds roughly 4.8 MB of woff2 subsets to your build output even if your app renders no Japanese, and takes the stylesheet from about 98 KB to 200 KB uncompressed (15 KB to 45 KB gzipped). The faces are restricted to Japanese codepoint blocks, so users download only the subsets their content touches — nothing at all for an app with no Japanese, ~910 KB for a typical first Japanese screen — and weight costs nothing extra, since every weight shares one file.
  
  To opt out, or to use a brand font, set the new `--app-shell-font-sans` on `:root` after importing the styles:
  
  ```css
  @import "@tailor-platform/app-shell/styles";
  
  :root {
    --app-shell-font-sans: "Your Brand Sans", ui-sans-serif, system-ui, sans-serif;
  }
  ```
  
  Naming no Japanese family opts out of the download entirely, since each face carries a `unicode-range`. A replacement should be a variable font, or otherwise supply real 400/500/600/700 faces — the weight scale assumes all four exist.
  
  See [Typography and Fonts](https://github.com/tailor-platform/app-shell/blob/main/docs/concepts/styling-theming.md#typography-and-fonts).
- 891a253: Fix the published type declarations, which referenced types they never declared.
  
  `dist/app-shell.d.ts` shipped with nine errors inside our own package. Consumers who compile with `skipLibCheck: false` saw all nine attributed to `@tailor-platform/app-shell`, not to their own code. We never noticed because `packages/core/tsconfig.json` sets `skipLibCheck: true`, so neither `pnpm type-check` nor CI ever looked at the declarations we emit.
  
  Three defects, all now fixed at the source:
  
  - **`PositionProps` was referenced but never declared.** It is the type of the `position` prop on `Menu.Content` and `Tooltip.Content`, but it was tagged `@internal`, so the declaration rollup stripped it while keeping five references to it. It is now **exported from the package root**, which is the additive change that makes this release a minor: consumers can finally name the type they are required to pass.
  
    ```tsx
    import { Menu, type PositionProps } from "@tailor-platform/app-shell";
  
    const dropdown: PositionProps = { side: "bottom", align: "start", sideOffset: 8 };
    <Menu.Content position={dropdown} />;
    ```
  
  - **`Form` emitted a broken merged declaration** (TS2395). A `function` declaration carrying an expando `displayName` is emitted as a function/namespace merge, and the rollup duplicated the namespace — once exported, once local. `Form` is now a const with an explicit component type, following the same idiom already used by `Select`, `Combobox`, and `Autocomplete`. Its generic is unchanged, so `<Form<MyValues>>` still infers callback values.
  
  - **`Layout.Header` was emitted as a type instead of a value** (TS2709). `Layout.Header = Header` emitted `var Header: typeof import("./Layout").Header`, which the rollup rewrote to a bare `Header` — a namespace, not a type. `Layout` now uses the explicit `Object.assign` idiom, like `Grid`.
  
  The public runtime API is unchanged: the built bundle exports exactly the same 100 names as before, and `PositionProps` is a type-only export.
  
  A `check-dts` gate now runs in CI to keep this from returning. It builds, packs the tarball, installs it into a scratch project, and type-checks every entry point that publishes `types` with `skipLibCheck: false` — the same thing a consumer does. Entry points are read from `package.json`, so new ones are covered as soon as they are added.
- 7e1a1e3: Expand the re-exported React Router surface so an app never needs `react-router` as a direct
  dependency, and add `memory` routing to `AppShell` for tests.
  
  AppShell owns the router — it builds the route tree, constructs the router, and renders the
  `RouterProvider`. An app that also resolves its own copy of `react-router` ends up with two
  copies in the bundle and two unrelated router contexts: AppShell's navigation keeps working
  while the app's own `useNavigate` / `useLocation` / `<Link>` throw
  `may be used only in the context of a <Router> component`, with nothing for TypeScript to catch.
  Apps were reaching for a direct dependency because the re-exported surface was incomplete. This
  closes those gaps.
  
  **Newly available from `@tailor-platform/app-shell`:**
  
  - `useMatch`, `useResolvedPath` — route matching, for active states and relative paths
  - `useNavigation` — the in-flight navigation, for pending UI
  - `NavLink` — a link that knows when it is active
  - `useBlocker`, `useBeforeUnload` — guard navigation away from unsaved changes
  - Types: `Location`, `NavigateFunction`, `NavigateOptions`, `To`, `Params`, `PathMatch`,
    `LinkProps`, `NavLinkProps`, `Navigation`, `Blocker`, `BlockerFunction`
  
  **New `@tailor-platform/app-shell/testing` entry point**, so tests need no `react-router` either:
  
  - `AppShell` — the same shell, additionally accepting `memory` / `initialEntries` to mount at a
    fixed URL without touching `window.location`. For page and integration tests.
  - `TestRouter` — a minimal router context for unit-testing a single component that uses
    `useNavigate` or renders a `<Link>`, without booting the whole shell. Pass `path` when the
    component reads the route (`useParams`, `useMatch`), so the location matches something.
  
  ```tsx
  import { AppShell, TestRouter } from "@tailor-platform/app-shell/testing";
  
  render(
    <AppShell memory initialEntries={["/orders/A42"]} modules={modules}>
      <SidebarLayout />
    </AppShell>,
  );
  ```
  
  Memory routing is reachable only from `/testing`. The production `AppShell` pins it off, so it
  holds for JS callers and `any` spreads as well as typed ones.
  
  Router construction (`createBrowserRouter`, `RouterProvider`, `MemoryRouter`, `Routes`, `Route`)
  and the data-router APIs (`useLoaderData`, `useSubmit`, `useFetcher`, `useActionData`) remain
  deliberately unexported: AppShell owns the former and does not wire up the latter. If something
  you need is missing, ask for it rather than adding a direct `react-router` dependency.
- 719ba91: Add standalone `Textarea` component
  
  - New `Textarea` — a styled multi-line text control wrapping Base UI's field control rendered as a `<textarea>`. Integrates with `Field` and React Hook Form for label association, `aria-describedby`, `disabled`, and invalid/error state exactly like `Input`/`Checkbox` (no bespoke `error` prop), and works standalone outside a `Field.Root`. The invalid state is styled off both `data-invalid` (AppShell `Field.Root`) and `aria-invalid` (shadcn-style `FormControl`), so it fits either form stack.
  - Unlike `Input`, it has no fixed height: `rows` sets the visible line count, `min-h-16` is the floor, and `resize-y` lets the user drag it taller. Previously the only multi-line route was `<Field.Control render={<textarea />} />`, which inherited the single-line `h-9` and clipped the box to 36px.
  - `cols` and `wrap` are not accepted: the control is always `w-full`, so `cols` can never affect its width, and per the HTML spec every `wrap` value depends on `cols` being set. `className` is typed as `string` rather than Base UI's `string | ((state) => string | undefined)`, because it is merged through `cn()`, which silently drops a function.
  - Internal: `inputBaseClasses` now composes from a shared `controlBaseClasses` so `Input` and `Textarea` keep the same border/focus/placeholder treatment while owning their own height and padding. The emitted class list for `Input` and `Field.Control` is unchanged apart from ordering.

### Patch Changes

- 7b08250: Fix sessions hanging permanently after the server rejects the grant, by raising `@tailor-platform/auth-public-client` to `^0.6.1`. The new floor also picks up 0.6.1's callback-URL cleanup: a failed OAuth callback no longer leaves `?code=` / `?error=` in the URL, and cleanup on every outcome preserves unrelated query parameters, the hash, and the router's history state.
  
  When a refresh token expired or was revoked, the auth client kept `isAuthenticated` true and reattached the dead token to every request, so apps sat in a permanent `{"errors":[{"message":"unauthorized","type":"Gateway"}]}` loop that only a manual IndexedDB clear recovered from. Any token-endpoint rejection now ends the session (`use_dpop_nonce` excepted), emitting `logout` and `auth_state_changed`. `AuthProvider` responds as it already does for a signed-out user: `guardComponent` renders, and with `autoLogin` the app redirects to sign-in. A timeout, a network failure, and a plain 5xx still leave the session intact. Note that the boundary is the response shape rather than the underlying cause: any 4xx carrying an `error` code ends the session, so a token endpoint that reports overload as `400 {"error":"server_error"}` will sign users out.
  
  One behaviour change worth checking even though this is a patch: `fetch` and `getAuthHeaders` no longer throw `Error("No valid access token")` when a refresh is rejected — they throw the underlying error. If your app detects dead sessions by matching that message, it has stopped detecting them; listen for `logout` / `auth_state_changed` instead, which fire on exactly that condition. Grepping the installed package for the string will not tell you whether you are affected, because the throw still exists for the genuinely-no-token case — check your own error handling.
- 17a03fe: Fix `autoLogin` being permanently disabled after a failed OAuth callback.
  
  `@tailor-platform/auth-public-client` cleans the callback parameters out of the URL only when the code exchange succeeds; every failure path leaves `?code=` or `?error=` in the query string (tailor-platform/auth-public-client#139). `AuthProvider` decided whether a callback was in progress by reading that URL, so after any failed callback it treated the page as a live callback forever: auto-login never fired again, the app sat on `guardComponent`, and reloading only replayed the same failing callback.
  
  Auto-login now decides from the callback's status rather than the URL — which is what the check meant all along: "is an exchange in flight", not "has this page ever been a callback". The URL is still the authority when no callback has been claimed at all, where redirecting away from unconsumed parameters would be unsafe.
  
  It will not loop, either. A recoverable failure is retried once per tab; beyond that, and for any refusal the authorization server issues explicitly, AppShell stops rather than redirecting the user back for the same answer. The outcome is classified from the resulting auth state rather than from whether the callback threw, because two failure paths — a server `error` and a state mismatch — return normally after recording the error.
  
  That makes `guardComponent` where a failed sign-in becomes visible: a guard that only renders a spinner will spin indefinitely, so render `useAuth().error` and offer a retry. See the authentication guide.
  
  The stale parameters themselves remain in the URL after a failure until the cleanup is fixed upstream (tailor-platform/auth-public-client#139) — app-shell no longer misbehaves because of them, but deliberately does not reimplement the library's URL cleanup.

## 1.12.0

### Minor Changes

- 6171c84: Add a `render` escape hatch to `DescriptionCard` fields, so custom rendering no longer requires a new built-in field type.

  ```tsx
  <DescriptionCard
    data={orderData}
    title="Order"
    fields={[
      { key: "orderNumber", label: "Order Number" }, // default text
      { key: "status", label: "Status", type: "badge" }, // preset
      {
        key: "deliveryBreakdown",
        label: "Delivery",
        render: (data) => <PieChart data={data.deliveryBreakdown} />,
      },
    ]}
  />
  ```

  `render` receives the whole `data` object — the same shape as `render` on DataTable's `Column`, which takes the whole row. Destructure the keys you need, and a field can be derived from several at once:

  ```tsx
  {
    key: "total",
    label: "Balance Due",
    render: ({ total, amountPaid, currency }) => (
      <Money amount={total - amountPaid} currency={currency} />
    ),
  }
  ```

  Semantics match DataTable's `render`: it always wins over `type`, and its return value replaces the built-in output entirely (so `meta` — copy button, truncation, badge maps, the `–` placeholder — is not applied). `key` is still required; it identifies the field and is what `emptyBehavior` tests, but it is not resolved into a value for `render`. A custom renderer still runs when the value at `key` is empty; `emptyBehavior: "hide"` is checked first.

  `DescriptionCard` is now generic over the shape of `data`, inferred from the `data` prop, so everything `render` reaches for keeps its declared type. This is backward compatible — `DescriptionCardProps` defaults to `Record<string, unknown>`. To declare a fields array separately, parameterise it so `render` callbacks stay typed:

  ```tsx
  const fields: DescriptionCardProps<Order>["fields"] = [...];
  ```

- 08c29d6: Add expandable detail rows to `DataTable`. Pass `rowExpansion` to `useDataTable` and each row gets a chevron column (auto-pinned to the left edge, after the selection column) that reveals a full-width detail panel beneath the row — nothing new to compose in JSX.

  ```tsx
  const table = useDataTable<Order>({
    columns,
    data,
    control,
    rowExpansion: {
      render: (row) => <OrderLineItems orderId={row.id} />,
      canExpand: (row) => row.lineItemCount > 0,
      getLabel: (row) => row.orderNumber, // → "Expand row INV-1001"
    },
  });
  ```

  Rows must have a string or number `id` (the same constraint as row selection); rows without one render no chevron. Several rows can be open at once, and expansion survives page changes — `collapseAllRows()` resets it. Pass `expandedIds` + `onChange` inside `rowExpansion` to control expansion yourself; the type requires them together, so a half-configured controlled table is a compile error rather than inert chevrons.

  Also fixes `onSelectionChange` firing twice per toggle under React StrictMode. It was dispatched from inside a state updater, which StrictMode intentionally double-invokes to surface impurity, so handlers doing real work (fetches, analytics, history entries) ran twice in development. It is now dispatched from the event handler and fires exactly once. No signature change; if you added your own de-duplication to work around this, it is no longer needed.

- b5289fc: Re-export react-router's `Navigate`, so apps no longer need `react-router` as a direct dependency for declarative redirects.

  ```tsx
  import { Navigate } from "@tailor-platform/app-shell";

  if (!allowed) return <Navigate to="/dashboard" replace />;
  ```

  See [Declarative Redirects](https://github.com/tailor-platform/app-shell/blob/main/docs/concepts/routing-navigation.md#declarative-redirects) for when to prefer the route-level `redirectTo()` guard instead.

- fd2f4bc: Refactor `DateField` / `DatePicker` to follow the same composition model as `Field`, `Select`, `Combobox`, and `Autocomplete`.

  The date controls are now **control-first**: field chrome moved out of the control props and into `Field.Root` composition. They also interoperate correctly with `Form` / `Field.Root` label wiring, `onFormSubmit` value collection, and submit-time validation for required and out-of-range default values.

  Breaking changes:

  - `label`, `description`, and `errorMessage` were removed from `DateField` / `DatePicker`; compose them with `Field.Root`, `Field.Label`, `Field.Description`, and `Field.Error` instead.
  - `hideTimeZone` was removed; it was previously accepted by the prop types but had no effect.

  `isInvalid` still remains a top-level prop for externally-controlled invalid styling, and the semantic date props (`isRequired`, `isDisabled`, `isReadOnly`, `minValue`, `maxValue`, `isDateUnavailable`) remain top-level and aligned with `Calendar`.

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
    <DatePicker
      aria-label="Delivery date"
      minValue={today(getLocalTimeZone())}
    />
    <Field.Description>When should we ship your order?</Field.Description>
    <Field.Error match={!!error}>{error}</Field.Error>
  </Field.Root>
  ```

  Standalone usage still works with accessible naming:

  ```tsx
  <DateField aria-label="Invoice date" />
  ```

- fa587b2: Bridge `--alert-*` tokens into Tailwind's theme as `--color-alert-*`

  The `--alert-*` design tokens (`neutral` / `success` / `warning` / `error` / `info` × `background` / `foreground` / `foreground-muted` / `border`) are now exposed through `@theme inline`, matching how `--status-*` is already bridged.

  Application code can now use ordinary color utilities for callouts, banners, and status-highlighted rows:

  ```tsx
  // Before — arbitrary values, no autocomplete, silent failure on a typo
  <div className="bg-[color:var(--alert-info-background)] text-[color:var(--alert-info-foreground)]" />

  // After
  <div className="bg-alert-info-background text-alert-info-foreground" />
  ```

  This is purely additive — existing arbitrary-value usage keeps working, and the generated CSS is unchanged.

- 1a768e1: Add `DateRangePicker` and `RangeCalendar` components with a `{ start, end }` range value (exported as `DateRange`). Selection follows the react-aria model: the first calendar pick anchors the range and keeps the popover open, the highlight live-extends to the hovered/focused day, and the second pick completes it — picking backwards swaps the endpoints, while a range typed in reverse is flagged invalid instead of swapped.

  Like `DateField` / `DatePicker`, they are standalone composite controls that also compose inside `Field.Root` (label / description / error / form validation). A single combined proxy input is registered as the one Field control (empty until both ends are complete, so `isRequired` blocks a partial range); `name` gives that combined input a name for native POST (`start/end`, with a wrapping `Field.Root` name taking precedence), while `startName` / `endName` emit two plain hidden inputs for classic form POST.

  ```tsx
  import {
    DateRangePicker,
    Field,
    type DateRange,
  } from "@tailor-platform/app-shell";

  const [range, setRange] = useState<DateRange | null>(null);

  // standalone
  <DateRangePicker
    aria-label="Billing period"
    value={range}
    onChange={setRange}
  />;

  // composed
  <Field.Root name="period">
    <Field.Label>Billing period</Field.Label>
    <DateRangePicker />
    <Field.Error match="customError" />
  </Field.Root>;
  ```

### Patch Changes

- 8b72b55: Document how to remove the `@theme` bridge workaround, which silently breaks dark mode on 1.7+.

  Apps that pasted the `@theme inline` block, `@custom-variant dark (&:is(.dark *))`, and a copy of the palette into their entry CSS (the workaround while `styles` shipped without the bridge, 1.5.0–1.6.1) keep those definitions winning over AppShell's own palette, because the default palette is imported inside `layer(theme.defaults)` and consumer CSS is unlayered. The build succeeds with no warning, but surfaces added since the copy render light-mode colours in dark mode.

  Adds `docs/migrations.md`, a curated list of breaking changes and the steps each one requires, newest first — separate from the changelog so upgraders and AI agents have one narrow place to look. The first entry covers detecting and removing this workaround, including the requirement to be on 1.7.0 or later first, since the workaround is load-bearing before that.

  That page now ships with the package. The published tarball contains only `dist/**` and `skills/**` — no `docs/`, no `CHANGELOG.md` — so a consumer app previously had no migration record available locally at all. `docs/migrations.md` is generated into the bundled `app-shell-patterns` skill as `references/migrations.md` (with relative links rewritten to repo URLs), and the skill now names upgrades and post-version-bump styling breakage among its triggers, so coding agents reach it from `node_modules`. `packages/core/README.md` links it for the human path, since the README is the only human-readable file npm publishes.

  `docs/concepts/styling-theming.md` and the bundled `app-shell-patterns` skill now document `:root` / `:root.dark` as the override form to use. A bare `.dark` override silently loses against the branded palettes (`cream`, `bloom`), which are imported unlayered and define their dark values on `:root.dark`.

- 2a3f5e6: Polish the built-in sidebar search entry so it looks more like a compact text field.

  The search affordance now shows the platform-specific keyboard shortcut (`⌘K` on Apple platforms, `Ctrl+K` elsewhere) and uses subtler spacing and typography.

- 45218cc: Fix the bundled `app-shell-patterns` skill, whose `design-system.md` documented a token system that does not exist in the package. Agents read it as canonical and emitted classes like `bg-surface-1`, `text-fg-default`, and `bg-danger`, which produce no CSS at all — a silent failure with no error or warning.

  Tokens, dark mode (`.dark` on `<html>`), elevation, z-index, and the `styles` import now match the shipped CSS, and the fabricated spacing, typography, motion, and icon scales are gone in favour of stock Tailwind. Also drops references to `Icon` and `Stat`, which aren't exported, and to a `Sheet` `contentClassName` prop that doesn't exist.

  Documentation only — no runtime or CSS changes.

## 1.11.0

### Minor Changes

- af7bd0f: Make `Sheet` omit its backdrop automatically when `modal={false}` so non-modal sheets no longer dim or block the page.

  ```tsx
  <Sheet.Root modal={false}>
    <Sheet.Content>...</Sheet.Content>
  </Sheet.Root>
  ```

### Patch Changes

- 8cdb5cd: DataTable filter and column UI fixes:

  - **Filter placement & style**: `DataTable.Filters` now renders the **Add filter** trigger on the **left** by default (was right-aligned), with active chips flowing to its right, and the trigger is **icon-only by default** (the label is kept as an `aria-label`). Pass `addIconOnly={false}` to show the "Add filter" text label. The add-filter popover now anchors to the left edge of the trigger.
  - **Pinned columns**: closed a sub-pixel gap between adjacent frozen columns where scrolling rows could bleed through — column offsets are now measured with fractional widths so pinned columns sit flush.
  - **Column settings popup**: added a search box at the top that filters the **Scrollable** column list by name, and that list now scrolls within a height cap while the **Fixed left** / **Fixed right** zones and the Show/Hide-all footer stay pinned and always fully visible — so the popup stays within the viewport even with many columns. Drag-to-reorder and drag-between-zones keep working while searching. The popup width is capped so long column names truncate.
  - **Add-filter panel**: the field picker now has a **search box** to quickly find a field, and the field column hugs the field-name width (up to a cap) so names aren't needlessly truncated while the value editor keeps its width.
  - **Truncated names**: long field/column names in the add-filter and column-settings pickers carry a native `title` so the full text shows on hover.

- 492c2bb: Upgrade AppShell to React Router v8 and raise the minimum supported `react` / `react-dom` version to `19.2.7`.
- 09fcaa8: Update the internal Base UI dependency to v1.6.0.

## 1.10.1

### Patch Changes

- adf2119: Fix `DataTable` empty/error-state message not being vertically centered — it now
  centers in the reserved area instead of sitting near the top. The message was
  positioned with `position: sticky`, whose offset only applies while scrolling,
  so in the common (non-scrolling) case it stayed at the top of the cell; it now
  uses `vertical-align: middle`.
- f45aa47: Raise the bundled `react-router` dependency to the latest v7 release.

  This picks up the current v7 security and hardening fixes while avoiding the breaking changes in React Router v8.

## 1.10.0

### Minor Changes

- 73d0c0a: Add a built-in error state to `Combobox.Async`, `Autocomplete.Async`, and `Select.Async`

  When an async fetcher throws or rejects, the components now render an inline error state in the popover — a "Couldn't load results." message plus a **Retry** button that re-runs the last fetch — instead of silently falling back to the misleading "No results." empty state. This makes failed fetches distinguishable from genuinely-empty results without any consumer code.

  The debounce/abort lifecycle is handled centrally: aborted/superseded requests are ignored, and outages are de-duped so typing during an outage doesn't stack repeated announcements.

  Three new props on each `.Async` component:

  | Prop           | Type                       | Default                    | Description                                                        |
  | -------------- | -------------------------- | -------------------------- | ------------------------------------------------------------------ |
  | `errorText`    | `string`                   | `"Couldn't load results."` | Message shown in the popover when the fetcher fails                |
  | `retryText`    | `string`                   | `"Retry"`                  | Label for the retry button                                         |
  | `onFetchError` | `(error: unknown) => void` | -                          | Called once per outage when a fetch fails (logging/error tracking) |

  The `Combobox.useAsync` / `Autocomplete.useAsync` / `Select.useAsync` hooks now also expose `error` and a `retry()` function and accept an `onFetchError` option, for consumers building custom compositions with `Parts`.

- 16c1046: Add a built-in `/__appinfo` page to `AppShell` for exposing app metadata and the current AppShell version.

  ```tsx
  <AppShell
    title="My App"
    appInfo={{
      metadata: [
        { label: "Environment", value: "staging" },
        { label: "Release", value: "2026.07.16" },
      ],
    }}
  />
  ```

  The page stays out of AppShell's built-in auto-generated sidebar navigation, appears in the Command Palette as a page entry, and includes a copy button for the rendered app information.

- 35ab98a: DataTable: sticky/pinned columns and user column settings

  - **Pinned columns** — add `pin: "left" | "right"` to a `Column` to freeze it during horizontal scroll (sticky offsets are measured from the rendered layout; `width` is optional but recommended for stable sizing). The selection column auto-pins left and the row-actions column auto-pins right, with a subtle freeze shadow at the frozen edge once content scrolls under it.
  - **Column settings** — pass `columnSettings` to `DataTable.Toolbar` to render a built-in "Columns" control (top-right) that lets users show/hide columns, reorder them (drag), and change pinning by dragging a column between the Fixed left / Scrollable / Fixed right zones.
  - **Persisted column layout** — pass a stable `tableId` to `useDataTable` to persist each user's column visibility, order, and pinning to `localStorage` (per-user preference; not stored in the URL). Omit for in-memory-only layout.
  - `Table.Root` now accepts an optional `containerRef` for its scroll container.

- b32f003: Redesign `DataTable.Filters` for a faster, more direct filtering experience.

  - **Add-filter panel**: replaces the old popover + nested selects with a single popover laid out in up to three columns — **field ▸ condition ▸ value**. The condition column appears for fields with more than one operator; single-operator fields (enum, uuid) go straight to the value. Values are drafted and committed with an **Apply**/**Update** button, and the panel stays open so several filters can be added in a row. A per-field **Clear** and a sticky **Clear all filters** are built in.
  - **Segmented filter chips**: each active filter renders as `field │ operator │ value │ ✕`. The operator segment opens a searchable dropdown to switch the condition; the value segment opens the type-specific editor. Long values are truncated.
  - **Date & time use app-shell's own components**: single date → inline `Calendar`; single datetime → inline calendar + a "Choose time" picker; `date`/`datetime` **between** → one inline calendar with **From / To** tabs; `time` → native time input. (Swaps to the dedicated date-range / datetime pickers 1:1 once those land.)
  - Friendlier operator labels (`is`, `is not`, `is between`, `is any of`, …), multi-select enum values summarized as "N items" (localized), an inline error for reversed `between` ranges, and a consistent primary-colored checkbox across every filter surface.
  - **New `slot` prop** on `DataTable.Filters` (`"all"` | `"chips"` | `"add"`) to render the chips and the **Add filter** trigger separately for custom toolbar layouts (e.g. trigger in a header row, chips on the row below).

- 19bc874: Add `header` to DataTable columns so consumers can fully customize header UI while keeping the built-in header behavior when `header` is omitted.

  ```tsx
  column({
    label: "Amount",
    sort: { field: "amount", type: "number" },
    header: (ctx) =>
      ctx.sortable ? (
        <button type="button" onClick={ctx.activateSort}>
          {ctx.label}{" "}
          {ctx.sortDirection === "Asc"
            ? "▲"
            : ctx.sortDirection === "Desc"
            ? "▼"
            : null}
        </button>
      ) : (
        ctx.label
      ),
  });
  ```

  `header` is a typed render function. Non-sortable columns receive `{ label, sortable: false }`; sortable columns also receive `sortDirection` and `activateSort()`. Custom headers own their click surface and sort indicator, while the default header keeps the built-in sort button and hit area.

- 7832718: Add standalone `Checkbox` component

  - New `Checkbox` — a styled boolean control wrapping Base UI's checkbox. Supports controlled (`checked`) and uncontrolled (`defaultChecked`) use, an `indeterminate` state, and an optional inline `label`. Integrates with `Field` and React Hook Form for label association, `disabled`, and invalid/error state exactly like `Input`/`Select` (no bespoke `error` prop) — drive it via `Controller` with `onCheckedChange`/`inputRef`. The invalid state is styled off both `data-invalid` (AppShell `Field.Root`) and `aria-invalid` (shadcn-style `FormControl`), so it fits either form stack.
  - DataTable now uses `Checkbox` internally for row selection, the header select-all (indeterminate), the enum and case-sensitive filter controls, and the column-settings visibility toggles — replacing the previously hand-rolled, slightly inconsistent checkbox styling with one shared control.

### Patch Changes

- 7a9e958: Fix DataTable row-selection highlight. Selecting a row now tints the **whole** row, not just the pinned selection/actions cells. The row sets `data-state="selected"` (which `Table.Row` keys its selected background off of) in addition to the existing `aria-selected`; previously only the pinned cells — which carry their own `group-aria-selected:bg-muted` — were highlighted.

## 1.9.0

### Minor Changes

- 423ae75: Add an `xs` (16px) size to `Avatar`

  `Avatar.Root` now accepts `size="xs"` for a 16px circle, extending the existing `sm` / `default` / `lg` scale:

  | `size`    | circle |
  | --------- | ------ |
  | `xs`      | 16px   |
  | `sm`      | 24px   |
  | `default` | 28px   |
  | `lg`      | 40px   |

  `xs` is intended for compact/inline contexts and single-glyph or icon content; two-letter initials will be cramped at this size. Purely additive — the default size is unchanged.

- 6f767f5: Add QuickBooks-style keyboard shortcuts to `DateField` / `DatePicker`

  When any date segment is focused, the field now supports whole-date navigation (all case-insensitive):

  - `t` — today
  - `m` / `h` — first / last day of the entered month (or the current month when no date is entered)
  - `y` / `r` — first / last day of the entered year
  - `w` / `k` — first / last day of the week (locale-aware week start)
  - `-` — previous day; `=` / `+` — next day. Both step across month **and** year boundaries (e.g. 1 Jan − 1 day → 31 Dec of the prior year). `+` works whether or not Shift is held.
  - `/` — commit the current segment as-is and advance to the next (e.g. typing `1` then `/` means "January", not the start of `1x`)
  - `Alt+↓` — open the calendar popover (`DatePicker` only)

  A 1–2 digit year is also expanded to the 2000s on blur (`26` → `2026`).

  Both `DateField` and `DatePicker` now accept an optional `firstDayOfWeek` prop to override the locale's week start for the `w`/`k` shortcuts (previously `DatePicker`-only).

  The shortcuts also work **while the calendar popover is open** — there they move the highlighted day (like the arrow keys), and `Enter` confirms. Targets are clamped to `minValue`/`maxValue` in both the field and the calendar, so a shortcut can't jump to an out-of-range date; unavailable days can be highlighted but not confirmed.

- 0817cf1: AppShell now bundles and injects a small default favicon set instead of a single 32×32 icon. When no `favicon` prop is passed (and the host page declares no `<link rel="icon">`), AppShell renders 16×16 and 32×32 PNG tab icons plus a 180×180 Apple touch icon — all embedded as data URIs, so no asset-copy step is needed. The Apple touch icon covers "Add to Home Screen" on both iOS and Android; the legacy `.ico` and PWA `android-chrome-*` icons are intentionally omitted to keep the bundle small (this is not a PWA).

  Behavior for consumers is unchanged: passing `favicon` still replaces the whole set with your single href, and an existing host-page favicon is still respected.

- 2497a2d: Add `useOpenCommandPalette()` for opening the built-in command palette from application code.

  ```tsx
  const openCommandPalette = useOpenCommandPalette();

  openCommandPalette();
  openCommandPalette({ search: "PO: alice" });
  ```

- 57a3870: Add composable `Timeline` primitives for building time-based layouts, including axis guides/levels, row backgrounds, intervals, and dependency links.

  - `Timeline.Root` defines the shared start/end range.
  - `Timeline.Viewport` renders the axis, decorations, scrolling area, and link layer.
  - `Timeline.Row` defines one timeline lane and owns row height/background.
  - `Timeline.Interval` positions content across a time range.
  - `Timeline.Link` draws dependency lines between timeline items.

  ```tsx
  import { Timeline } from "@tailor-platform/app-shell";

  <Timeline.Root start={0} end={100}>
    <Timeline.Viewport
      axis={{
        guides: [{ at: 0 }, { at: 50 }, { at: 100 }],
        levels: [
          {
            kind: "spans",
            items: [
              { start: 0, end: 50, label: "Phase 1" },
              { start: 50, end: 100, label: "Phase 2" },
            ],
          },
        ],
      }}
    >
      <Timeline.Row height={40}>
        <Timeline.Interval start={10} end={35}>
          <div className="h-full rounded-md bg-primary" />
        </Timeline.Interval>
      </Timeline.Row>
    </Timeline.Viewport>
  </Timeline.Root>;
  ```

  `Tooltip.Content` also now accepts `noArrow` for popover-like timeline labels and custom overlays.

### Patch Changes

- ca1c8c7: Raise the `@tailor-platform/auth-public-client` dependency floor from `^0.5.0` to `^0.5.1` so fresh installs cannot resolve the broken `0.5.0` release.
- 6e61cc2: Fix `DateField` / `DatePicker` not validating typed input against `minValue`, `maxValue`, or `isDateUnavailable`. A date entered by typing (or via a keyboard shortcut) that fell outside the allowed range was silently accepted. It's now flagged invalid (`aria-invalid` + a built-in message) while the value still flows through `onChange` — matching how the calendar already behaves and the react-aria validation contract.

  - Keyboard shortcuts (`t`, `m`, `y`, …) no longer clamp their target to the boundary; like typing, an out-of-range result is surfaced as invalid instead of being silently coerced.
  - `isDateUnavailable` now also drives field validation (e.g. weekends or specific blackout dates typed into the field are flagged), not just calendar selection.
  - Consumer `errorMessage` still takes precedence over the built-in messages.

## 1.8.0

### Minor Changes

- a4f735c: Add DateField, DatePicker, and Calendar components (@internationalized/date + Base UI implementation)

  Introduces three accessible date-input components, implemented on `@internationalized/date` (value layer) and Base UI (`Popover`) with hand-rolled segmented-input and calendar-grid behaviour:

  - `DateField` — segmented date/time input with label, description, and error message
  - `DatePicker` — date field with a popover calendar
  - `Calendar` — standalone calendar grid

  All three accept `LocalizedString` labels/descriptions and resolve locale + timezone from the AppShell context. The `@internationalized/date` value types (`CalendarDate`, `CalendarDateTime`, `ZonedDateTime`, …) and helpers (`parseDate`, `getLocalTimeZone`, …) are re-exported from `@tailor-platform/app-shell`.

  New AppShell context hooks:

  - `useResolvedLocale()` — full BCP-47 locale (e.g. `"en-GB"`) plus the language code
  - `useTimeZone()` — returns a `TimeZone` object with `.value` (IANA string), `.today()`, and `.now()` bound to the configured timezone

  AppShell now accepts an optional `timeZone` prop.

  > This is the **`@internationalized/date` + Base UI** variant — the lighter foundation tracked in the design proposal (§9). Net-new dependency is just `@internationalized/date` (~11 KB gz); Base UI is already in the bundle. Public API and accessibility contract are identical to the react-aria variant.
  >
  > **Known limitation:** the segmented input is built from `role="spinbutton"` elements that aren't `contentEditable`, so on-screen-keyboard typing on touch devices is limited — the calendar popover is the touch-friendly path (desktop keyboard entry works fully). The APG behaviour is unit-tested but not yet screen-reader-audited.

- ef5c788: DataTable now scrolls internally: add `fill` prop to `Layout` to pin page chrome and scroll only the table rows.

  ```tsx
  <Layout fill>
    <Layout.Header title="Products" />
    <Layout.Column>
      <DataTable.Root value={table}>
        <DataTable.Toolbar>…</DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Footer>
          <DataTable.Pagination />
        </DataTable.Footer>
      </DataTable.Root>
    </Layout.Column>
  </Layout>
  ```

  With `fill`, the page title, table toolbar, column header row (sticky), and footer stay visible at all heights — only the rows region scrolls vertically. Without `fill`, pages grow and scroll as before. Tables short enough to fit render without a scrollbar or layout shift.

  **Behavior change:** the AppShell layout is now viewport-bounded (`h-svh` instead of `min-h-svh`), so page content scrolls inside the content area rather than on the document. Code relying on `window`/document scroll position should target the content area instead.

  Also fixes the empty/error state reserving `pageSize`-worth of height — it is now capped at 5 rows, so large page sizes no longer produce a huge blank region below "No data".

- ef5c788: Add `useAppShellScrollContainer()` — a supported handle to the content scroll container

  Now that the shell is viewport-bounded (`h-svh`) and page content scrolls inside the content area rather than on the document, consumers that previously relied on `window`/document scroll need a stable way to reach the element that actually scrolls.

  `useAppShellScrollContainer()` returns a ref to that element:

  ```tsx
  const scrollRef = useAppShellScrollContainer();
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () =>
      setProgress(el.scrollTop / (el.scrollHeight - el.clientHeight));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);
  ```

  Use it wherever you would previously have reached for `window.scrollY`, a `window` `scroll` listener, `window.scrollTo(...)`, or an `IntersectionObserver` with the default viewport root.

  - On a `<Layout fill>` page the element does not scroll (its children manage their own scrolling).
  - Outside a `SidebarLayout` the ref's `current` is always `null`.
  - The container also carries a `data-appshell-scroll-container` attribute for non-React access (CSS, tests, `document.querySelector`).

- aa9306a: Add a `header` slot to `SidebarLayout` and a `SidebarLayout.DefaultHeader` building block

  `SidebarLayout` now accepts a full-region `header?: ReactNode` prop, mirroring the existing `sidebar` slot. It defaults to the built-in header (`SidebarLayout.DefaultHeader`), so existing usage is unchanged.

  To extend the built-in header (e.g. add a notification bell or user menu) without reconstructing the trigger and breadcrumb, use `SidebarLayout.DefaultHeader` with its `actions` slot:

  ```tsx
  <SidebarLayout
    header={
      <SidebarLayout.DefaultHeader
        actions={[
          <NotificationBell key="bell" />,
          <AppearanceSwitcher key="appearance" />,
        ]}
      />
    }
  />
  ```

  - `DefaultHeader`'s `actions` prop (single node or array) controls the entire right-hand cluster, laid out in a horizontal, vertically-centered row.
  - `actions` **defaults to `[<AppearanceSwitcher />]`**, and **passing `actions` replaces the whole cluster including the switcher** — include `<AppearanceSwitcher />` explicitly to keep it. This keeps the API a single slot instead of accumulating one-off props.
  - `DefaultHeader` is available as `SidebarLayout.DefaultHeader` and as a top-level `DefaultHeader` export.
  - `DefaultSidebar` is now also exposed as `SidebarLayout.DefaultSidebar` for symmetry; the top-level `DefaultSidebar` export is retained for backwards compatibility.

  This provides an official, composable extension point for the top bar, replacing fragile consumer workarounds that queried the header DOM and injected a React portal.

- 078130e: Add a `size` prop to `Tabs` and make `capsule` icon-only tabs square

  `Tabs.Root` now accepts `size?: "xs" | "sm" | "default" | "lg"` (default `"default"`), mirroring `Button`'s height tiers. It sets a **minimum** height on the `capsule` variant — taller content still grows — so a capsule track sits flush next to a `Button`:

  | `size`    | capsule track | matches Button |
  | --------- | ------------- | -------------- |
  | `xs`      | 28px          | `size="xs"`    |
  | `sm`      | 32px          | `size="sm"`    |
  | `default` | 36px          | default        |
  | `lg`      | 40px          | `size="lg"`    |

  Two `capsule` fixes from the same change:

  - The list no longer hard-locks to `h-10` (40px); its height derives from the tab size floor.
  - A tab whose only child is an icon now renders **square** (`min-width` follows `min-height`), instead of the previous wider-than-tall, shrunken look — ideal for icon-only view toggles.

  The default `capsule` height moves from 40px to 36px to align with `Button`'s default height. `size` only affects the `capsule` variant; `line` and `default` are unchanged.

### Patch Changes

- eeb10ab: Remove the `stream` option from `useAIChat()` and `AIGatewayChatRequest`.

  AppShell now selects the appropriate transport (streaming vs JSON) automatically based on the model. Passing `stream` is no longer needed.

## 1.7.0

### Minor Changes

- 7f33506: Allow the standalone `Select`, `Combobox`, and `Autocomplete` (including their `.Async` variants) to receive an accessible name via `aria-label`, `aria-labelledby`, and `id`. Previously these props were silently dropped, leaving the combobox with only its current value as an accessible name — a WCAG 4.1.2 issue for filters and toolbars used outside a `Form`. The props are now forwarded to the underlying trigger/input.

  ```tsx
  // Announced as "Direction filter, combobox" instead of just its value
  <Select
    items={items}
    value={value}
    onValueChange={setValue}
    aria-label="Direction filter"
  />

  // Or point at a visible label
  <span id="dir-label">From</span>
  <Combobox items={items} aria-labelledby="dir-label" />
  ```

### Patch Changes

- ff30974: Fix `@tailor-platform/app-shell/styles` so consumer Tailwind utilities like `bg-card`, `border-border`, and `text-muted-foreground` resolve again without requiring `theme.css`.

  `theme.css` remains a no-op compatibility shim, while `styles` now restores the Tailwind theme bridge and keeps the precompiled AppShell component CSS importable from a single entrypoint.

## 1.6.1

### Patch Changes

- 147aacf: Fix Vitest and other Node-evaluated test setups that import `@tailor-platform/app-shell` by keeping the package's JS entry free of CSS imports.

  `@tailor-platform/app-shell/styles` continues to ship the default AppShell styles and bundled Inter font assets. Applications should import that stylesheet explicitly, as shown in the docs and examples.

## 1.6.0

### Minor Changes

- 820b75b: Add `DocumentProgressCard` — a generic, presentational card for a document's lifecycle/fulfilment state: an optional headline percentage, a stacked progress bar, and a status legend driven by arbitrary `segments`. It's domain-agnostic, so it stretches to any status breakdown (shipped / cancelled / pending, PO received / returned / yet-to-receive, etc.).

  ```tsx
  import { DocumentProgressCard } from "@tailor-platform/app-shell";

  <DocumentProgressCard
    title="Shipment status"
    percent={60}
    segments={[
      { label: "Shipped", value: 30, color: "green" },
      { label: "Returned", value: 3, color: "red" },
      { label: "Pending", value: 17, color: "neutral" },
    ]}
  />;
  ```

  Each segment is `{ label, value, color }`. Pass an explicit `percent`, an optional `total` (leave a value larger than the segment sum to render an unfilled track remainder), and an optional `legend` override for when the legend should differ from the bar (e.g. overlapping buckets). Percentage and any domain-specific breakdown are derived in the consumer — see the docs for a purchase-order fulfilment recipe.

- d1cac39: Add `Grid` — a generic, presentational CSS-Grid layout primitive for arranging arbitrary children into equal or custom-width columns, with responsive reflow, gap control, auto-fit, and optional `Grid.Item` spanning. Complements `Layout` (page scaffold) by handling content-level grids.

  ```tsx
  import { Grid } from "@tailor-platform/app-shell";

  // Responsive KPI grid: 1 → 2 → 4 columns
  <Grid columns={{ initial: 1, sm: 2, lg: 4 }} gap={4}>
    <Card.Root>…</Card.Root>
  </Grid>

  // Auto-fitting gallery — no breakpoints needed
  <Grid minChildWidth={240} gap={6}>{items}</Grid>

  // Custom column widths + spanning
  <Grid columns="280px 1fr" gap={6}>
    <Grid.Item colSpan={2}>Wide</Grid.Item>
  </Grid>
  ```

  Props: `columns`, `rows`, `gap`/`gapX`/`gapY` (defaults to `3` / 12px), `minChildWidth`, `flow`, `align`, `justify`. `Grid.Item` supports `colSpan`, `rowSpan`, `colStart`, `colEnd` — all responsive.

- 2beb757: Add `align?: "left" | "center" | "right"` to `Table.Head` and `Table.Cell` so raw table primitives can align numeric and status columns without relying on consumer Tailwind utility overrides.

  ```tsx
  <Table.Head align="right">Amount</Table.Head>
  <Table.Cell align="right">123</Table.Cell>

  <Table.Head align="center">Status</Table.Head>
  <Table.Cell align="center">Active</Table.Cell>
  ```

- 116d2cc: Add a low-level AI Gateway client and a simple text-only chat hook for AppShell.

  ```tsx
  import { createAIGatewayClient, useAIChat } from "@tailor-platform/app-shell";

  const aiClient = createAIGatewayClient({ gatewayUri, authClient });
  const { messages, sendMessage, stop } = useAIChat({
    client: aiClient,
    model: "gpt-5-mini",
  });
  ```

- ae2396b: Add `useURLCollectionVariables` for wiring collection state (filters, sort, page size) to the URL query string in a single call. It seeds initial state from the current router search params and writes changes back as the user filters, sorts, or pages.

  ```tsx
  const { variables, control } = useURLCollectionVariables({
    tableMetadata,
    params: { pageSize: 20 },
  });
  ```

  For cases that need URL persistence without react-router's `useSearchParams` (e.g. a custom binding), the pure `withURLCollectionState(options, [searchParams, setSearchParams])` decorator is also exported and can be composed with `useCollectionVariables` directly.

  `useCollectionVariables` now reports state updates through `onParamsChange` using the same `params` shape it accepts.

### Patch Changes

- 40e0f1c: Restore the `@tailor-platform/app-shell/theme.css` export as a no-op compatibility shim.

  Apps that still import `@tailor-platform/app-shell/theme.css` alongside `@tailor-platform/app-shell/styles` now keep building while the real theme tokens continue to come from `styles`.

## 1.5.0

### Minor Changes

- 00f9aa7: Manage the browser tab from AppShell — title and favicon.

  - **Title**: AppShell now keeps `document.title` in sync with the active route as `"<page> · <title>"`, where `<page>` is the current breadcrumb leaf (including any `useOverrideBreadcrumb` override, so detail pages show their record name automatically) and `<title>` is the `title` prop passed to `<AppShell>`. Works for every page with no per-page wiring; when no `title` is set the tab shows just the page name.
  - **Favicon**: new `favicon` prop on `<AppShell>` sets the document favicon (any `<link rel="icon">` href — a public-path URL or a data URI). When omitted it defaults to the bundled Tailor favicon, so apps get correct branding out of the box.

  Both are rendered declaratively (React 19 hoists `<title>`/`<link rel="icon">` into `<head>`), so it works in client-only apps, streaming SSR, and Server Components.

  If your app already updates `document.title` manually, you can drop that wiring and let AppShell own the tab title. A host-page `<link rel="icon">` can remain in place unless you explicitly pass the new `favicon` prop.

- 5353303: Introduce theming support — **ColorTheme** axis, static **theme palettes** via CSS imports, a new `AppearanceSwitcher` component, and bundled Inter variable fonts.

  #### ColorTheme (end-user preference, persisted)

  `ColorTheme` (`"light" | "dark" | "system"`) is the end-user color mode preference. Applied to `<html>` as `.light` / `.dark` class.

  - `<AppShell defaultColorTheme="system">` sets the initial preference; user choice is persisted to localStorage.
  - `useTheme()` hook returns `{ theme, resolvedTheme, setTheme }`.

  #### Theme Palettes (static CSS imports)

  Each palette (`default`, `cream`, `bloom`) ships both light and dark variants.
  Select a palette by importing its CSS file — no prop needed:

  ```ts
  import "@tailor-platform/app-shell/themes/cream";
  ```

  The default palette is included automatically via `@tailor-platform/app-shell/styles`.

  #### AppearanceSwitcher

  - New `<AppearanceSwitcher />` component for toggling color theme (light / dark / system).

### Patch Changes

- 3d48b24: Remove `loader` from file-based page definitions (`Page.appShellPageProps`). This removes an accidentally exposed incomplete API and makes `guards` the single source of page-level route behavior in file-based routing.
- 3138c6a: Fix DataTable checkbox vertical alignment. Remove unnecessary wrapper div and `translate-y-[2px]` hack so checkboxes align correctly with row content via `align-middle`.
- 5353303: Set explicit `--accent` values per palette and mode, reorganise palette CSS into numbered tiers with a `_template.css` authoring guide, add `--alert-*` semantic tokens to the default palette, and wire `Alert` variants to those tokens (including lighter dark-mode foregrounds).
- Updated dependencies [3d48b24]
  - @tailor-platform/app-shell-vite-plugin@0.2.3

## 1.4.1

### Patch Changes

- f176477: Fix cursor consistency across `Button` and `Badge`:

  - **`Button`**: restore the pointer cursor. Tailwind v4 dropped the Preflight
    rule that gave `button`/`[role="button"]` a `cursor: pointer`, so the base
    `Button` showed the default arrow cursor while components that hardcode
    `astw:cursor-pointer` (e.g. `ActionPanel`) did not. Added `astw:cursor-pointer`
    to the `buttonVariants` base classes so all `Button` instances are consistent.
    Disabled buttons keep the default cursor via the existing
    `astw:disabled:pointer-events-none`.
  - **`Badge`**: pin `astw:cursor-default`. A `Badge` is non-interactive but
    renders a `<div>` with no cursor of its own, so it inherited `cursor: pointer`
    from clickable ancestors (e.g. a `DataTable` row with `onClickRow`). Explicitly
    setting the default cursor stops a badge from signalling clickability.

## 1.4.0

### Minor Changes

- 5a251fd: Add `Alert` compound component with `neutral`, `success`, `warning`, `error`, and `info` variants. Each variant renders a contextual icon automatically.

  ```tsx
  import { Alert } from "@tailor-platform/app-shell";

  <Alert.Root variant="success">
    <Alert.Title>Saved</Alert.Title>
    <Alert.Description>Your changes have been saved.</Alert.Description>
  </Alert.Root>;
  ```

- 49f10e3: Improve Sheet component customizability:

  - Add `size` prop to `Sheet.Content` for width variations (`sm`, `md`, `lg`, `xl`, `full`)
  - Add `action` prop to `Sheet.Header` for placing action buttons to the right of the title
  - Increase `Sheet.Title` font size to `text-lg` for better visibility
  - Move close button to the left side of the header, with title inline next to it
  - Header now has a bottom border, Footer has a top border for visual separation

  ```tsx
  <Sheet.Root side="right">
    <Sheet.Trigger render={<Button />}>Open</Sheet.Trigger>
    <Sheet.Content size="lg">
      <Sheet.Header action={<Button size="sm">Save</Button>}>
        <Sheet.Title>Edit Record</Sheet.Title>
      </Sheet.Header>
    </Sheet.Content>
  </Sheet.Root>
  ```

### Patch Changes

- 58b76ce: Add `info` and `subtle-info` badge variants for informational or in-progress status labels (blue palette, matching the existing `outline-info` dot color). Also extend the primitives demo to show all five outline variants (previously only `outline-success` was rendered).

  ```tsx
  <Badge variant="info">New</Badge>
  <Badge variant="subtle-info">In Progress</Badge>
  ```

- 98270c5: Add optional `variant` prop to `ActionItem` for the `ActionPanel` component. Use `variant: "destructive"` to style dangerous actions (e.g., delete) with red text and hover background.

## 1.3.0

### Minor Changes

- 902fad2: Add `Tabs` compound component for tab-based navigation, backed by Base UI's Tabs primitive.

  ```tsx
  import { Tabs } from "@tailor-platform/app-shell";

  <Tabs.Root defaultValue="overview">
    <Tabs.List>
      <Tabs.Tab value="overview">Overview</Tabs.Tab>
      <Tabs.Tab value="projects">Projects</Tabs.Tab>
    </Tabs.List>
    <Tabs.Panel value="overview">Overview content</Tabs.Panel>
    <Tabs.Panel value="projects">Projects content</Tabs.Panel>
  </Tabs.Root>;
  ```

- 2197c3f: Add array badge support to DataTable and DescriptionCard with shared `BadgeList` rendering and overflow popover.

  ```tsx
  // DataTable — badge column with array accessor
  column({
    ...infer("tags"),
    type: "badge",
    typeOptions: {
      badgeVariantMap: { Premium: "warning", Office: "outline-info" },
      maxVisible: 2,
    },
  })

  // DescriptionCard — array badges with maxVisible
  <DescriptionCard
    data={{ tags: ["urgent", "fragile", "international"] }}
    fields={[{
      key: "tags",
      label: "Tags",
      type: "badge",
      meta: {
        badgeVariantMap: { urgent: "error", fragile: "warning", international: "outline-info" },
        maxVisible: 2,
      },
    }]}
  />
  ```

  Additional changes:

  - Unify badge variant resolution into shared `resolveBadgeVariant()` utility with `"outline-neutral"` as the default variant (previously `"neutral"` in DataTable)
  - Export `BadgeVariant` and `BadgeOptions` types from the public API
  - `inferColumns()` no longer sets a default `render` function — columns without an explicit `type` or `render` now display `—` for null/empty values (aligns with typed-column behavior)
  - Deprecate `BadgeVariantType` in favor of `BadgeVariant`

### Patch Changes

- 4998df4: Fix and improve `DescriptionCard` component:

  - Fix relative date formatting producing incorrect output for future dates (negative time diff)
  - Add i18n label support for relative date strings
  - Use react-router `<Link>` for internal navigation in link and reference fields instead of plain `<a>` tags

- b70e3d5: Updated [@base-ui/react](https://www.npmjs.com/package/@base-ui/react) (1.4.1 -> 1.5.0)
- 99f6b6d: Updated [graphql](https://www.npmjs.com/package/graphql) (^16.13.2 -> ^16.14.0)

## 1.2.0

### Minor Changes

- 8a09b26: Add `align: "left" | "right"` to `DataTable` `Column`. When set to `"right"`, the header label, body cell, and loading-skeleton bar are right-aligned together — eliminating the inline `<span className="text-right">` wrappers callers were adding inside `render` for numeric columns (Amount, Score, Total).

  `align` is **auto-defaulted to `"right"` for `type: "number"` and `type: "money"`** so the common case Just Works without extra config. Other types default to `"left"`. Pass `"left"` explicitly to opt a numeric column out.

  ```tsx
  // Auto-aligned right — no `align` needed
  column({
    label: "Total",
    type: "money",
    accessor: (row) => row.total,
    typeOptions: { currency: "USD" },
  });

  // Explicit alignment for a custom-render column
  column({
    label: "Amount",
    align: "right",
    render: (row) => formatMoney(row.amount),
  });
  ```

- b644bdb: Add `truncate: boolean` to `DataTable` `Column`. When set, the cell content is truncated with an ellipsis on overflow, and an app-shell `<Tooltip>` is auto-wired to reveal the full value on hover when the cell value is a stringifiable primitive. The tooltip resolves through the same precedence rule the built-in `type` renderers use — `accessor` first, then `row[col.id]` — so `inferColumns` consumers get the tooltip for free without an explicit accessor. Pair `truncate` with `width` on neighboring columns to anchor row width, since truncate cells use `max-w-0` to stay shrinkable.

  ```tsx
  column({
    label: "Description",
    render: (row) => row.description,
    accessor: (row) => row.description,
    truncate: true,
  });

  // Or with `inferColumns`, no explicit `accessor` needed — the inferred
  // column pins `id` to the field name so the tooltip resolves automatically:
  column({ ...infer("description"), truncate: true });
  ```

  `inferColumns` now also pins `id` to the metadata field name (previously omitted). This makes the cell renderer's `row[col.id]` fallback resolve cleanly and stabilizes the React key / column-visibility identifier across re-renders.

- 4c89923: Add `defaultOpen` and `collapsible` props to `SidebarLayout` for controlling sidebar behavior.

  ```tsx
  // Sidebar closed by default on desktop
  <SidebarLayout defaultOpen={false} />

  // Non-collapsible sidebar (always visible, toggle buttons hidden)
  <SidebarLayout collapsible={false} />
  ```

- c4fbfa2: Add `type` and `typeOptions` to `DataTable` `Column` for built-in cell rendering. Set `type` to `text`, `number`, `money`, `date`, `badge`, or `link` to skip writing a `render` function for the common cases. `render` stays required for untyped columns and becomes an optional override when `type` is set.

  `Column<TRow>` is a discriminated union on `type`, so wrong-shape options are a compile error rather than silently ignored at runtime — and `type: "link"` requires `typeOptions.href`.

  ```tsx
  column({
    label: "Total",
    accessor: (row) => row.total,
    type: "money",
    typeOptions: { currency: "USD" },
  });

  column({
    label: "Status",
    accessor: (row) => row.status,
    type: "badge",
    typeOptions: {
      badgeVariantMap: { active: "success", draft: "neutral" },
      badgeLabelMap: { active: "Active", draft: "Draft" },
    },
  });
  ```

### Patch Changes

- c4fbfa2: Narrow `Column.accessor`'s return type per built-in `type` so the typed cell renderers reject values they can't display. Returning an array or a plain object from a `text` / `number` / `money` / `date` / `badge` / `link` accessor is now a compile error instead of silently rendering `[object Object]` or a stringified list. `null` and `undefined` are still allowed and continue to render the `—` placeholder. Columns without a `type` retain the loose `unknown` return type — they pair with `render` to draw whatever shape they like.

  ```tsx
  column({
    label: "Tags",
    type: "text",
    // ^ compile error: text accessor cannot return an array.
    accessor: (row) => row.tags,
  });
  ```

- eecff8e: Add `subtle-success`, `subtle-warning`, and `subtle-error` badge variants for low-emphasis status labels.

  ```tsx
  <Badge variant="subtle-success">Matched</Badge>
  <Badge variant="subtle-warning">Needs Attention</Badge>
  <Badge variant="subtle-error">Needs Review</Badge>
  ```

## 1.1.1

### Patch Changes

- d4d15f5: Add `DescriptionCard` badge field support for `meta.sentenceCaseBadges = false` so apps can opt out of the default sentence-case badge labels.

## 1.1.0

### Minor Changes

- 9654369: Fix root page (`/`) showing `"/"` as its title in `SidebarItem` and breadcrumb.

  The root page is now treated as a first-class page (module) so that title, icon, and guards are resolved consistently. `DefaultSidebar` and `CommandPalette` now include the root page when it is defined. When no title is set, the fallback is localized `"Home"` / `"ホーム"`.

- 39a8521: Change `useDataTable()` to use single-column sorting by default and add a `sort` option for configuring sorting behavior.

  Before:

  ```tsx
  const table = useDataTable({
    columns,
    data,
    control,
  });
  ```

  After:

  ```tsx
  const table = useDataTable({
    columns,
    data,
    control,
    sort: { multiple: true },
  });
  ```

  Use `sort: false` to disable sorting entirely.

- c2a50b9: Add row count and selection info to `DataTable.Pagination`.

  - When `total` is provided: shows `"X row(s)"`
  - When rows are selected with `total`: shows `"Y of X row(s) selected"`
  - When rows are selected without `total`: shows `"Y row(s) selected"`

- 642aa1e: Add case-sensitivity control for string filters in `DataTable.Filters`. String filters are now case-insensitive by default (using Tailor Platform's `regex` operator with `(?i)` prefix). A "Case sensitive" checkbox allows users to opt into exact-case matching.

  The `Filter` type and `CollectionControl.addFilter` now accept an optional `caseSensitive` property to control this behavior programmatically.

- a3d0170: Add "between" filter mode to `DataTable.Filters` for numeric and date/time columns, allowing users to filter by a range with min and max bounds.

### Patch Changes

- 2a860d9: Fix DataTable filter types for `datetime` and `time` fields. Previously these were incorrectly mapped to the `date` filter type, causing wrong input formats. Each temporal type now uses its proper HTML input type (`datetime-local`, `date`, `time`) and format handling.
- 125aee2: Fix a `Select.Async` bug where reopening the dropdown after the first async load could leave the popup invisible while the page stayed scroll-locked.

  This could happen after options were fetched once, the dropdown was closed, and then opened again. The fix cancels in-flight requests on close and avoids the Base UI modal and anchored alignment paths that were leaving the async popup in that broken reopen state.

- 681333f: Remove `next-themes` dependency by using the internal `ThemeProvider` context for the Sonner toast theming.
- 826bd97: Updated [@base-ui/react](https://www.npmjs.com/package/@base-ui/react) (^1.3.0 -> ^1.4.1)

## 1.0.2

### Patch Changes

- 27bb5df: Remove `richColors` prop from the `Toaster` component. Toast notifications will no longer use color-coded styling for success, error, warning, and info variants.
- Updated dependencies [ee7f7c7]
  - @tailor-platform/app-shell-vite-plugin@0.2.2

## 1.0.1

### Patch Changes

- 598bc90: Fix cursor-based pagination in `DataTable`.

  - Fix "Previous" button not working correctly when the GraphQL server returns unreliable `hasPreviousPage` (common with `first + after` queries per the Relay spec)
  - Fix navigating back after jumping to the last page incorrectly returning to page 1
  - Fix "Next" button remaining enabled past the last page when `total` is known

- 4aaf5ab: Fix "Go to Last Page" pagination alignment. When total items aren't evenly divisible by page size, `goToLastPage` now requests `last: total % pageSize` instead of `last: pageSize`, so the last page boundaries match forward pagination.

## 1.0.0

### Major Changes

- 3f31e8a: Add `DataTable` compound component. Also introduces `@tailor-platform/sdk-plugin-app-shell` — a companion SDK plugin that generates `tableMetadata` from TailorDB type definitions for use with `createColumnHelper`.

  ## DataTable

  - Sortable columns (click header to cycle Asc → Desc → off)
  - Filter chips with per-type editors (string, number, date, enum, boolean, uuid)
  - Cursor-based pagination with optional total-aware First/Last navigation
  - Per-row action menu (kebab menu)
  - Multi-row checkbox selection (current page only)
  - Loading, error, and empty states
  - Metadata-driven column inference via `createColumnHelper` and `inferColumns`

  ### Example with urql (Relay Cursor Connection GraphQL API)

  ```tsx
  import { gql, useQuery } from "urql";
  import {
    DataTable,
    useDataTable,
    useCollectionVariables,
    createColumnHelper,
  } from "@tailor-platform/app-shell";

  const LIST_JOURNALS = gql`
    query ListJournals(
      $after: String
      $before: String
      $first: Int
      $last: Int
      $order: [JournalOrderInput]
      $query: JournalQueryInput
    ) {
      journals(
        after: $after
        before: $before
        first: $first
        last: $last
        order: $order
        query: $query
      ) {
        edges {
          node {
            id
            contents
            authorID
          }
        }
        pageInfo {
          endCursor
          hasNextPage
          hasPreviousPage
          startCursor
        }
        total
      }
    }
  `;

  const { column } = createColumnHelper<{
    id: string;
    contents: string;
    authorID: string;
  }>();

  const columns = [
    column({ field: "id", label: "ID", type: "uuid" }),
    column({ field: "authorID", label: "Author", type: "string" }),
    column({ field: "contents", label: "Contents", type: "string" }),
  ];

  function JournalsPage() {
    // variables: { query, order, pagination } — maps directly to GraphQL variables.
    // control: holds filter/sort/pagination state and methods (addFilter, setSort, nextPage, …).
    //          Passing it to useDataTable wires UI interactions (column clicks, filter chips,
    //          pagination buttons) to state updates, which re-derive variables and re-run the query.
    const { variables, control } = useCollectionVariables({
      params: { pageSize: 20 },
    });

    // pagination holds { first, after? } (forward) or { last, before? } (backward).
    const [result] = useQuery({
      query: LIST_JOURNALS,
      variables: {
        first: variables.pagination.first,
        after: variables.pagination.after,
        last: variables.pagination.last,
        before: variables.pagination.before,
        query: variables.query,
        order: variables.order,
      },
    });

    const table = useDataTable({
      columns,
      data: result.data
        ? {
            rows: result.data.journals.edges.map((e) => e.node),
            pageInfo: result.data.journals.pageInfo,
            total: result.data.journals.total,
          }
        : undefined,
      loading: result.fetching,
      control,
    });

    // DataTable.Root + DataTable.Table are the only required sub-components.
    // DataTable.Toolbar / DataTable.Filters / DataTable.Pagination are opt-in sensible defaults.
    // If they don't fit, use useDataTableContext() to build your own sub-components —
    // it exposes the full DataTable state (rows, columns, sort, pagination, selection, etc.)
    // from the nearest DataTable.Root.
    return (
      <DataTable.Root value={table}>
        <DataTable.Toolbar>
          <DataTable.Filters />
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Footer>
          <DataTable.Pagination pageSizeOptions={[10, 20, 50]} />
        </DataTable.Footer>
      </DataTable.Root>
    );
  }
  ```

  `useCollectionVariables` is intentionally decoupled from DataTable and any other UI component. The hook owns only the query state and exposes plain `variables` — how those variables are rendered is entirely up to the consumer. This means future collection-based views such as Kanban boards can adopt the same hook without modification, and any custom component you build can use a GraphQL cursor-based API as its backend with minimal wiring.

  ## sdk-plugin (`@tailor-platform/sdk-plugin-app-shell`)

  `tableMetadata` is what bridges your TailorDB schema to the DataTable. It tells `inferColumns` how to render and filter each field — for example, which fields get a date picker, which get an enum dropdown (and with what options), and which are numeric. Without it, you would need to declare all of this manually per column.

  The metadata is generated at SDK code-gen time from your TailorDB type definitions. Register the plugin in `tailor.config.ts` and run `tailor-sdk generate`:

  ```ts
  import { definePlugins } from "@tailor-platform/sdk";
  import { appShellPlugin } from "@tailor-platform/sdk-plugin-app-shell";

  export const plugins = definePlugins(
    appShellPlugin({
      dataTable: {
        metadataOutputPath: "src/generated/app-shell-datatable.generated.ts",
      },
    })
  );
  ```

  The generated file exports `tableMetadata`, `tableNames`, and `TableName`. Pass `tableMetadata` to `inferColumns` to get type-safe column definitions with filter editors automatically configured:

  ```ts
  import { tableMetadata } from "@/generated/app-shell-datatable.generated";
  import { createColumnHelper } from "@tailor-platform/app-shell";

  const { column, inferColumns } = createColumnHelper<Order>();
  const infer = inferColumns(tableMetadata.order);

  const columns = [
    column(infer("title")), // string column → text filter
    column(infer("status")), // enum column  → dropdown filter with generated values
    column(infer("createdAt")), // datetime column → date picker filter
  ];
  ```

  ### Typed query variables with `tableMetadata`

  When using typed GraphQL documents (e.g. `TypedDocumentNode` from `@graphql-typed-document-node/core` or codegen-generated types), urql and other GraphQL clients enforce strict types on the `variables` object passed to `useQuery`. In that case, passing `tableMetadata` to `useCollectionVariables` is **required** — it is what narrows `variables.query` and `variables.order` from `unknown` to the precise types expected by the generated document.

  Without `tableMetadata`, `variables.query` is typed as `Record<string, Record<string, unknown>> | undefined`, which will not satisfy the stricter generated variable types and will cause a TypeScript error at the `useQuery` call site.

  Use `sdk-plugin` to generate `tableMetadata` and pass it to `useCollectionVariables`:

  ```ts
  const { variables, control } = useCollectionVariables({
    tableMetadata: tableMetadata.order, // required for typed documents
    params: { pageSize: 20 },
  });

  // variables.query is now BuildQueryVariables<typeof tableMetadata.order>
  // variables.order is now { field: OrderableFieldName; direction: "Asc" | "Desc" }[]
  // Both satisfy the types generated by GraphQL codegen.
  const [result] = useQuery({
    query: LIST_ORDERS, // TypedDocumentNode — variables are fully type-checked
    variables: {
      ...variables.pagination,
      query: variables.query,
      order: variables.order,
    },
  });
  ```

## 0.36.0

### Minor Changes

- e2a6f81: Add `Attachment` component and `useAttachment` hook for ERP attachment workflows with drag-and-drop upload, image/file previews, and per-item `Download`/`Delete` actions.

  Use `useAttachment` to manage upload/delete state locally and flush operations to your backend on submit via `applyChanges`. Spread the returned `props` directly onto `<Attachment />`.

  ```tsx
  import { Attachment, useAttachment } from "@tailor-platform/app-shell";
  import type { AttachmentOperation } from "@tailor-platform/app-shell";

  const { props, applyChanges } = useAttachment({
    initialItems: existingAttachments,
    accept: "image/*,.pdf",
  });

  async function handleSubmit() {
    // The component is agnostic to backend shape — run all operations in parallel.
    await applyChanges((operations) =>
      Promise.all(
        operations.map((op) => {
          if (op.type === "upload") return uploadToServer(op.file);
          if (op.type === "delete") return deleteFromServer(op.item.id);
        })
      )
    );
  }

  <Attachment {...props} uploadLabel="Upload" onDownload={handleDownload} />;
  ```

## 0.35.1

### Patch Changes

- 3b11ca4: Fix CommandPalette and DefaultSidebar not showing top-level pages that have no child pages.

  When using file-based routing with a flat page structure (e.g. `pages/dashboard/page.tsx` with no sub-pages), those pages were silently excluded from the CommandPalette and the DefaultSidebar auto-generation. They now appear correctly as navigable entries.

- 0d8d87e: Add top-padding in Card component"
- 8c0eed5: Adjust `Table` cell padding so the first column uses 24px left inset and the last column uses 24px right inset (middle columns unchanged). Update `Card.Header` titles to `text-lg` to align with `DescriptionCard`, `ActivityCard`, and `ActionPanel`.
- e841014: Enable richColors in toast

## 0.35.0

### Minor Changes

- d284d6a: Add `searchSources` prop to `AppShell` to wire async, prefix-based search into the CommandPalette. Each source declares a short `prefix` (e.g. `"ORD"`) and an async `search` function. When the user types that prefix followed by `:`, the palette switches into search mode: Actions and Pages sections are hidden and only results from that source are shown.

  The empty-input state of the palette now includes a **Search Modes** section that lists every registered source, so users can discover and activate a mode with a single click instead of remembering the prefix syntax.

  `DefaultSidebar` always renders a **Search** entry that opens the palette (Cmd+K also works globally), because routes and registered actions are always searchable regardless of whether any `searchSources` are configured.

  ```tsx
  import { AppShell, type SearchSource } from "@tailor-platform/app-shell";

  const searchSources: readonly SearchSource[] = [
    {
      prefix: "ORD",
      title: "Orders",
      search: async (query, { signal }) => {
        const results = await api.searchOrders(query, { signal });
        return results.map((o) => ({
          key: o.id,
          label: o.number,
          path: `/orders/${o.id}`,
        }));
      },
    },
  ];

  <AppShell searchSources={searchSources}>
    <SidebarLayout sidebar={<DefaultSidebar />} />
  </AppShell>;
  ```

### Patch Changes

- 5dc2d7f: Dependencies updated

  - Updated [react](https://www.npmjs.com/package/react) (^19.2.4 -> ^19.2.5)
  - Updated [react-dom](https://www.npmjs.com/package/react-dom) (^19.2.4 -> ^19.2.5)

- 202f046: Updated [react-router](https://www.npmjs.com/package/react-router) (^7.14.0 -> ^7.14.1)
- 307c4ef: Updated [lucide-react](https://www.npmjs.com/package/lucide-react) (^1.7.0 -> ^1.8.0)
- b5e4352: Fixed a bug where placing a guard component between `AuthProvider` and `AppShell` could block `AppShell` from mounting, preventing the authentication flow from ever starting and leaving the app stuck in an unauthenticated state.

## 0.34.0

### Minor Changes

- 0dac517: Add contextual action registration for CommandPalette via `useRegisterCommandPaletteActions` hook. `ActionPanel` actions are now automatically registered to the CommandPalette, making them discoverable and triggerable via keyboard shortcut.

  ```tsx
  import { useRegisterCommandPaletteActions } from "@tailor-platform/app-shell";

  function MyPage() {
    useRegisterCommandPaletteActions("My Page", [
      { key: "save", label: "Save", onSelect: handleSave },
    ]);
  }
  ```

- c6afaca: Add `CsvImporter` component — a guided, multi-step CSV import flow with drag-and-drop upload, interactive column mapping, Standard Schema validation, inline cell editing, and async server-side validation support.

  Key features:

  - **Drag & drop upload** with file size limit enforcement
  - **Auto column matching** via aliases and fuzzy header detection
  - **Standard Schema validation** with built-in `csv.string()`, `csv.number()`, `csv.boolean()`, `csv.date()`, and `csv.enum()` validators that handle coercion and validation in one step
  - **Inline error correction** — users can fix validation errors directly in the review table before importing
  - **Async `onValidate`** callback for server-side checks (e.g. uniqueness constraints)
  - **Built-in i18n support** — English and Japanese labels included out of the box

  ```tsx
  import {
    CsvImporter,
    useCsvImporter,
    csv,
    type CsvCellIssue,
  } from "@tailor-platform/app-shell";

  const { open, props } = useCsvImporter({
    schema: {
      // Each column defines a mapping target for CSV headers
      columns: [
        {
          // Becomes the object key in parsed row data
          key: "name",
          // Display label shown in the mapping UI
          label: "Name",
          // Must be mapped to a CSV header before proceeding
          required: true,
          // Alternative CSV header names for auto-matching
          aliases: ["product_name"],
          // Standard Schema validator — coerces and validates in one step
          schema: csv.string({ min: 1 }),
        },
        {
          key: "price",
          label: "Price",
          schema: csv.number({ min: 0 }), // Coerces the raw CSV string to a number and rejects NaN
        },
        {
          key: "active",
          label: "Active",
          schema: csv.boolean(), // Recognises "true"/"1"/"yes" and "false"/"0"/"no" (case-insensitive)
        },
      ],
    },

    // Async callback invoked after schema validation passes.
    // Use it for server-side checks such as uniqueness or foreign-key lookups.
    onValidate: async (rows) => {
      // Async API request that returns CsvCellIssue[] — shown inline in the review table
      return await validateOnServer(rows);
    },

    // Called when the user confirms the import after resolving all errors.
    // `event` contains the final rows, mappings, corrections, and summary stats.
    onImport: async (event) => {
      // buildRows() returns typed rows inferred from the schema definition.
      // e.g. { name: string; price: number; active: boolean }[]
      const rows = await event.buildRows();
      await saveToBackend(rows);
    },
  });

  // open() opens the import drawer
  <Button onClick={open}>Import CSV</Button>

  // Renders a multi-step flow CSV importer component in drawer
  <CsvImporter {...props} />
  ```

### Patch Changes

- 6a39f50: Updated [react-router](https://www.npmjs.com/package/react-router) (^7.13.1 -> ^7.14.0)
- dc4b24b: Updated [lucide-react](https://www.npmjs.com/package/lucide-react) (^0.577.0 -> ^1.7.0)
- 3dd41da: Improve authentication initialization

  - Avoids React strict mode double-invocation issues by running auth side effects outside of React's lifecycle
  - OAuth redirections are now handled before component rendering, eliminating unnecessary UI renders during the callback flow

- Updated dependencies [01984ee]
  - @tailor-platform/app-shell-vite-plugin@0.2.1

## 0.33.0

### Minor Changes

- 6f5c23f: **Breaking:** `AsyncFetcherFn` now receives `string | null` instead of `string` as the `query` parameter.

  The fetcher is called with `null` when the user has not typed anything (e.g. the dropdown was just opened or the input was cleared). Return initial/default items for `null`, or return an empty array to show nothing until the user starts typing.

  `useAsync` also now returns an `onOpenChange` handler that triggers `fetcher(null)` on the first open, so `Combobox.Async` shows initial items immediately when the dropdown opens.

  ```tsx
  // Before
  const fetcher = async (query: string, { signal }) => { ... };

  // After
  const fetcher = async (query: string | null, { signal }) => {
    const res = await fetch(`/api/items?q=${query ?? ""}`, { signal });
    return res.json();
  };
  ```

- 7917328: Add `useOverrideBreadcrumb` hook for dynamically overriding breadcrumb titles from within page components. This is useful for displaying data-driven titles (e.g., record names) instead of static route-based titles.

  With `defineResource`:

  ```tsx
  import { useOverrideBreadcrumb } from "@tailor-platform/app-shell";

  defineResource({
    path: ":id",
    component: () => {
      const { data } = useQuery(GET_ORDER, { variables: { id } });

      // Update breadcrumb with the order name
      useOverrideBreadcrumb(data?.order?.name);

      return <OrderDetail />;
    },
  });
  ```

  With file-based routing (`pages/orders/[id]/page.tsx`):

  ```tsx
  import { useOverrideBreadcrumb, useParams } from "@tailor-platform/app-shell";

  const OrderDetailPage = () => {
    const { id } = useParams();
    const { data } = useQuery(GET_ORDER, { variables: { id } });

    // Update breadcrumb with the order name
    useOverrideBreadcrumb(data?.order?.name);

    return <div>...</div>;
  };

  export default OrderDetailPage;
  ```

- 58f8024: Fix guards defined via `appShellPageProps` being silently ignored in file-based routing. Guards now correctly produce route loaders for both root and non-root pages.

### Patch Changes

- 1cad50d: Fix portal-based components (`Menu`, `Select`, `Combobox`, `Autocomplete`, `Tooltip`) rendering behind the sidebar by establishing a stacking context on each portal container.

  Centralize all z-index values into CSS custom properties (`--z-sidebar`, `--z-sidebar-rail`, `--z-popup`, `--z-overlay`) defined in `globals.css`.

- afec4f7: Updated [graphql](https://www.npmjs.com/package/graphql) (^16.13.0 -> ^16.13.2)

## 0.32.0

### Minor Changes

- 3c1e939: Add `ActivityCard` APIs for both simple and advanced use cases:

  - Standalone API (`<ActivityCard />`) for quick timeline rendering with sensible defaults
  - Compound API (`ActivityCard.Root` / `.Items` / `.Item`) for fully custom item rendering (icons, links, buttons, badges, mixed item kinds)

  ## Standalone API

  ```tsx
  import { ActivityCard } from "@tailor-platform/app-shell";

  <ActivityCard
    items={items}
    title="Updates"
    maxVisible={6}
    overflowLabel="more"
    groupBy="day"
  />;
  ```

  ## Compound API

  ```tsx
  import { ActivityCard, Badge } from "@tailor-platform/app-shell";
  import type { ActivityCardBaseItem } from "@tailor-platform/app-shell";

  interface MyItem extends ActivityCardBaseItem {
    kind: "approval" | "update";
    label?: string;
    message?: string;
  }

  <ActivityCard.Root items={items} title="Updates" groupBy="day">
    <ActivityCard.Items<MyItem>>
      {(item) =>
        item.kind === "approval" ? (
          <ActivityCard.Item indicator={<ApprovedIcon />}>
            <p>{item.label}</p>
            <Badge variant="default">Complete</Badge>
          </ActivityCard.Item>
        ) : (
          <ActivityCard.Item>
            <p>{item.message}</p>
            <a href="#">View changes</a>
          </ActivityCard.Item>
        )
      }
    </ActivityCard.Items>
  </ActivityCard.Root>;
  ```

  Each item must satisfy `ActivityCardBaseItem` (`id` + `timestamp`). Items without an `indicator` render a default timeline node. The `indicator` prop accepts any `ReactNode` (avatars, icons, etc.).

- 3c1e939: Add `Avatar` (Base UI): `Avatar.Root`, `Avatar.Image`, and `Avatar.Fallback` with `size` variants (`sm`, `default`, `lg`) and exported `avatarVariants` and `AvatarProps`. `ActivityCard` uses this shared avatar; export `ActivityCardItem` from the package root for typed activity lists.

  ```tsx
  import { Avatar } from "@tailor-platform/app-shell";

  export function UserAvatar() {
    return (
      <Avatar.Root>
        <Avatar.Image src="/user.png" alt="" />
        <Avatar.Fallback>AB</Avatar.Fallback>
      </Avatar.Root>
    );
  }
  ```

- 693d8aa: Add `xs` size variant to `Button` component — a compact extra-small button (`h-7`, `text-xs`) for inline actions within cards and tight layouts.

  ```tsx
  <Button size="xs" variant="outline">
    Resubmit
  </Button>
  ```

- 497be49: Add `Card` compound component (`Card.Root`, `Card.Header`, `Card.Content`) as a general-purpose container with consistent styling. Existing card-style components (`DescriptionCard`, `MetricCard`, `ActionPanel`) now use `Card` internally.

  ```tsx
  import { Card } from "@tailor-platform/app-shell";

  <Card.Root>
    <Card.Header title="Order Details" description="Summary of order #1234" />
    <Card.Content>
      <p>Content goes here</p>
    </Card.Content>
  </Card.Root>;
  ```

- ea4b256: Add `Form`, `Fieldset`, and `Field` components for building validated forms.

  ### `Form`

  A form element with consolidated error handling and validation. Supports `onFormSubmit` for type-safe parsed form values, and `onSubmit` for native `FormEvent` access. External errors (e.g. API responses) can be fed via the `errors` prop and are automatically routed to matching `Field.Error` components.

  ```tsx
  <Form onFormSubmit={(values) => save(values)}>
    <Field.Root name="email">
      <Field.Label>Email</Field.Label>
      <Field.Control type="email" required />
      <Field.Error match="typeMismatch">Enter a valid email.</Field.Error>
    </Field.Root>
    <button type="submit">Save</button>
  </Form>
  ```

  ### `Fieldset`

  A compound component (`Fieldset.Root`, `Fieldset.Legend`) for grouping related fields with a shared legend for accessible form sectioning.

  ```tsx
  <Fieldset.Root>
    <Fieldset.Legend>Billing details</Fieldset.Legend>
    <Field.Root name="company">
      <Field.Label>Company</Field.Label>
      <Field.Control />
    </Field.Root>
  </Fieldset.Root>
  ```

  ### `Field`

  A compound component (`Field.Root`, `Field.Label`, `Field.Control`, `Field.Description`, `Field.Error`, `Field.Validity`) that groups all parts of a form field and manages its validation state.

  `Field.Root` creates a Field context boundary. All child sub-components (`Field.Label`, `Field.Control`, `Field.Description`, `Field.Error`, `Field.Validity`) and any Base UI-backed AppShell component (e.g. Select, Combobox, Autocomplete) placed inside `Field.Root` automatically connect to this context — inheriting label association (`htmlFor`), `aria-describedby`, disabled state, and validation state (`invalid`, `dirty`, `touched`).

  `Field.Control` is a styled `<input>` that shares its base styles with the `Input` component. It can be omitted when using another AppShell input component (e.g. Select, Combobox, Autocomplete) as a sibling — those components register themselves with the Field context automatically. It also supports native HTML constraint attributes (`required`, `type="email"`, `pattern`, etc.) for built-in validation.

  ```tsx
  <Field.Root name="email">
    <Field.Label>Email</Field.Label>
    <Field.Control type="email" required />
    <Field.Description>We'll never share your email.</Field.Description>
    <Field.Error match="typeMismatch">Please enter a valid email.</Field.Error>
  </Field.Root>
  ```

  #### Using another AppShell component as the control

  `Field.Control` can be omitted when using a Base UI-backed AppShell component (e.g. Select, Combobox). The component registers itself with the Field context automatically, inheriting label association and validation state.

  ```tsx
  <Field.Root name="country">
    <Field.Label>Country</Field.Label>
    <Select>
      <Select.Trigger>
        <Select.Value placeholder="Select a country" />
      </Select.Trigger>
      <Select.Popup>
        <Select.Item value="jp">Japan</Select.Item>
        <Select.Item value="us">United States</Select.Item>
      </Select.Popup>
    </Select>
    <Field.Error>Please select a country.</Field.Error>
  </Field.Root>
  ```

  #### Custom rendering with `Field.Validity`

  `Field.Validity` exposes the field's `ValidityState` via a render callback, allowing fully custom validation UI.

  ```tsx
  <Field.Root name="password">
    <Field.Label>Password</Field.Label>
    <Field.Control type="password" required minLength={8} />
    <Field.Validity>
      {(state) => (
        <ul>
          <li>{state.validity.valueMissing ? "❌" : "✅"} Required</li>
          <li>{state.validity.tooShort ? "❌" : "✅"} At least 8 characters</li>
        </ul>
      )}
    </Field.Validity>
  </Field.Root>
  ```

  ### React Hook Form + Zod integration

  `Field.Root` accepts `isTouched`, `isDirty`, `invalid`, and `error` props that align with RHF's `fieldState` shape, so you can spread `fieldState` directly. Use `Form`'s `onSubmit` prop to connect RHF's `handleSubmit`.

  ```tsx
  import { useForm, Controller } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { z } from "zod";

  const schema = z.object({ email: z.string().email() });

  function MyForm() {
    const { control, handleSubmit } = useForm({
      resolver: zodResolver(schema),
    });

    return (
      <Form onSubmit={handleSubmit((data) => save(data))}>
        <Controller
          name="email"
          control={control}
          render={({ field, fieldState }) => (
            <Field.Root {...fieldState}>
              <Field.Label>Email</Field.Label>
              <Field.Control {...field} />
              <Field.Error>{fieldState.error?.message}</Field.Error>
            </Field.Root>
          )}
        />
        <button type="submit">Save</button>
      </Form>
    );
  }
  ```

  The Field context co-exists with RHF — it only drives accessibility wiring (`htmlFor`, `aria-describedby`) and visual state (`data-invalid`, `data-dirty`, `data-touched`) without interfering with RHF's value management or validation lifecycle.

- 524d49a: Add `MetricCard` component for dashboard KPI summaries (title, value, optional trend and description).

  ```tsx
  import { MetricCard } from "@tailor-platform/app-shell";

  <MetricCard
    title="Net total payment"
    value="$1,500.00"
    trend={{ direction: "up", value: "+5%" }}
    description="vs last month"
  />;
  ```

- 135d5a9: Render module-level breadcrumb segments as non-clickable text when the module has no component.
  Modules defined without a `component` (group-only modules) now display their breadcrumb as plain text instead of a link, preventing navigation to non-existent pages.

### Patch Changes

- 6dec130: Add `color-scheme: dark` to the `.dark` selector in theme CSS so that native form controls (e.g. `<select>`) render correctly in dark mode on Windows.
- ae37125: Fix `breadcrumbTitle` not being propagated in file-based routing. The `breadcrumbTitle` set in `AppShellPageProps.meta` is now correctly reflected in breadcrumbs, matching the behavior of the `defineResource` API.
- 49e2e3a: Fix `DefaultSidebar` not applying active style when `basePath` is not specified. The sidebar now correctly normalizes URLs before comparing with the current pathname, ensuring the active highlight appears on the correct menu item.
- 10c0cd3: Add `min-h-0` to `SidebarInset` so that nested content areas can scroll independently instead of causing the entire page to scroll.

## 0.31.1

### Patch Changes

- e81fbd7: Updated [react-router](https://www.npmjs.com/package/react-router) (^7.4.0 -> ^7.13.1)
- Updated dependencies [01a2249]
  - @tailor-platform/app-shell-vite-plugin@0.2.0

## 0.31.0

### Minor Changes

- e7a1177: Add `Menu`, `Select`, `Combobox`, and `Autocomplete` components.

  ## New components

  ```tsx
  import {
    Menu,
    Select,
    Combobox,
    Autocomplete,
  } from "@tailor-platform/app-shell";
  ```

  ### Menu

  Dropdown menu with compound component API (`Menu.Root`, `Menu.Trigger`, `Menu.Content`, `Menu.Item`, etc.). Supports checkbox/radio items, grouped items, separators, and nested sub-menus via `Menu.SubmenuRoot` / `Menu.SubmenuTrigger`.

  ```tsx
  <Menu.Root>
    <Menu.Trigger>Open menu</Menu.Trigger>
    <Menu.Content>
      <Menu.Item>Edit</Menu.Item>
      <Menu.Item>Duplicate</Menu.Item>
      <Menu.Separator />
      <Menu.Item>Delete</Menu.Item>
    </Menu.Content>
  </Menu.Root>
  ```

  ### Select

  Single or multi-select dropdown. Pass `items` and get a fully assembled select out of the box. Also supports async data fetching via `Select.Async`.

  ```tsx
  <Select
    items={["Apple", "Banana", "Cherry"]}
    placeholder="Pick a fruit"
    onValueChange={(value) => console.log(value)}
  />
  ```

  ### Combobox

  Searchable combobox with single/multi selection. Pass `items` and get a fully assembled combobox with built-in filtering. Supports async data fetching via `Combobox.Async` and user-created items via `onCreateItem` prop.

  ```tsx
  <Combobox
    items={["Apple", "Banana", "Cherry"]}
    placeholder="Search fruits..."
    onValueChange={(value) => console.log(value)}
  />
  ```

  ### Autocomplete

  Text input with a suggestion list. The value is the raw input string, not a discrete item selection. Also supports async suggestions via `Autocomplete.Async`.

  ```tsx
  <Autocomplete
    items={["Apple", "Banana", "Cherry"]}
    placeholder="Type a fruit..."
    onValueChange={(value) => console.log(value)}
  />
  ```

  ### Low-level primitives via `.Parts`

  `Select`, `Combobox`, and `Autocomplete` each expose a `.Parts` namespace containing the styled low-level sub-components (e.g. `Root`, `Input`, `Content`, `Item`, `List`, etc.) and hooks (`useFilter`, `useAsync`, `useCreatable`) for building fully custom compositions when the ready-made component doesn't fit your needs.

  ```tsx
  const { Root, Trigger, Content, Item } = Select.Parts;
  ```

### Patch Changes

- 8e11a5e: Updated [lucide-react](https://www.npmjs.com/package/lucide-react) (^0.562.0 -> ^0.577.0)

## 0.30.0

### Minor Changes

- a8c5dcf: Export primitive UI components (`Button`, `Input`, `Table`, `Dialog`, `Sheet`, `Tooltip`) and update `@base-ui/react` to v1.3.0.

  ## New components

  ```tsx
  import {
    Button,
    Input,
    Table,
    Dialog,
    Sheet,
    Tooltip,
  } from "@tailor-platform/app-shell";
  ```

  ### Button

  Styled button with variant (`default`, `outline`, `destructive`, etc.) and size options.

  ```tsx
  <Button variant="outline" size="sm">
    Click me
  </Button>
  ```

  ### Input

  Styled text input with consistent theming.

  ```tsx
  <Input placeholder="Enter your name" />
  ```

  ### Dialog

  Modal dialog with compound component API (`Dialog.Root`, `Dialog.Content`, etc.).

  ```tsx
  <Dialog.Root>
    <Dialog.Trigger render={<Button />}>Open</Dialog.Trigger>
    <Dialog.Content>
      <Dialog.Title>Confirm</Dialog.Title>
      <Dialog.Description>Are you sure?</Dialog.Description>
      <Dialog.Footer>
        <Dialog.Close render={<Button variant="outline" />}>
          Cancel
        </Dialog.Close>
        <Button>Confirm</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
  ```

  ### Sheet

  Slide-in panel backed by Drawer with native swipe-to-dismiss gesture support.

  ```tsx
  <Sheet.Root side="right">
    <Sheet.Trigger render={<Button />}>Open</Sheet.Trigger>
    <Sheet.Content>
      <Sheet.Title>Settings</Sheet.Title>
    </Sheet.Content>
  </Sheet.Root>
  ```

  ### Tooltip

  Hover/focus tooltip with configurable placement and delay via `Tooltip.Provider`.

  ```tsx
  <Tooltip.Root>
    <Tooltip.Trigger render={<Button />}>Hover me</Tooltip.Trigger>
    <Tooltip.Content>Help text</Tooltip.Content>
  </Tooltip.Root>
  ```

  ### Table

  Semantic HTML table with pre-styled header, body, and footer sub-components.

  ```tsx
  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.Head>Name</Table.Head>
        <Table.Head>Email</Table.Head>
        <Table.Head>Role</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      <Table.Row>
        <Table.Cell>Alice</Table.Cell>
        <Table.Cell>alice@example.com</Table.Cell>
        <Table.Cell>Admin</Table.Cell>
      </Table.Row>
    </Table.Body>
  </Table.Root>
  ```

  ## Other changes

  - `DescriptionCard`, `Layout`, and `Layout.Column` now accept an optional `style` prop for inline styles.
  - Fixed Dialog and Sheet overlay flashing on close animation.
  - Fixed missing `astw:` prefixes on sidebar utility classes that caused mobile sidebar UI bugs.

## 0.29.0

### Minor Changes

- fc59c8a: Add ActionPanel component for ERP-style action lists.

  **ActionPanel** — Card with a title and vertical list of actions (icon + label). Each row is a button triggered via `onClick`. The panel uses full width of its parent by default.

  ### Example

  ```tsx
  import { ActionPanel } from "@tailor-platform/app-shell";

  <ActionPanel
    title="Actions"
    actions={[
      {
        key: "create",
        label: "Create new invoice",
        icon: <ReceiptIcon />,
        onClick: () => openCreateModal(),
      },
      {
        key: "docs",
        label: "View documentation",
        icon: <DocIcon />,
        onClick: () => window.open("/docs", "_blank", "noopener,noreferrer"),
      },
    ]}
  />;
  ```

- 3e36ece: Allow modules and resources without a component for path-only definitions

  Modules and resources can now be defined without a `component`, both via `defineModule()`/`defineResource()` and file-based routing. This is useful when a directory exists solely to group child routes under a shared path prefix.

  Accessing a component-less path directly returns a 404 response, while child routes remain accessible as normal.

  ```tsx
  // Module without component — groups child resources under a shared path
  defineModule({
    path: "admin",
    meta: { title: "Admin" },
    resources: [
      defineResource({ path: "users", component: () => <Users /> }),
      defineResource({ path: "roles", component: () => <Roles /> }),
    ],
  });
  // /admin → 404
  // /admin/users → renders Users
  // /admin/roles → renders Roles

  // Resource without component — groups sub-resources under a namespace
  defineResource({
    path: "namespace",
    subResources: [
      defineResource({ path: "page-a", component: () => <div>Page A</div> }),
    ],
  });
  // /namespace → 404
  // /namespace/page-a → renders Page A
  ```

  For file-based routing, simply omit `page.tsx` from a directory:

  ```
  pages/
    admin/
      users/
        page.tsx   ← /admin/users renders this
      roles/
        page.tsx   ← /admin/roles renders this
      (no page.tsx for /admin itself → 404)
  ```

  Guards on component-less routes now execute correctly. Previously, guard loaders were silently ignored when no component was present. Now, guards such as `redirectTo()` will fire as expected, and if all guards return `pass()`, the route falls back to a 404.

- 565ae70: Add `Layout.Header` sub-component and `area` prop to `Layout.Column`.

  ## Motivation

  The current `Layout` component requires a `columns` prop that must exactly match the number of `Layout.Column` children, and embeds header concerns (`title`, `actions`) directly into the layout component. This coupling creates several issues:

  - **Redundant declaration** — The column count can be inferred from the number of `Layout.Column` children, making the `columns` prop unnecessary boilerplate.
  - **Limited column placement** — The 2-column template always treats the 1st column as main (flex) and the 2nd as a fixed sidebar. There is no way to express a "left sidebar + main content" layout.
  - **Mixed responsibilities** — `Layout` handles both page heading (title/actions) and column arrangement. Separating these into `Layout.Header` and `Layout.Column` makes each concern independently composable — for example, placing tabs between the header and columns.

  ## What's New

  - **`Layout.Header`**: Compose inside `Layout` for title, actions, and extra content (e.g. tabs) above columns.
  - **`Layout.Column` `area` prop**: Declare column roles (`left`, `main`, `right`) for area-based width templates, enabling layouts like left sidebar + main that were previously not possible.
  - **`columns` and `gap` props are deprecated**: Column count is auto-detected from children; use `className` for gap.
  - **No runtime breaking changes** — existing code continues to work as-is. Note: `columns` is now optional, so code that directly reads `LayoutProps["columns"]` as a non-optional type will need adjustment.

  ## Usage

  ```tsx
  // With Layout.Header (title, actions, and extra content such as tabs)
  <Layout className="gap-6">
    <Layout.Header title="Edit" actions={[<Button key="save">Save</Button>]}>
      <Tabs>...</Tabs>   {/* Renders below title/actions, above Columns */}
    </Layout.Header>
    <Layout.Column>Main content</Layout.Column>
    <Layout.Column>Side panel</Layout.Column>
  </Layout>

  // With area prop (Left + Main)
  <Layout>
    <Layout.Column area="left">Side nav</Layout.Column>
    <Layout.Column area="main">Main content</Layout.Column>
  </Layout>

  // With area prop (3 columns)
  <Layout>
    <Layout.Column area="left">Left panel</Layout.Column>
    <Layout.Column area="main">Main content</Layout.Column>
    <Layout.Column area="right">Right panel</Layout.Column>
  </Layout>

  // Existing API still works
  <Layout title="Edit" actions={[<Button key="save">Save</Button>]} columns={2}>
    <Layout.Column>Main content</Layout.Column>
    <Layout.Column>Side panel</Layout.Column>
  </Layout>
  ```

  ## Sub-components

  | Component       | Status   | Props                                                           |
  | --------------- | -------- | --------------------------------------------------------------- |
  | `Layout.Column` | Retained | `area?: "left" \| "main" \| "right"`, `className?`, `children?` |
  | `Layout.Header` | **New**  | `title?`, `actions?: ReactNode[]`, `children?: ReactNode`       |

  ## Children Rules

  - **`Layout.Header`** — At most one. If multiple are provided, only the first is rendered.
  - **`Layout.Column`** — 1–3 columns use position-based or area-based width templates. 4+ columns use equal-width (`repeat(N, 1fr)`).
  - **`area` prop** — When any column specifies `area`, all columns switch to area-based widths. Columns without `area` default to `1fr`.
  - **Anything else** — Silently filtered out (not rendered).

  ## Width Templates

  ### Position-based (no `area`, unchanged from current API)

  | Column Count | Responsive Behavior                        | Width Distribution                           |
  | ------------ | ------------------------------------------ | -------------------------------------------- |
  | 1            | Always stacked vertically                  | Full width                                   |
  | 2            | < 1024px: stacked / ≥ 1024px: side-by-side | 1st flex-1, 2nd fixed 280px                  |
  | 3            | < 1280px: stacked / ≥ 1280px: side-by-side | 1st fixed 320px, 2nd flex-1, 3rd fixed 280px |
  | 4+           | < 1280px: stacked / ≥ 1280px: side-by-side | All columns equal width (`repeat(N, 1fr)`)   |

  ### Area-based (with `area` prop)

  | Area    | Width       |
  | ------- | ----------- |
  | `left`  | Fixed 320px |
  | `main`  | flex-1      |
  | `right` | Fixed 280px |

  Responsive behavior is the same: 2 columns break at 1024px, 3+ columns break at 1280px.

## 0.28.0

### Minor Changes

- 4cb5295: Replaced `getAuthHeadersForQuery` with `auth-public-client` 0.5.0's built-in `fetch()` method.

  **Breaking change:** `EnhancedAuthClient.getAuthHeadersForQuery()` has been removed. Use `authClient.fetch` instead, which transparently handles DPoP proof generation and token refresh.

  **Migration:**

  ```diff
   const urqlClient = createClient({
     url: `${authClient.getAppUri()}/query`,
  -  fetchOptions: async () => {
  -    const headers = await authClient.getAuthHeadersForQuery();
  -    return { headers };
  -  },
  +  fetch: authClient.fetch,
   });
  ```

## 0.27.3

### Patch Changes

- 10cb588: Remove horizontal padding in Layout component
- 24f8eb1: Updated [es-toolkit](https://www.npmjs.com/package/es-toolkit) (^1.44.0 -> ^1.45.1)

## 0.27.2

### Patch Changes

- b01718f: Updated [graphql](https://www.npmjs.com/package/graphql) (^16.12.0 -> ^16.13.0)
- ed5f14f: Fixed incorrect `types` path in `package.json` exports. The `"."` entry was pointing to `./dist/index.d.ts` which does not exist. Updated to `./dist/app-shell.d.ts` to match the actual build output.
- d0dc61b: Reorganized README and documentation structure for public-facing clarity. Added `docs/quickstart.md`, created NPM-facing `packages/core/README.md` with motivation and feature highlights, and ensured each documentation layer (root README, package READMEs, docs/) serves a distinct purpose.

## 0.27.1

### Patch Changes

- e1a12c8: Migrated internal UI primitives from Radix UI/shadcn to Base UI.

  **Updated dependencies:**

  - Removed: `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`
  - Added: `@base-ui/react` (^1.2.0)

  This is an internal refactoring with no changes to the public API.

## 0.27.0

### Minor Changes

- a7f686f: Adds new Sidebar custom items API for flexible sidebar navigation customization.

  ## New Components

  - `SidebarItem` - Navigation item that auto-resolves title/icon from resource meta
  - `SidebarGroup` - Collapsible group for organizing navigation items
  - `SidebarSeparator` - Visual separator between sidebar sections
  - `WithGuard` - Conditional rendering wrapper based on guard functions

  ## New Hook

  - `usePageMeta` - Hook to access current page metadata (title, icon)

  ## Usage

  ```tsx
  import {
    SidebarLayout,
    DefaultSidebar,
    SidebarItem,
    SidebarGroup,
    SidebarSeparator,
  } from "@tailor-platform/app-shell";

  // Auto-resolved navigation from resource definitions (DefaultSidebar is used by default)
  <SidebarLayout />

  // Fully customized sidebar navigation
  <SidebarLayout
    sidebar={
      <DefaultSidebar>
        <SidebarItem to="/dashboard" />
        <SidebarSeparator />
        <SidebarGroup title="Products" icon={<Package />}>
          <SidebarItem to="/products/all" />
          <SidebarItem to="/products/categories" />
        </SidebarGroup>
        <SidebarItem to="https://docs.example.com" external />
      </DefaultSidebar>
    }
  />

  // Custom rendering with render prop
  <SidebarItem
    to="/tasks"
    render={({ title, icon, isActive }) => (
      <div className={isActive ? "active" : ""}>
        {icon} {title}
      </div>
    )}
  />
  ```

  ## WithGuard Component

  New `WithGuard` component for conditional rendering based on guard functions. Use it to control visibility of sidebar items or any other components.

  ```tsx
  import { WithGuard, pass, hidden } from "@tailor-platform/app-shell";

  // Define a guard function
  const isAdminGuard = ({ context }) =>
    context.currentUser.role === "admin" ? pass() : hidden();

  // Wrap components with WithGuard
  <DefaultSidebar>
    <SidebarItem to="/dashboard" />
    <WithGuard guards={[isAdminGuard]}>
      <SidebarGroup title="Admin" icon={<Shield />}>
        <SidebarItem to="/admin/users" />
      </SidebarGroup>
    </WithGuard>
  </DefaultSidebar>;

  // Curried guards for parameterized conditions
  const hasRole =
    (role: string) =>
    ({ context }) =>
      context.currentUser.role === role ? pass() : hidden();

  <WithGuard guards={[hasRole("manager")]}>
    <SidebarItem to="/reports" />
  </WithGuard>;

  // Use in page components for conditional UI
  const DashboardPage = () => (
    <div>
      <h1>Dashboard</h1>
      <WithGuard guards={[isAdminGuard]}>
        <AdminPanel />
      </WithGuard>
      <WithGuard guards={[hasRole("editor")]}>
        <EditButton />
      </WithGuard>
    </div>
  );
  ```

- e7fa8ec: Add file-based routing support via new Vite plugin

  File-based routing allows defining pages by placing components in a directory structure, eliminating the need for explicit `defineModule()` and `defineResource()` calls.

  ### Why file-based routing?

  **URL-First Design is Already the Norm** - Most projects naturally align their module/resource hierarchy with URL paths. A "purchasing" module at `/purchasing` with an "orders" resource at `/purchasing/orders` is the intuitive choice. The previous API required manually wiring up this structure even though the mapping was already implicit.

  **AI-Friendly Development** - By adopting file-based routing patterns pioneered by Next.js, AI tools can understand and navigate your codebase with less context. Code generation becomes more predictable and the established convention serves as shared knowledge between humans and AI.

  **Providing Rails, Not Just Flexibility** - The legacy `defineModule()`/`defineResource()` API gave flexibility but offered few conventions for directory structure, hierarchy management, or file naming. File-based routing provides an opinionated, battle-tested convention.

  Importantly, this is implemented as a Vite plugin layer on top of the existing programmatic API. Projects requiring non-standard routing can still use `defineModule()`/`defineResource()` directly.

  ### Backward Compatibility

  File-based routing is a **recommended opt-in** feature. The legacy declarative API (`defineModule()`/`defineResource()`) remains fully supported and will continue to work. You can choose either approach per project, though mixing both in the same application is not supported.

  ### Vite Plugin

  The new `@tailor-platform/app-shell-vite-plugin` package provides file-based routing support:

  ```typescript
  // vite.config.ts
  import { appShellRoutes } from "@tailor-platform/app-shell-vite-plugin";

  export default defineConfig({
    plugins: [
      react(),
      appShellRoutes(), // scans src/pages by default
    ],
  });
  ```

  Under the hood, the plugin:

  1. **Scans pages** - Finds `page.tsx` files in `src/pages` and builds a route tree
  2. **Generates virtual module** - Creates `virtual:app-shell-pages` with all discovered pages
  3. **Auto-injects pages** - Intercepts `@tailor-platform/app-shell` imports and wraps `AppShell` with `AppShell.WithPages(pages)`
  4. **Validates at build time** - Uses ts-morph AST analysis to validate `appShellPageProps`
  5. **Supports HMR** - Watches for page changes and triggers hot reload

  No manual wiring needed—just import `AppShell` as usual and pages are automatically available.

  ### Defining Pages

  ```tsx
  // src/pages/dashboard/page.tsx
  import type { AppShellPageProps } from "@tailor-platform/app-shell";

  const DashboardPage = () => <div>Dashboard</div>;

  DashboardPage.appShellPageProps = {
    meta: { title: "Dashboard" },
    guards: [authGuard],
  } satisfies AppShellPageProps;

  export default DashboardPage;
  ```

  ### Type-safe Routes (Optional)

  ```typescript
  // vite.config.ts
  appShellRoutes({ generateTypedRoutes: true });
  ```

  When enabled, the plugin generates `src/routes.generated.ts` containing:

  - `GeneratedRouteParams` type mapping all routes to their parameter types
  - `paths` helper with a type-safe `for()` method for building URLs
  - Module augmentation to register route types with app-shell

  ```tsx
  // Auto-generated: src/routes.generated.ts
  export type GeneratedRouteParams = {
    "/": {};
    "/dashboard": {};
    "/dashboard/orders/:id": { id: string };
  };
  export const paths = createTypedPaths<GeneratedRouteParams>();

  // Usage - TypeScript enforces correct params
  import { paths } from "./routes.generated";

  paths.for("/dashboard"); // ✓ OK
  paths.for("/dashboard/orders/:id", { id: "123" }); // ✓ OK → "/dashboard/orders/123"
  paths.for("/dashboard/orders/:id"); // ✗ Error: missing 'id'
  paths.for("/invalid-route"); // ✗ Error: route doesn't exist
  ```

  ### Breaking Change: Guard/Loader Cascade Behavior

  In the legacy `defineModule()`/`defineResource()` API, guards and loaders defined at the module level were automatically cascaded to all child resources. This automatic cascade behavior has been removed in both the legacy API and file-based routing—**guards and loaders are no longer automatically inherited**. Each resource or page must explicitly define its own guards and loaders.

  **Before (legacy API):**

  ```tsx
  defineModule({
    path: "/dashboard",
    guards: [authGuard], // Applied to all child resources automatically
    resources: [
      defineResource({ path: "/orders", element: <Orders /> }), // authGuard applied
      defineResource({ path: "/reports", element: <Reports /> }), // authGuard applied
    ],
  });
  ```

  **After (legacy API):**

  ```tsx
  defineModule({
    path: "/dashboard",
    guards: [authGuard],
    resources: [
      defineResource({
        path: "/orders",
        guards: [authGuard],
        element: <Orders />,
      }), // Must be explicitly defined
      defineResource({
        path: "/reports",
        guards: [authGuard],
        element: <Reports />,
      }), // Must be explicitly defined
    ],
  });
  ```

  Note: File-based routing, introduced in this release, also does not support guard/loader cascading. Each page must define its own guards and loaders explicitly:

  ```tsx
  // src/pages/dashboard/orders/page.tsx
  OrdersPage.appShellPageProps = {
    guards: [authGuard], // Must be explicitly defined
  } satisfies AppShellPageProps;

  // src/pages/dashboard/reports/page.tsx
  ReportsPage.appShellPageProps = {
    guards: [authGuard], // Must be explicitly defined
  } satisfies AppShellPageProps;
  ```

  **Rationale:** Explicit guard/loader definitions per resource/page improve code clarity and make it easier to understand the security requirements of each route at a glance.

  **Migration tip:** If you need the previous cascading behavior, compose your guards array explicitly:

  ```tsx
  // src/guards.ts
  export const requireAuth = [authGuard];
  export const requireAdmin = [authGuard, adminRoleGuard];

  // src/pages/dashboard/orders/page.tsx
  import { requireAuth } from "@/guards";

  OrdersPage.appShellPageProps = {
    guards: [...requireAuth, canViewOrders],
  } satisfies AppShellPageProps;

  // src/pages/admin/users/page.tsx
  import { requireAdmin } from "@/guards";

  UsersPage.appShellPageProps = {
    guards: [...requireAdmin],
  } satisfies AppShellPageProps;
  ```

  ## Breaking Change: Module without component requires guards

  As part of the ongoing effort to decouple navigation and routing (aligned with file-based routing), the automatic redirect behavior for modules without a `component` has been removed.

  Previously, a module without a `component` would automatically redirect to the first visible resource. However, in file-based routing, the resource hierarchy is determined ad-hoc by the vite-plugin based on directory structure, making this implicit redirect behavior inconsistent and unpredictable. To maintain consistency across both explicit and file-based routing, this behavior has been removed.

  If a module is defined without both `component` and `guards`, an error will be thrown at runtime. You must provide at least one of them.

  ```tsx
  // Before: automatic redirect to first visible resource
  defineModule({
    path: "reports",
    resources: [salesResource, usersResource],
  });

  // After: explicit redirect via guards
  defineModule({
    path: "reports",
    guards: [() => redirectTo("sales")],
    resources: [salesResource, usersResource],
  });

  // Error: defining a module without both component and guards will throw
  defineModule({
    path: "reports",
    resources: [salesResource, usersResource],
  }); // => throws an error
  ```

### Patch Changes

- 8c19779: Updated [react-hook-form](https://www.npmjs.com/package/react-hook-form) (^7.71.1 -> ^7.71.2)
- 50ddd5f: Updated [tailwind-merge](https://www.npmjs.com/package/tailwind-merge) (^3.4.0 -> ^3.5.0)
- 1338776: Updated [es-toolkit](https://www.npmjs.com/package/es-toolkit) (^1.41.0 -> ^1.44.0)
- Updated dependencies [e7fa8ec]
  - @tailor-platform/app-shell-vite-plugin@0.27.0

## 0.26.3

### Patch Changes

- 2170b9e: Updated [oauth4webapi](https://www.npmjs.com/package/oauth4webapi) (^3.8.3 -> ^3.8.5)
- 5aef4ad: Update auth-public-client to 0.4.1
- 18f9b66: Updated [react-hook-form](https://www.npmjs.com/package/react-hook-form) (^7.54.2 -> ^7.71.1)

## 0.26.2

### Patch Changes

- 7fee07a: Updated [@tanstack/react-table](https://www.npmjs.com/package/@tanstack/react-table) (^8.21.2 -> ^8.21.3)

## 0.26.1

### Patch Changes

- 3fe975b: Fix content area layout to properly fill remaining space

  Added `flex-1` and `min-h-0` to the content wrapper in SidebarLayout, allowing child pages to use `h-full` or `flex-1` to fill the remaining space after the header/breadcrumb. This eliminates the need for hacky `calc(100dvh - Xrem)` workarounds.

  Also added `overflow-hidden` to the sidebar-wrapper to enable proper scrolling within nested containers (e.g., kanban board lanes).

## 0.26.0

### Minor Changes

- 72bbcb6: Replace `@tailor-platform/auth-browser-client` with `@tailor-platform/auth-public-client` and add Suspense support

  ## Motivation

  The previous authentication implementation using `@tailor-platform/auth-browser-client` relied on HTTPOnly cookie-based session management. This caused authentication failures on browsers with strict privacy protections, particularly Safari with its Intelligent Tracking Prevention (ITP) feature, and Brave with its similar tracking prevention mechanisms. These browsers block or restrict cross-site cookies, which prevented the HTTPOnly cookies from being stored and sent properly, causing authentication to fail silently or users to be logged out unexpectedly.

  To address this cross-browser compatibility issue, we have migrated to `@tailor-platform/auth-public-client`, which uses DPoP (Demonstrating Proof of Possession) token binding with IndexedDB storage instead of cookies. This approach works reliably across all major browsers (including Safari 14+ and Brave) regardless of their privacy settings.

  ## Key Changes

  - **Cross-browser Compatibility**: Works reliably on Safari, Brave, and other browsers with strict privacy settings
  - **Suspense Support**: Added `useAuthSuspense` hook for React Suspense integration
  - **Module-level Client**: Auth client can now be created at module level and shared across the app

  ## Breaking Changes

  The underlying authentication package has been replaced with `@tailor-platform/auth-public-client` v0.3.1, which uses DPoP (Demonstrating Proof of Possession) token binding.

  ### AuthProvider API Changes

  - `AuthProvider` now requires a `client` prop created with `createAuthClient` from `@tailor-platform/app-shell`
  - The `apiEndpoint` prop has been removed - the client automatically uses the `appUri` provided during creation
  - You must use the wrapped `createAuthClient` from `@tailor-platform/app-shell` (not the original from `@tailor-platform/auth-public-client`)

  ### Hook Return Value Changes

  - **`useAuth`**: Now returns `{ isAuthenticated, error, isReady, login, logout, checkAuthStatus }` directly instead of `{ authState, ... }`
  - **`useAuthSuspense`**: Returns `{ isAuthenticated, error, login, logout, checkAuthStatus }` (no `isReady` since Suspense handles loading)

  ### Removed Exports

  - `DefaultUser` and `AuthRegister` types are no longer exported
  - `user` property removed from `AuthState` (see "Removed: Built-in User Fetching" below)

  ### Removed: Built-in User Fetching (meQuery)

  The previous implementation fetched user information internally using a simple `fetch` call to the `/query` endpoint. This design had several issues:

  1. **Caching conflicts**: When applications use GraphQL client libraries (urql, Apollo, etc.) with sophisticated caching mechanisms, having a separate internal fetch for user data creates inconsistencies and bypasses the cache.
  2. **Inflexibility**: Applications couldn't customize the user query or integrate it with their existing data fetching patterns.
  3. **Mixed responsibilities**: The auth provider was handling both authentication AND user data fetching, which are separate concerns.

  **The new design focuses solely on authentication responsibilities:**

  - Token management (access tokens, refresh tokens)
  - Login/logout flows
  - OAuth callback handling
  - Authentication state (`isAuthenticated`, `error`, `isReady`)

  **User information should now be fetched by your application** using your preferred GraphQL client library, which gives you:

  - Full control over caching behavior
  - Ability to customize the user query
  - Consistent data fetching patterns across your app
  - Better integration with your existing data layer

  ## Migration Guide

  ### Before (v0.22.0 and earlier)

  ```tsx
  import { AuthProvider, useAuth } from "@tailor-platform/app-shell";

  function App() {
    return (
      <AuthProvider
        apiEndpoint="https://xyz.erp.dev"
        clientId="your-client-id"
        redirectUri="https://your-app.com"
      >
        <MyComponent />
      </AuthProvider>
    );
  }

  function MyComponent() {
    const { authState, login, logout } = useAuth();

    if (authState.isLoading) return <div>Loading...</div>;
    if (!authState.isAuthenticated)
      return <button onClick={login}>Log In</button>;

    // User was available from authState
    return <div>Welcome, {authState.user?.email}!</div>;
  }
  ```

  ### After (v0.23.0+)

  ```tsx
  import {
    createAuthClient,
    AuthProvider,
    useAuth,
  } from "@tailor-platform/app-shell";

  // Create auth client outside component (module level)
  const authClient = createAuthClient({
    clientId: "your-client-id",
    appUri: "https://xyz.erp.dev",
    redirectUri: "https://your-app.com", // optional, defaults to window.location.origin
  });

  function App() {
    return (
      <AuthProvider client={authClient}>
        <MyComponent />
      </AuthProvider>
    );
  }

  function MyComponent() {
    // New: properties returned directly (not nested in authState)
    const { isAuthenticated, isReady, login, logout } = useAuth();

    if (!isReady) return <div>Loading...</div>;
    if (!isAuthenticated) return <button onClick={login}>Log In</button>;

    // User info should now be fetched separately using your GraphQL client
    return <UserProfile />;
  }

  // Fetch user info with your GraphQL client (e.g., urql)
  function UserProfile() {
    const [{ data }] = useQuery({ query: ME_QUERY });
    return <div>Welcome, {data?.me?.email}!</div>;
  }
  ```

  ## Usage Examples

  ### Basic Authentication

  ```tsx
  import {
    createAuthClient,
    AuthProvider,
    useAuth,
  } from "@tailor-platform/app-shell";

  const authClient = createAuthClient({
    clientId: "your-client-id",
    appUri: "https://xyz.erp.dev",
  });

  function App() {
    return (
      <AuthProvider client={authClient}>
        <MyComponent />
      </AuthProvider>
    );
  }

  function MyComponent() {
    const { isAuthenticated, isReady, login, logout } = useAuth();

    if (!isReady) return <div>Loading...</div>;
    if (!isAuthenticated) return <button onClick={login}>Log In</button>;

    return (
      <div>
        <p>Authenticated!</p>
        <button onClick={logout}>Log Out</button>
      </div>
    );
  }
  ```

  ### With Suspense

  ```tsx
  import { Suspense } from "react";
  import {
    createAuthClient,
    AuthProvider,
    useAuthSuspense,
  } from "@tailor-platform/app-shell";

  const authClient = createAuthClient({
    clientId: "your-client-id",
    appUri: "https://xyz.erp.dev",
  });

  function App() {
    return (
      <AuthProvider client={authClient}>
        <Suspense fallback={<div>Loading authentication...</div>}>
          <ProtectedContent />
        </Suspense>
      </AuthProvider>
    );
  }

  function ProtectedContent() {
    // isReady is guaranteed to be true here (Suspense handles loading)
    const { isAuthenticated, login, logout } = useAuthSuspense();

    if (!isAuthenticated) {
      return <button onClick={login}>Log In</button>;
    }

    return (
      <div>
        <p>Authenticated!</p>
        <button onClick={logout}>Log Out</button>
      </div>
    );
  }
  ```

  ### Initializing GraphQL Client with Auth Headers

  The new API makes it easy to share the auth client between `AuthProvider` and your GraphQL client, with less duplication:

  ```tsx
  import { createAuthClient, AuthProvider } from "@tailor-platform/app-shell";
  import { createClient, Provider } from "urql";

  // Create auth client at module level
  const authClient = createAuthClient({
    clientId: "your-client-id",
    appUri: "https://api.example.com",
  });

  // Create urql client - no need to repeat the URL!
  const urqlClient = createClient({
    url: `${authClient.getAppUri()}/query`,
    fetchOptions: async () => {
      // Simplified: no need to pass URL again
      const headers = await authClient.getAuthHeadersForQuery();
      return { headers };
    },
  });

  function App() {
    return (
      <AuthProvider client={authClient}>
        <Provider value={urqlClient}>
          <YourAppComponents />
        </Provider>
      </AuthProvider>
    );
  }
  ```

  ### Fetching User Information

  Since user fetching is no longer built-in, here's a recommended pattern:

  ```tsx
  import { useQuery, gql } from "urql";
  import { useAuth } from "@tailor-platform/app-shell";

  const ME_QUERY = gql`
    query Me {
      me {
        id
        email
        name
      }
    }
  `;

  function UserProfile() {
    const { isAuthenticated } = useAuth();
    const [{ data, fetching }] = useQuery({
      query: ME_QUERY,
      pause: !isAuthenticated, // Don't fetch if not authenticated
    });

    if (fetching) return <div>Loading user...</div>;
    if (!data?.me) return <div>Not logged in</div>;

    return <div>Welcome, {data.me.name}!</div>;
  }
  ```

## 0.25.0

### Minor Changes

- 6ff1478: Export `useToast` hook

  `useToast` is just a hook that returns [sonner](https://sonner.emilkowal.ski/).

### Patch Changes

- 10b521d: Fix module redirect to skip hidden resources

  When a module has no `component` and redirects to its first resource, the redirect now correctly skips resources that are hidden by guards. If all resources are hidden, the module itself returns a 404.

  - Redirects to the first visible (non-hidden) resource instead of always redirecting to the first resource
  - Returns 404 when all resources in the module are hidden by guards

## 0.24.0

### Minor Changes

- ae8f732: Add `t.dynamic()` method for resolving i18n labels with dynamic keys

  The `useT` hook now returns a function with a `dynamic` method that allows resolving labels with runtime-constructed keys:

  ```tsx
  const t = labels.useT();

  const employeeType = "STAFF";
  t.dynamic(`employees.${employeeType}`, "Unknown"); // Returns the label or "Unknown" if not found
  ```

- 193afe9: Make `component` optional in `defineModule`

  - `defineModule` now accepts an optional `component` prop
  - When `component` is omitted, the module acts as a container for resources and automatically redirects to the first resource
  - `menuItemClickable` is set to `false` for modules without a component

  ```tsx
  // With component - renders the component at /dashboard
  defineModule({
    path: "dashboard",
    component: () => <DashboardPage />,
    resources: [...]
  });

  // Without component - redirects /reports to /reports/sales
  defineModule({
    path: "reports",
    resources: [
      defineResource({ path: "sales", ... }),
      defineResource({ path: "users", ... }),
    ]
  });
  ```

- 617c1ac: ## Route Guards and Context Data

  This release introduces a new route guards system and custom context data support, replacing the previous `accessControl` API.

  ### Motivation

  #### Route Guards

  Inspired by Angular Route Guards, this feature introduces a middleware-like pattern for route access control.

  - **Composable**: Guards can be combined in an array, promoting separation of concerns and reusability
  - **Semantic Constraints**: Guard results are limited to `pass`, `hidden`, or `redirect`, making behavior predictable and explicit
  - **Reusable**: Define guards once and share them across multiple routes

  #### Context Data

  Provides a type-safe dependency injection mechanism for passing data from the application root to guards and components.

  - **Type-Safe**: Module augmentation ensures `contextData` is fully typed throughout the application
  - **Centralized**: Manage API clients, user state, and feature flags in one place
  - **Testable**: Easy to mock and inject different contexts for testing

  ### Breaking Changes

  - **`accessControl` is replaced by `guards`**: The `accessControl` option in `defineModule` and `defineResource` has been replaced with a more flexible `guards` array.
  - **`RedirectConfig` and `redirectToResource` are removed**: Use `guards` with `redirectTo()` instead.

  ### New Features

  #### 1. Route Guards

  Guards are functions that control access to routes. They are executed in order, and the first non-`pass` result stops the chain.

  ```tsx
  import {
    defineResource,
    pass,
    hidden,
    redirectTo,
    type Guard,
  } from "@tailor-platform/app-shell";

  // Reusable guards
  const requireAuth: Guard = ({ context }) => {
    if (!context.currentUser) {
      return redirectTo("/login");
    }
    return pass();
  };

  const requireAdmin: Guard = ({ context }) => {
    if (context.currentUser.role !== "admin") {
      return hidden(); // Shows 404
    }
    return pass();
  };

  // Use guards in resource definition
  export const adminResource = defineResource({
    path: "admin/users/:id",
    component: AdminUserPage,
    guards: [
      requireAuth,
      requireAdmin,
      async ({ params, context }) => {
        // Check organization access
        const user = await context.apiClient.getUser(params.id);
        if (user.orgId !== context.currentUser.orgId) {
          return hidden();
        }
        return pass();
      },
    ],
  });
  ```

  #### 2. Custom Context Data

  Pass arbitrary data through `AppShellProps` and access it from guards and components.

  **Step 1: Define your context data type using module augmentation**

  ```typescript
  // types.d.ts
  declare module "@tailor-platform/app-shell" {
    interface AppShellRegister {
      contextData: {
        apiClient: ApiClient;
        currentUser: User | null;
        featureFlags: {
          enableNewUI: boolean;
        };
      };
    }
  }
  ```

  **Step 2: Pass context data to AppShell**

  ```tsx
  // App.tsx
  import { AppShell } from "@tailor-platform/app-shell";

  function App() {
    const apiClient = useApiClient();
    const currentUser = useCurrentUser();
    const featureFlags = useFeatureFlags();

    return (
      <AppShell
        modules={modules}
        contextData={{
          apiClient,
          currentUser,
          featureFlags,
        }}
      />
    );
  }
  ```

  **Step 3: Access context data in guards**

  ```tsx
  const myGuard: Guard = ({ context }) => {
    // `context` is fully typed based on your AppShellRegister
    if (context.featureFlags.enableNewUI) {
      return redirectTo("/new-dashboard");
    }
    return pass();
  };
  ```

  **Step 4: Access context data in components**

  ```tsx
  import { useAppShell } from "@tailor-platform/app-shell";

  function MyComponent() {
    const { contextData } = useAppShell();

    return <div>Welcome, {contextData.currentUser?.name}</div>;
  }
  ```

  ### Migration Guide

  **Before (accessControl):**

  ```tsx
  defineResource({
    path: "admin",
    component: AdminPage,
    accessControl: async ({ params }) => {
      const hasAccess = await checkAccess(params.id);
      return hasAccess ? { state: "visible" } : { state: "hidden" };
    },
  });
  ```

  **After (guards):**

  ```tsx
  defineResource({
    path: "admin",
    component: AdminPage,
    guards: [
      async ({ params }) => {
        const hasAccess = await checkAccess(params.id);
        return hasAccess ? pass() : hidden();
      },
    ],
  });
  ```

  **Before (redirectToResource):**

  ```tsx
  defineModule({
    path: "dashboard",
    component: redirectToResource("dashboard/overview"),
    resources: [...],
  });
  ```

  **After (guards with redirectTo):**

  ```tsx
  defineModule({
    path: "dashboard",
    component: () => null,
    guards: [() => redirectTo("dashboard/overview")],
    resources: [...],
  });
  ```

  ### New Exports

  - `Guard` - Guard function type
  - `GuardContext` - Context passed to guards (`params`, `searchParams`, `signal`, `context`)
  - `GuardResult` - Result type (`pass`, `hidden`, or `redirect`)
  - `pass()` - Helper to allow access
  - `hidden()` - Helper to deny access (404)
  - `redirectTo(path)` - Helper to redirect
  - `AppShellRegister` - Interface for module augmentation
  - `ContextData` - Inferred context data type

### Patch Changes

- 42daf85: Updated [react-dom](https://www.npmjs.com/package/react-dom) (^19.2.1 -> ^19.2.4)

## 0.23.0

### Minor Changes

- 3f42257: Add Layout component for responsive column layouts

  - `Layout` - Responsive column layout component with automatic responsive behavior
  - `Layout.Column` - Sub-component for wrapping individual column content
  - Support for 1, 2, and 3 column layouts with automatic responsive stacking
  - Optional `title` and `actions` props for built-in header with action buttons

  ```tsx
  import { Layout } from "@tailor-platform/app-shell";

  // Basic 2 Column Layout
  <Layout columns={2}>
    <Layout.Column>Main content</Layout.Column>
    <Layout.Column>Side panel</Layout.Column>
  </Layout>

  // With header title and action buttons
  <Layout
    columns={2}
    title="Page Title"
    actions={[
      <Button key="cancel" variant="secondary">Cancel</Button>,
      <Button key="save">Save</Button>,
    ]}
  >
    <Layout.Column>...</Layout.Column>
    <Layout.Column>...</Layout.Column>
  </Layout>
  ```

## 0.22.0

### Minor Changes

- b09e30d: Add DescriptionCard component for ERP document display

  - `DescriptionCard` - Card component for structured key-value information
  - `Badge` - Status badge component with semantic variants (success, warning, error, etc.)
  - 7 field types: text, badge, money, date, link, address, reference
  - Text truncation with tooltip: `meta: { truncateLines: 2 }`
  - Badge values auto-converted to sentence case (e.g., "CONFIRMED" → "Confirmed")
  - Responsive grid layout (4 → 3 → 2 → 1 columns)

  ```tsx
  import { DescriptionCard } from "@tailor-platform/app-shell";

  <DescriptionCard
    data={order}
    title="Order Summary"
    fields={[
      {
        key: "status",
        label: "Status",
        type: "badge",
        meta: { badgeVariantMap: { CONFIRMED: "outline-success" } },
      },
      { type: "divider" },
      { key: "note", label: "Notes", meta: { truncateLines: 2 } },
    ]}
  />;
  ```

## 0.21.1

### Patch Changes

- bc08996: Updated [@radix-ui/react-navigation-menu](https://www.npmjs.com/package/@radix-ui/react-navigation-menu) (^1.2.5 -> ^1.2.14)

## 0.21.0

### Minor Changes

- 32f0c81: `accessControl` is introduced as the unified way to hide modules or resources when a feature flag or permission is missing.

  ```tsx
  // Example: permission-gated reports module
  export const reportsModule = defineModule({
    // ...
    accessControl: async ({ signal }) => {
      const ok = await fetch("/api/me/permissions?scope=reports", {
        signal,
      }).then((r) => r.ok);
      return { state: ok ? "visible" : "hidden" };
    },
  });

  // Example: resource-level access control
  const reportsListResource = defineResource({
    // ...
    accessControl: () => ({ state: "hidden" }),
  });

  // Example: rollout by tenant tier.
  const billingModule = defineModule({
    // ...
    accessControl: async () => {
      const plan = await getCurrentTenantPlan();
      return { state: plan === "enterprise" ? "visible" : "hidden" };
    },
  });
  ```

## 0.20.1

### Patch Changes

- 2418378: Improve CommandPalette UI with hierarchical path display

  - Display module/resource hierarchy as breadcrumb format (e.g., "Dashboard > Analytics")
  - Widen the dialog width for better readability
  - Show URL path below the breadcrumb in smaller text

- fb7e114: Updated [@radix-ui/react-collapsible](https://www.npmjs.com/package/@radix-ui/react-collapsible) (^1.1.3 -> ^1.1.12)

## 0.20.0

### Minor Changes

- 1a2ee08: Add `CommandPalette` component for quick page navigation.

  The CommandPalette provides a keyboard-driven interface (Cmd+K / Ctrl+K) for searching and navigating between pages in your application. It automatically collects navigable routes from your module definitions and supports both English and Japanese locales.

  ## Features

  - Global keyboard shortcut: `Cmd+K` (Mac) / `Ctrl+K` (Windows)
  - Fuzzy search by page title or path
  - Keyboard navigation with arrow keys and Enter

  ## Usage

  The `CommandPalette` component is designed to be used within an `AppShell` context. It automatically reads module configurations and provides navigation capabilities.

  ```tsx
  import {
    AppShell,
    CommandPalette,
    SidebarLayout,
  } from "@tailor-platform/app-shell";

  const App = () => (
    <AppShell modules={modules} locale="en">
      <>
        <SidebarLayout />
        <CommandPalette />
      </>
    </AppShell>
  );
  ```

### Patch Changes

- d680b83: Updated [oauth4webapi](https://www.npmjs.com/package/oauth4webapi) (^3.8.1 -> ^3.8.3)
- e6020ae: Updated [lucide-react](https://www.npmjs.com/package/lucide-react) (^0.487.0 -> ^0.562.0)
- cda3d85: Updated [@radix-ui/react-popover](https://www.npmjs.com/package/@radix-ui/react-popover) (^1.1.6 -> ^1.1.15)
- 7fcc21c: Updated [@radix-ui/react-tooltip](https://www.npmjs.com/package/@radix-ui/react-tooltip) (^1.1.8 -> ^1.2.8)

## 0.19.0

### Minor Changes

- 1833c9c: Replace `BuiltinIdPAuthProvider` with new `AuthProvider` using `@tailor-platform/auth-browser-client`.

  The previous `BuiltinIdPAuthProvider` only supported authentication with Tailor Platform's built-in IdP system. With the new `AuthProvider` powered by `@tailor-platform/auth-browser-client`, you can now authenticate with any IdP configured in Tailor Platform's Auth service (e.g., Google, Okta, Auth0, etc.).

  # New APIs

  ## Component

  **`AuthProvider`** - New props:

  - `meQuery`: Custom GraphQL query to fetch the current authenticated user. If you override `AuthRegister["user"]`, make sure to have the fields match your custom user type.
  - `autoLogin`: Enable automatic login on initialization
  - `guardComponent`: Component to render while loading or unauthenticated

  ## Hook

  **`useAuth`** - New returns:

  - `authState`: Current auth state (`isLoading`, `isAuthenticated`, `user`)
  - `checkAuthStatus()`: Manually verify authentication status
  - `handleCallback()`: Handle OAuth callback

  ## Extending User Type with type safety

  By default, `authState.user` returned from `useAuth()` has the `DefaultUser` type, which includes the following fields:

  ```ts
  type DefaultUser = {
    id: string;
    email: string;
    name: string;
  };
  ```

  If your application needs additional user fields (e.g., roles, organization info, custom attributes), you can extend the user type using TypeScript's **module augmentation** feature. This ensures full type safety when accessing user properties throughout your application.

  ### Step 1: Define your custom user type

  Use the `AuthRegister` interface to declare your extended user type. This interface uses declaration merging to override the default user type globally.

  ```tsx
  // types/auth.d.ts (or any .ts/.tsx file in your project)
  declare module "@tailor-platform/app-shell" {
    interface AuthRegister {
      user: DefaultUser & {
        roles: Array<string>;
        organizationId: string;
        // Add any other custom fields your API returns
      };
    }
  }
  ```

  ### Step 2: Provide a matching `meQuery`

  The `meQuery` prop defines the GraphQL query used to fetch the authenticated user. **The fields in your query must match the fields defined in your custom user type.**

  ```tsx
  import {
    AppShell,
    AuthProvider,
    SidebarLayout,
  } from "@tailor-platform/app-shell";

  const App = () => (
    <AppShell>
      <AuthProvider
        apiEndpoint="..."
        clientId="..."
        meQuery={`
          query {
            me {
              id
              email
              name
              roles
              organizationId
            }
          }
        `}
      >
        <SidebarLayout />
      </AuthProvider>
    </AppShell>
  );
  ```

  ### Step 3: Access typed user data

  After the above setup, `authState.user` will be fully typed with your custom user type:

  ```tsx
  import { useAuth } from "@tailor-platform/app-shell";

  const MyComponent = () => {
    const { authState } = useAuth();

    // TypeScript knows these properties exist
    console.log(authState.user.roles); // Array<string>
    console.log(authState.user.organizationId); // string
    console.log(authState.user.email); // string (from DefaultUser)

    // ...
  };
  ```

  > **Note:** If you don't need custom user fields, you can skip this setup entirely. The default `meQuery` fetches `id`, `email`, and `name` automatically.

  # Migration

  Key changes:

  - `BuiltinIdPAuthProvider` is removed. Use `AuthProvider` instead.
  - `useBuiltinIdpAuth` is removed. Use `useAuth` instead.
  - Utility functions (`buildAuthorizationUrl`, `exchangeCodeForToken`, `prepareLogin`, `handleOAuthCallback`) are no longer exported.

  ```tsx
  // Before
  import {
    BuiltinIdPAuthProvider,
    useBuiltinIdpAuth,
  } from "@tailor-platform/app-shell";

  <BuiltinIdPAuthProvider apiEndpoint="..." clientId="...">
    {children}
  </BuiltinIdPAuthProvider>;

  const { login, logout } = useBuiltinIdpAuth();

  // After
  import { AuthProvider, useAuth } from "@tailor-platform/app-shell";

  <AuthProvider
    apiEndpoint="..."
    clientId="..."
    guardComponent={() => <Loading />}
  >
    {children}
  </AuthProvider>;

  const { login, logout, authState } = useAuth();
  ```

## 0.18.0

### Minor Changes

- 91bfc1f: Add `defineI18nLabels` function for internationalization support.

  `defineI18nLabels` defines internationalization labels for multiple locales with `en` as the required default locale, and returns an object with:

  - `useT`: A hook to get the translated label resolver function for use in React components
  - `t`: A function to get a `LocalizedString` for a specific label key, useful for `meta.title` in module/resource definitions

  Labels can be either static strings or dynamic functions that take props.

  ### Usage

  Define your i18n labels and export the returned `useT` hook:

  ```tsx
  // i18n-labels.ts
  import { defineI18nLabels } from "@tailor-platform/app-shell";

  export const labels = defineI18nLabels({
    en: {
      welcome: "Welcome to our app",
      greeting: (args: { name: string }) => `Hello, ${args.name}!`,
    },
    ja: {
      welcome: "アプリへようこそ",
      greeting: (args: { name: string }) => `こんにちは、${args.name}さん！`,
    },
  });

  // Export useT hook from the returned object
  export const useT = labels.useT;
  ```

  Use `useT` in components:

  ```tsx
  import { useT } from "./i18n-labels";

  const MyComponent = () => {
    const t = useT();

    return (
      <div>
        {/* Static label */}
        {t("welcome")}

        {/* Dynamic label with props (type-safe) */}
        {t("greeting", { name: "John" })}
      </div>
    );
  };
  ```

  Use `labels.t()` in resource definitions:

  ```tsx
  import { defineResource } from "@tailor-platform/app-shell";
  import { labels } from "./i18n-labels";

  const resource = defineResource({
    path: "example",
    meta: {
      // Static label
      title: labels.t("welcome"),
      // Dynamic label with props bound at definition time
      // title: labels.t("greeting", { name: "User" }),
    },
    component: ExampleComponent,
  });
  ```

- 096eb28: Add browser language detection to decide AppShell locale configuration

### Patch Changes

- d9e4e7c: Use vite as bundler

## 0.17.1

### Patch Changes

- 0cdda8f: Fix breadcrumb segment parsing

## 0.17.0

### Minor Changes

- 8092240: Deprecate `contentBorder` style prop
- 8092240: Flatten `configurations` key in AppShell component for simplicity
- 8092240: Rename `SidebarLayoutContainer` to `SidebarLayout`

## 0.16.0

### Minor Changes

- 9e0c17c: `Link` and `useNavigate` destinations should now be provided without the app's base-path prefix; the router applies the scope for you.

  ```tsx
  // basePath === "admin"

  // Before
  <Link to="/admin/dashboard" />;
  navigate("/admin/settings");

  // After
  <Link to="/dashboard" />;
  navigate("/settings");
  ```

### Patch Changes

- 9e0c17c: Remove next.js from peerDependecies

## 0.15.0

### Minor Changes

- 5b02e8a: Remove the implicit `/resources` prefix from generated module and resource routes.

  Consumers should update any hardcoded URLs and expectations to match the new base path structure.

### Patch Changes

- f34af20: Correct `AppShellProps` to accept `configurations.settingsResources` with the proper typing and remove the obsolete `configurations.settingsModules` prop.

  ```tsx
  <AppShell
    configurations={{
      modules,
      settingsResources: [settingsResource],
    }}
  >
    <SidebarLayoutContainer />
  </AppShell>
  ```

- f34af20: Accessing "/settings" path without settings resources will now go 404

  Previously, it gets runtime error caused by out-of-index array access

## 0.14.1

### Patch Changes

- 1cdd5e1: Update depepdencies for security vulnerabilities

## 0.14.0

### Minor Changes

- ca82334: Add configurable error boundaries
  - Add default error boundary that auto-applies to all routes
  - Support custom error boundaries at global, module, and resource levels
  - Add catch-all route for 404 handling

### Patch Changes

- 0a24505: Make `redirectUri` in `BuiltinIdPAuthProvider` optional

  It internally has been fallen back into `window.location.origin`, so should not be required for user experience

- 0a24505: Rename `idpEndpoint` prop in `BuiltinIdPAuthProvider` to `apiEndpoint` to properly tell what it expects to get from users.

## 0.13.0

### Minor Changes

- ec61cab: Add `redirectToResource` helper for declarative module redirection. Modules can now redirect to resources using `component: redirectToResource("path/to/resource")` instead of rendering a component. Redirection is handled efficiently via React Router loaders, avoiding unnecessary component rendering.

  **Example:**

  ```tsx
  import { defineModule, redirectToResource } from "@tailor-platform/app-shell";

  // Redirect to a resource instead of rendering a component
  export const dashboardModule = defineModule({
    path: "dashboard",
    component: redirectToResource("dashboard/overview"),
    resources: [overviewResource, analyticsResource],
  });

  // Also works for AppShell root component
  const appShellConfig: AppShellProps = {
    configurations: {
      rootComponent: redirectToResource("dashboard/overview"),
      modules: [dashboardModule],
    },
  };
  ```

  **Breaking Change**: `defaultResourceRedirectPath` prop in `defineModule` function is removed to keep API consistent. Use `redirectToResource` helper function instead.

### Patch Changes

- 35ae2eb: Promote Omakase-IMS Auth Patterns to AppShell

## 0.12.0

### Minor Changes

- 34715de: Add `rootComponent` prop in AppShell configuration

  The prop is expected to be used for overriding the root page in AppShell to show user-defined page like personalized dashboard, customized onboarding instruction, or something.

  ## Example

  ```tsx
  import {
    AppShell,
    AppShellProps,
    SidebarLayoutContainer,
  } from "@tailor-platform/app-shell";
  import { exampleModule } from "./resource/example";

  const App = () => {
    const appShellConfig: AppShellProps = {
      title: "AppShell",
      configurations: {
        modules: [exampleModule],

        /*
         * NEW: a prop to give a component to override the root page
         *
         * If nothing given, the default empty page would still be shown.
         * Use `useEffect` + `useNavigate` when initial page redirection is needed.
         */
        rootComponent: () => <div>Custom Root Component</div>,
      },
    };

    return (
      <AppShell {...appShellConfig}>
        <SidebarLayoutContainer />
      </AppShell>
    );
  };
  ```

### Patch Changes

- 58ed4a1: Add astw prefix to sr-only

## 0.11.1

### Patch Changes

- 5315366: Settings Modules

## 0.11.0

### Minor Changes

- 0c6312c: Module component can access module resources

### Patch Changes

- 225b4fd: Module component should be able to access the module's subResources

## 0.10.0

### Minor Changes

- af40df7: Add isLoading

### Patch Changes

- 675413d: Add isLoading to `BuiltinIdPAuthProvider`

## 0.9.4

### Patch Changes

- 93add79: Add logout function for BuiltinIdpAuthProvider

## 0.9.3

### Patch Changes

- f7a6fc6: Make redirect URI configurable in BuiltinIdPAuthProvider

## 0.9.2

### Patch Changes

- a33a031: Update packages

## 0.9.1

### Patch Changes

- 7fb8e40: - Force render on clientside to remove SSR console and node errors
  - Remove console error for nested buttons in DOM
  - Return `resolvedTheme` from `useTheme` hook to get the true theme to use when `system` theme is used

## 0.9.0

### Minor Changes

- 1ad6b3b: - Support module definition without a module-level component

  This can be done by providing a `defaultResourceRedirectPath` prop instead of a `component` in the `defineModule` call

## 0.8.2

### Patch Changes

- bbb2740: Support dynamic breadcrumb segment titles

## 0.8.1

### Patch Changes

- cbd605f: - Add `astw` prefix to tailwind classes to avoid global namespace clashes with consumer applications
  - Update padding around main content area

## 0.8.0

### Minor Changes

- b3c8e76: - Updates to Tailwind styles including classnames. `theme.css` is now exported for inclusion in consumer application tailwind `globals.css`
  - `defineResource`'s `meta.contentBorder` property now defaults to `false` if not provided
  - Removed the inset shadow for the sidebar-layout, and added a visual separator border to the sidebar
  - Move the sidebar icon inside the sidebar as per latest designs
  - Sidebar and Breadcrumb trail links now use react-router Link to ensure clientside navigation, if react-router context exists. (⚠️ Note this is untested in a non-react-router setting)

## 0.7.0

### Minor Changes

- 00ca998: Updates the style definition to bring over the class name and colours/other styles from frontend-platform-services: Console

  This file was used as a reference
  https://github.com/tailor-inc/platform-frontend-services/blob/main/apps/console/src/app/globals.css

  Todo in future: have these defined in just one place so we can use a centralised definition as base styles for multiple platforms

## 0.6.0

### Minor Changes

- c857b7e: Adds support for consumer applications to customize the UI

  - Customize icon for module:

    Optionally include an `icon` property within the defineModule meta property to render a custom icon, rather than using the default Table one.

    ```tsx
    defineModule({
    path: modulePath,
    component: ModulePageComponent,
    meta: {
        title: "Module Title",
        icon: <IconComponent />,
    },
    resources: [...],
    });
    ```

  - Make the content area border optional

    Removes the border around the content area if contentBorder is specified as `false`. (It defaults to true if unspecified)

    ```tsx
    defineResource({
      path: resourcePath,
      component: resourceComponent,
      meta: { contentBorder: false },
    });
    ```

  - Exports useTheme for consumers to get access to the theme being tracked by AppShell

    `import { useTheme } from "@tailor-platform/app-shell";`

## 0.5.0

### Minor Changes

- e9c56ae: Dark mode toggle
- 22fa03f: Design tweak: use built-in sidebar inset
- 54d8418: Fix breadcrumb labels

## 0.4.0

### Minor Changes

- 81cfb8c: Resource components can access title through props

  The value given to `meta.title` in a resource was rendered as the page title automatically, but this behaviour is removed by this change.

  Instead of that, the page title can be accessible through props given to the resoure component for more layout flexibility.

  ```tsx
  import {
    defineResource,
    ResourceComponentProps,
  } from "@tailor-platform/app-shell";

  const Page = (pageProps: ResourceComponentProps) => (
    <div>
      <h2 className="font-bold">{pageProps.title}</h2>
      <p className="pt-4">This is a page content</p>
    </div>
  );

  export const customPageResource = defineResource({
    path: "custom-page",
    component: Page,
    meta: {
      title: "Custom Page",
      category: "Examples",
    },
  });
  ```

- 2ce10bc: Module is a concept that groups multiple resources as a root.

  AppShell configuration accepts modules instead of resources with this change.

  ```diff
  <AppShell
    configurations={{
  -   resources: [someModule]
  +   modules: [someModule]
    }}
    {...otherProps}
  />
  ```

  Modules are defined with `defineModule` function, and it has `resources` property to give the child resources.

  ```tsx
  import { defineModule, defineResource } from "@tailor-platform/app-shell";

  const customPageModuleResource = defineResource({
    path: "sub",
    component: () => <p>This is a resource page</p>,
  });

  export const customPageModule = defineModule({
    path: "custom-page",
    component: () => <p>This is a module page</p>,
    resources: [customPageModuleResource],
  });
  ```

  A resource can also have multiple nested resources as deeply as needed recursively. `defineSubResource` function is oboleted.

  As of UI behaviour, the navigation shows only the first level of resources as sub items for the group that is a module.

## 0.3.0

### Minor Changes

- e724cd1: Upgrade tailwindcss to v4

## 0.2.0

### Minor Changes

- 22dc68c: Up until this release, AppShell did not support nested routes due to its limited routing implementation, but now it internally integrates react-router to support nested routes.

  It allows AppShell to be working as a standalone React application as well. A new app example that uses Vite instead of Next.js is added under `examples/vite-app`.

  AppShell is still usable as embedded Next.js route by levereging optional catch-all routes, but that's just an auxiliary interface.

  ### New functions

  To support nested routes, the following changes on functions to define resrouces are applied:

  #### `defineResource`

  A function to use the root-level resource that expects `title` and `category` as navigation metadata.

  ```tsx
  defineResource({
    path: "custom-page",
    component: () => <p>This is a custom page</p>,

    // Meta information
    meta: {
      title: "Custom Page",
      category: "Example",
    },
  });
  ```

  Behaviour on navigation UI: only the pages defined with `defineResource` function are the shown in navigation UI like sidebar items.

  #### `defineSubResource`

  A function to use the sub-level resource that expects only `title` as navigation metadata

  ```tsx
  defineResource({
    path: "custom-page",

    /*
     * (omitted...)
     */

    /*
     * Subresources works as the nested routes to the parent resource
     * Here defines the following two routes:
     * - /custom-page/sub-page
     * - /custom-page/sub-page/:id
     */
    subResources: [
      // Static route
      defineSubResource({
        path: "sub-page",
        component: () => (
          <p>This is a sub page</p>
        ),
        meta: {
          title: "Sub Page"
        }
      }),

      // Dynamic route
      defineSubResource({
        path: "sub-page/:id"
        component: () => (
          <p>This is is a sub page with dynamic parameter</p>
        )
      })
    ]
  })
  ```

  `defineSubResource` also accepts `subResources` as well to have nested children routes as many as you want.

## 0.1.0

### Minor Changes

- a9043b1: Initial release
