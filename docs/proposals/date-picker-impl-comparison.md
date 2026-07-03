# DatePicker — implementation comparison (measured)

Two complete, API-identical implementations of `DateField` / `DatePicker` / `Calendar` were built to validate the design proposal's library-choice analysis (`docs/proposals/date-picker.md`, §1.1 and §9) against real code:

| Branch                            | Behaviour/a11y foundation                             |
| --------------------------------- | ----------------------------------------------------- |
| `feat/date-picker-pp-1093`        | **react-aria-components** (Adobe)                     |
| `feat/date-picker-baseui-pp-1093` | **`@internationalized/date` + Base UI** (this branch) |

Both expose the **same public API** (`DateFieldProps` / `DatePickerProps` / `CalendarProps`), the same `LocalizedString` label/description/error props, the same AppShell `useResolvedLocale()` / `useTimeZone()` wiring, and the same `@internationalized/date` re-exports. A consumer cannot tell them apart from the import surface — exactly the "foundation-agnostic API" the proposal relies on for a low-regret swap.

## What "Base UI + raw @internationalized/date" actually means

Base UI has **no date primitives**, so this branch hand-rolls the behaviour react-aria would otherwise supply, on top of two new state engines:

- **`use-date-field-state.ts`** — segmented spinbutton field: locale-driven segment ordering via `DateFormatter.formatToParts`, per-segment increment/decrement with context-aware limits (e.g. day max from `endOfMonth`), numeric type-to-fill with auto-advance, and value-type discrimination by `granularity` (`CalendarDate` / `CalendarDateTime` / `ZonedDateTime`). No `Date` ever escapes.
- **`use-calendar-state.ts`** — calendar grid: locale + first-day-of-week week computation (`getWeeksInMonth` / `startOfWeek`), selection, roving focus, and full APG keyboard navigation (arrows, Home/End, PageUp/PageDown, Shift+PageUp/Down).

Base UI provides only the **`Popover`** (positioning, dismiss, portal) and the field's label/description/error structure idioms.

## Measured bundle cost (esbuild, minified + gzipped, react/react-dom external)

| Date slice                                        |     gzipped | Net-new for an app-shell consumer                |
| ------------------------------------------------- | ----------: | ------------------------------------------------ |
| `@internationalized/date` only                    | **11.2 KB** | both branches pay this                           |
| Base UI `Popover` + `@internationalized/date`     |     46.3 KB | Base UI already in bundle → marginal ≈ **11 KB** |
| react-aria date slice + `@internationalized/date` |     73.7 KB | whole second foundation → **+73.7 KB**           |

The decisive point: **Base UI is already in the app-shell bundle** (Dialog, Select, Combobox, Popover all use it), so the marginal dependency cost of the date components on this branch is essentially just `@internationalized/date` (~11 KB gz). The react-aria branch adds an entire second headless foundation (~74 KB gz) that overlaps Base UI. This confirms the proposal's projected ~11 KB vs ~73 KB (§1.1).

## Cost we take on: code we now own

| Implementation                      | Source LOC | Hand-rolled behaviour logic  |
| ----------------------------------- | ---------: | ---------------------------- |
| react-aria variant                  |       ~565 | 0 (rented from Adobe)        |
| `@internationalized/date` + Base UI |     ~1,526 | ~670 (the two state engines) |

~2.7× the source, ~670 LOC of date-interaction behaviour to maintain ourselves — the "highest build effort" the proposal flagged, now quantified.

## Parity verified

- **Tests:** the same 23-test suite (public behaviour + the DOM a11y contract — spinbutton segments, `role="grid"` cells with `data-selected`/`data-disabled`/`data-unavailable`/`data-outside-month`, `role="dialog"` popover, roving-focus keyboard nav) passes against both implementations unchanged.
- **Localization (verified in-browser):** segment order follows the locale — `en-US` → `mm/dd/yyyy`, `en-GB` → `dd/mm/yyyy`, `ja-JP` → `yyyy/mm/dd`; first-day-of-week follows the locale (Monday-first for `en-GB`); month/weekday names and the cell `aria-label` are `DateFormatter`-localized.
- **Value correctness:** `onChange` emits `@internationalized/date` values (never `Date`); time is preserved when picking a day in a date+time picker.

## Accessibility coverage (matched, verified in-browser)

- **Segmented field:** labelled `role="group"` of `role="spinbutton"` segments carrying `aria-valuemin`/`max`/`now`/`text`, `aria-label`, `aria-invalid`, `aria-disabled`, `aria-readonly`; per-segment `↑`/`↓`, digit type-to-fill with auto-advance, `←`/`→`/`Home`/`End` between segments, `Backspace` to clear. Errors render as `role="alert"` and link via `aria-describedby`.
- **Calendar grid:** `role="grid"` with localized `columnheader`s (full-day `aria-label`s), full-date cell `aria-label`s, roving `tabindex`, and APG keyboard — `←`/`→` day, `↑`/`↓` week, `Home`/`End` week ends, `PageUp`/`PageDown` month, `Shift`+`PageUp`/`PageDown` year, `Enter`/`Space` select. Focus follows across month boundaries; the month heading is an `aria-live` region.
- **Popover/dialog:** opening the picker moves focus into the grid (today/selected cell) so arrows work immediately; selecting or `Escape` closes it and returns focus to the trigger (Base UI). The trigger gets `aria-haspopup="dialog"`/`aria-expanded` from Base UI.

## Known gaps vs react-aria (the price of owning it)

- **Mobile/touch text entry:** react-aria's segments are `contentEditable` spans with `inputmode="numeric"`, so a touch device surfaces the on-screen keyboard and types into them. Ours are **non-editable** (`contentEditable={false}`) `role="spinbutton"` divs driven by `keydown` — which soft keyboards don't emit — so touch typing doesn't work (desktop keyboard + the calendar both work fully; the calendar is the touch path). The biggest remaining gap, but **addressable** by matching react-aria: make the segments `contentEditable` with `inputmode="numeric"` and route `beforeinput` (a focused, contained fast-follow — needs real-device QA).
- **RTL arrow direction:** `←`/`→` are LTR-fixed; in RTL locales react-aria flips them. Needs a direction check in the grid key handler.
- **Calendar systems:** robust for Gregorian; the 13 non-Gregorian calendars react-aria supports automatically are not wired up (the value layer can represent them; the field/grid interaction would need extension).
- **Localized chrome strings:** segment placeholders (`yyyy`/`mm`/`dd`) and the prev/next-month button labels are English; react-aria localizes these from its bundled CLDR strings.
- **Dedicated navigation live-region:** we rely on roving focus + cell `aria-label` (the APG-standard announcement) plus an `aria-live` month heading; react-aria adds an extra visually-hidden live region for navigation/selection announcements.
- **Breadth of SR/browser testing:** react-aria ships vendor-maintained cross-browser + screen-reader coverage; ours is the APG pattern implemented and unit-tested, not yet SR-audited.

## Takeaway

The Base-UI-native build is real and shippable: identical API, identical a11y/DOM contract, full localization for the common case, at ~1/7th the dependency weight — at the cost of ~670 LOC of behaviour we maintain and a few advanced-i18n gaps. This is precisely the trade the proposal framed as the §9 "future possibility," now de-risked with working code on both sides.
