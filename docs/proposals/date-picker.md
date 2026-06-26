# Proposal: DatePicker / DateField (and future DateRangePicker)

> Status: **v1 implemented on the lighter §9 foundation (`@internationalized/date` + Base UI). This reverses the original `react-aria-components` decision below and is _pending sign-off_ — see the Revision note.**
> Scope: v1 ships `DateField`, `DatePicker`, and a standalone `Calendar`. `DateRangePicker` / `RangeCalendar` are designed-for but deferred.

## Revision — 2026-06-26 (foundation reconsidered)

The v1 foundation decision recorded below (`react-aria-components`, 2026-06-17) has been **revisited**, and the shipped implementation builds on the **§9 lighter foundation** — `@internationalized/date` + Base UI — measured at **~11 KB gz vs ~74 KB** for react-aria, with the same public API and value layer (see [`date-picker-impl-comparison.md`](date-picker-impl-comparison.md)).

- **Proposed for v1 — pending sign-off.** Adopting this in place of `react-aria-components` reverses the recorded decision; that swap needs explicit approval before merge. This note records the change of direction, not a finalised re-decision.
- **Trade-off (accepted only if signed off):** we own ~670 LOC of APG behaviour instead of Adobe-audited primitives. Documented gaps: **mobile/touch typing** (segments are `role="spinbutton"` with no hidden numeric `<input>`, so on-screen-keyboard entry is limited — the calendar is the touch path), **RTL arrow-key flipping**, and the pattern is unit-tested but **not yet screen-reader-audited**.

Everything below is the **original 2026-06-17 decision and analysis**, kept verbatim for the record.

## 1. Summary & decision

> **Decision (v1):** build on **`react-aria-components`** (Adobe) for the behaviour/a11y layer, with **`@internationalized/date`** as the value layer, wrapped in a thin app-shell presentation layer that matches every other component in the library. We accept the ~75 KB cost (§7) in exchange for audited APG accessibility at the lowest build risk. A lighter foundation is kept as a deliberate **future possibility (§9)**.

This choice is low-regret: the public API (§3) and the value layer are foundation-agnostic, so a later swap to a lighter foundation touches only the internal wrapper — not consumers, not stored values. The alternatives measured before settling here are kept in §1.1 for the record.

Verified facts behind this decision:

- **Single bundled stack.** Modern `react-aria-components` v1 ships as 3 pre-bundled artifacts (`react-aria-components`, `react-aria`, `react-stately`), not the 30+ split `@react-aria/*` packages of the v0 era. Net-new footprint ≈ 10 packages, 3 substantive.
- **Base UI has no date primitives** and none on the near roadmap, so "wait for Base UI" is not an option. Base UI remains our primitive provider for everything else; react-aria is scoped strictly to the date family.

The trade-off we accept: a second headless stack exists in the bundle, **bounded to date components** and invisible to consumers (they never import from `react-aria-components`).

## 1.1 Library choice — alternatives re-evaluated

The 75 KB figure prompted a re-test of the hypothesis: _is there a slimmer option that doesn't add a primitive foundation competing with Base UI?_ The deepest form of that concern is not bundle size — it's that **`react-aria-components` is itself a general primitive suite** (Popover, Dialog, Select, Menu, ComboBox, Table…) that directly overlaps Base UI. Measured with identical methodology (esbuild, minified + gzipped, `react`/`react-dom` externalised, tree-shaken to the date slice):

| Option                                  | Date slice (gz) | Value layer                     | Adds a competing primitive foundation?                      | A11y                                     | Build effort                     |
| --------------------------------------- | --------------: | ------------------------------- | ----------------------------------------------------------- | ---------------------------------------- | -------------------------------- |
| react-aria-components                   |         73.4 KB | `@internationalized/date` ✅    | **Yes** — full primitive suite overlaps Base UI             | Best-in-class, APG-audited, SR-tested    | Lowest                           |
| Ark UI / Zag.js                         |         42.7 KB | `@internationalized/date` ✅    | **Yes** — Ark is also a full headless suite (lighter)       | Good — Zag implements APG                | Low                              |
| Zag machine only + Base UI              |         39.4 KB | `@internationalized/date` ✅    | Partial — own popper/dismiss/live-region (dual positioning) | Good                                     | Medium (awkward wiring)          |
| **`@internationalized/date` + Base UI** |     **10.8 KB** | _is_ the value layer ✅         | **No** — value/math lib only                                | **We own it**                            | **Highest**                      |
| react-day-picker v10 + Base UI          |         20.4 KB | ❌ `date-fns`, **`Date`-based** | No — calendar widget only                                   | Calendar grid only; build input + dialog | High (+ loses value correctness) |

What the data changes:

- **The hypothesis is partly confirmed.** Slimmer, better-aligned options exist. react-aria is the _heaviest_ candidate and, with Ark available, no longer the obvious pick.
- **Ark UI/Zag strictly dominates react-aria** _if_ a second behaviour layer is acceptable: ~40% lighter, the **same** value layer (`@internationalized/date` → identical calendar systems, `ZonedDateTime`, value-type correctness), comparable APG a11y. react-aria's only remaining edges are maturity/ecosystem (Adobe, larger adoption) and an exceptionally polished segmented input.
- **`@internationalized/date` + Base UI is the only option that honours "no competing foundation"** while keeping value correctness — ~7× slimmer than react-aria. The cost is real: we build and _own_ the segmented input + calendar grid + APG dialog a11y (date pickers are the #1 place teams ship broken a11y). De-riskable by shipping the simpler APG _text-input + calendar-dialog_ pattern first (Base UI `Dialog` already handles focus trap/return/dismiss), with the segmented input as a fast-follow.
- **Drop react-day-picker:** `Date`-based, abandons the value-type thesis, _and_ still calendar-only (you build the input + dialog anyway). Worst of both.
- **Drop raw Zag-machine-on-Base-UI:** not meaningfully lighter than Ark (39 vs 43 KB) and forces two positioning systems.

**Outcome:** for v1 we chose **react-aria-components** (audited a11y, least build risk, largest ecosystem) and accept the bundle cost. Ark UI/Zag and the Base-UI-native build are retained as a **future direction** — see §9.

## 2. Why wrap — what the wrapper actually buys us

The interface-slimming is the _least_ of it. Ranked by value:

1. **Styling ownership (the main reason).** react-aria ships **zero CSS**. Without a wrapper, "use the DatePicker" means assembling ~12 headless sub-components and re-authoring all the `astw:` / theme-token / dark-mode / animation classes at every call site. The wrapper is where the visual identity lives — **once**. This is the same reason `Select` is wrapped today.
2. **Abstraction seam / vendor insulation (the strategic one).** Wrapping makes react-aria an _implementation detail_ behind our own stable API. If react-aria reshapes its composition, or we later move the popover to Base UI, or migrate off react-aria entirely, it's a one-package change — not a consumer-wide migration. This is precisely what makes "we took on a second stack" reversible rather than a long-term lock-in.
3. **Library consistency.** Consumers get `<DatePicker value onChange … />`, shaped like every other app-shell component, instead of a foreign 12-part Adobe composition. The second stack never enters the consumer's mental model.
4. **Footgun masking (correctness).** Bake in safe defaults: site timezone instead of `getLocalTimeZone()`, full BCP-47 locale, no `Date` round-trip, `granularity` → value-type discrimination. Hide the knobs that let people do the wrong thing.
5. **Interface slimming itself.** ~40 props + 12 sub-components → ~12 flat props. Real, but a _consequence_ of 1–4, not the goal.

**Counter-discipline:** don't re-design what's already good. Keep `value` / `onChange` / `minValue` / `maxValue` / `granularity` / `isDateUnavailable` named exactly as react-aria has them. We slim and add safety; we do not invent a new vocabulary (that would create a translation tax against upstream docs and churn).

## 3. Proposed public API

Three exports in v1, plus two deferred:

```tsx
<DateField />     // segmented typed input only, no popover  → DateValue
<DatePicker />    // input + popover + calendar              → DateValue
<Calendar />      // standalone inline calendar (reporting filters, no popover)

// deferred, designed-for:
<DateRangePicker />  // → { start: DateValue; end: DateValue }
<RangeCalendar />
```

Single-date and range are **separate components, not a `mode` prop** — they have different value types (`T` vs `{ start: T; end: T }`), and a `mode` prop forces every callsite to discriminate.

### 3.1 Value type is set by `granularity`

```tsx
<DatePicker granularity="day" />     // → CalendarDate          (no time, no tz)
<DatePicker granularity="minute" />  // → CalendarDateTime       (local wall-time)
<DatePicker granularity="minute" timeZone="America/Los_Angeles" />
                                     // → ZonedDateTime          (tz-aware)
```

`onChange` returns the `@internationalized/date` type — **never a JS `Date`**. Returning `Date` discards the calendar system and corrupts timezone reasoning, which is the whole point of the stack. For callers that genuinely need a `Date`, the value carries `.toDate(timeZone)`; ISO round-tripping to the backend lives in a codec layer (see §7).

### 3.2 Props we pass through (the 90% surface — names unchanged from react-aria)

| Prop                                       | Type                                      | Notes                                                   |
| ------------------------------------------ | ----------------------------------------- | ------------------------------------------------------- |
| `value` / `defaultValue` / `onChange`      | `DateValue` (typed by `granularity`)      | Controlled or uncontrolled                              |
| `granularity`                              | `"day" \| "hour" \| "minute" \| "second"` | Default `"day"`. Drives the value type                  |
| `minValue` / `maxValue`                    | `DateValue`                               | Same type as `value`                                    |
| `isDateUnavailable`                        | `(date) => boolean`                       | Single predicate — holidays, weekends, lead-time        |
| `isDisabled` / `isReadOnly` / `isRequired` | `boolean`                                 |                                                         |
| `isInvalid`                                | `boolean`                                 |                                                         |
| `autoFocus`                                | `boolean`                                 |                                                         |
| `hourCycle`                                | `12 \| 24`                                | Overrides locale default                                |
| `hideTimeZone`                             | `boolean`                                 | Cosmetic, `ZonedDateTime` only                          |
| `placeholderValue`                         | `DateValue`                               | Seeds the segment placeholder (e.g. default year)       |
| `firstDayOfWeek`                           | `"sun" \| "mon" \| …`                     | Forwarded to the inner `Calendar`; defaults from locale |
| `name`                                     | `string`                                  | Native form / form-library integration                  |

### 3.3 Props we add (app-shell conveniences)

| Prop           | Type              | Why                                                                                                |
| -------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| `label`        | `LocalizedString` | Renders `<Label>`; accepts our `LocalizedString` (string \| `(locale) => string`)                  |
| `description`  | `LocalizedString` | Renders the help text slot                                                                         |
| `errorMessage` | `LocalizedString` | Simpler than react-aria's `validate`-returns-`ValidationError`; matches our Field pattern          |
| `timeZone`     | `string` (IANA)   | **Defaults to the AppShell `timeZone`** (§6), _not_ `getLocalTimeZone()`                           |
| `locale`       | `string` (BCP-47) | Per-field override; **defaults to AppShell formatting locale** (§5)                                |
| `className`    | `string`          | Applied to the root group only — deep restyling is intentionally not a goal (wrapper owns visuals) |
| `data-slot`    | (internal)        | `date-picker`, `date-segment`, `calendar-cell`, … for testing/identification                       |

### 3.4 Props we mask or omit (explicit call-outs)

| react-aria prop / seam                                                                                                                                                                   | What we do                                  | Why                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Whole sub-component composition** — `DateInput` render-prop, `DateSegment`, `Group`, `Button`, `Popover`, `Dialog`, `Calendar`, `CalendarGrid`, `CalendarCell`, `Heading`, nav buttons | **Internalised.** Not exposed.              | This _is_ the styling/theme layer. Consumers must never assemble or re-style it — that's the wrapper's whole job (§2.1). The single biggest masking. |
| `validate` (returns `ValidationError`)                                                                                                                                                   | Replace with `isInvalid` + `errorMessage`   | Aligns with how every other app-shell field expresses errors. A power `validate` can be added later if the Form integration needs it.                |
| `validationBehavior` (`"native" \| "aria"`)                                                                                                                                              | **Pin `"aria"` default**, not exposed in v1 | One validation mode across the app instead of per-callsite drift. Revisit when we wire native `<Form>` integration.                                  |
| `isOpen` / `defaultOpen` / `onOpenChange`                                                                                                                                                | **Masked (uncontrolled only) in v1**        | Externally controlling the popover is rare; YAGNI. Easy to add later without breaking the surface.                                                   |
| `shouldForceLeadingZeros`                                                                                                                                                                | Omit                                        | Cosmetic; the locale already decides.                                                                                                                |
| `pageBehavior`                                                                                                                                                                           | Pin a sensible default, not exposed         | Niche calendar paging knob.                                                                                                                          |
| `shouldCloseOnSelect`                                                                                                                                                                    | Default `true`, not exposed                 | Sensible default; expose only if asked.                                                                                                              |
| RAC form context / `slot` plumbing                                                                                                                                                       | Internal                                    | Not part of the public contract.                                                                                                                     |

## 4. Example code

### 4.1 Consumer usage

```tsx
// Date helpers + types are re-exported from app-shell — no extra install (see §7.2):
import {
  DatePicker,
  DateField,
  Calendar,
  today,
  getLocalTimeZone,
  type CalendarDate,
} from "@tailor-platform/app-shell";

// Basic — date only (value is CalendarDate)
function ShipDate() {
  const [value, setValue] = useState<CalendarDate | null>(null);
  return <DatePicker label="Ship date" value={value} onChange={setValue} />;
}

// Constrained — no past dates, no weekends
<DatePicker
  label="Delivery date"
  minValue={today(getLocalTimeZone())}
  isDateUnavailable={(date) => {
    const dow = date.toDate(getLocalTimeZone()).getDay();
    return dow === 0 || dow === 6; // weekends unavailable
  }}
  errorMessage="Pick a weekday on or after today"
/>

// Date + time, timezone from the AppShell site config (value is ZonedDateTime)
<DatePicker label="Cut-off" granularity="minute" />

// Input-only, no popover (value is CalendarDate)
<DateField label="Invoice date" />

// Inline calendar for a reporting filter (no popover)
<Calendar aria-label="Report range start" value={value} onChange={setValue} />
```

### 4.2 Internal wrapper sketch (illustrative — proves where styling lives)

This is the part consumers never see. It shows the masking + theme-token reuse + data-attribute styling. Note the **popover reuses the exact same tokens as our Base UI popovers** (`bg-popover`, `--z-popup`, the same enter/exit animation classes); only the state-attribute _names_ differ (`data-entering`/`data-exiting` for react-aria vs `data-ending-style` for Base UI).

```tsx
import {
  DatePicker as RACDatePicker,
  Group,
  DateInput,
  DateSegment,
  Button,
  Label,
  Text,
  FieldError,
  Popover,
  Dialog,
  Calendar as RACCalendar,
  CalendarGrid,
  CalendarCell,
  Heading,
} from "react-aria-components";
import { cva } from "class-variance-authority";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { useTimeZone, useResolvedLocale } from "../contexts/appshell-context";

// Cell styling driven entirely by react-aria's boolean data-* attributes (Tailwind v4 arbitrary variants).
const cell = cva(
  "astw:flex astw:size-9 astw:items-center astw:justify-center astw:rounded-md astw:text-sm astw:outline-none",
  {
    variants: {
      state: {
        base: [
          "astw:data-[hovered]:bg-accent astw:data-[hovered]:text-accent-foreground",
          "astw:data-[focus-visible]:ring-ring/50 astw:data-[focus-visible]:ring-2",
          "astw:data-[selected]:bg-primary astw:data-[selected]:text-primary-foreground",
          "astw:data-[outside-month]:text-muted-foreground/50",
          "astw:data-[unavailable]:text-muted-foreground astw:data-[unavailable]:line-through",
          "astw:data-[disabled]:opacity-50 astw:data-[disabled]:pointer-events-none",
          // range states wired now so DateRangePicker is purely additive later:
          "astw:data-[selection-start]:rounded-l-md astw:data-[selection-end]:rounded-r-md",
        ],
      },
    },
    defaultVariants: { state: "base" },
  },
);

function DatePicker({ label, description, errorMessage, timeZone, locale, className, ...props }) {
  const shellTz = useTimeZone(); // §6
  const { locale: shellLocale } = useResolvedLocale(); // §5
  return (
    <RACDatePicker
      data-slot="date-picker"
      className={cn("astw:flex astw:flex-col astw:gap-1.5", className)}
      // resolution order: field prop → shell config → browser fallback handled in hook
      {...props}
    >
      {label && (
        <Label className="astw:text-foreground astw:text-sm astw:font-medium">{label}</Label>
      )}
      <Group
        className={cn(
          "astw:border-input astw:bg-background astw:flex astw:h-9 astw:w-full astw:items-center",
          "astw:rounded-md astw:border astw:px-3 astw:text-sm",
          "astw:focus-within:border-ring astw:focus-within:ring-ring/50 astw:focus-within:ring-[3px]",
          "astw:data-[invalid]:border-destructive",
        )}
      >
        <DateInput className="astw:flex astw:flex-1">
          {(segment) => (
            <DateSegment
              segment={segment}
              data-slot="date-segment"
              className={cn(
                "astw:rounded astw:px-0.5 astw:tabular-nums astw:outline-none",
                "astw:data-[focused]:bg-primary astw:data-[focused]:text-primary-foreground",
                "astw:data-[placeholder]:text-muted-foreground",
              )}
            />
          )}
        </DateInput>
        <Button className="astw:text-muted-foreground hover:astw:text-foreground astw:cursor-pointer">
          <CalendarIcon className="astw:size-4" />
        </Button>
      </Group>
      {description && (
        <Text slot="description" className="astw:text-muted-foreground astw:text-xs">
          {description}
        </Text>
      )}
      <FieldError className="astw:text-destructive astw:text-xs">{errorMessage}</FieldError>

      <Popover
        data-slot="date-popover"
        className={cn(
          // SAME tokens as our Base UI popover (see badge-list.tsx); only the
          // animation state-attribute names differ (data-entering/exiting vs data-ending-style).
          "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup)",
          "astw:rounded-md astw:border astw:p-3 astw:shadow-md astw:origin-(--trigger-anchor-point)",
          "astw:data-[entering]:animate-in astw:data-[entering]:fade-in-0 astw:data-[entering]:zoom-in-95",
          "astw:data-[exiting]:animate-out astw:data-[exiting]:fade-out-0 astw:data-[exiting]:zoom-out-95",
        )}
      >
        <Dialog className="astw:outline-none">
          <RACCalendar>
            <header className="astw:flex astw:items-center astw:justify-between astw:pb-2">
              <Button slot="previous">
                <ChevronLeftIcon className="astw:size-4" />
              </Button>
              <Heading className="astw:text-sm astw:font-medium" />
              <Button slot="next">
                <ChevronRightIcon className="astw:size-4" />
              </Button>
            </header>
            <CalendarGrid>{(date) => <CalendarCell date={date} className={cell()} />}</CalendarGrid>
          </RACCalendar>
        </Dialog>
      </Popover>
    </RACDatePicker>
  );
}
```

## 5. Locale — tag format call-out + granular-locale direction

### 5.1 The call-out (a real bug if we don't fix it)

`detectBrowserLocale()` in [lib/i18n.ts](../../packages/core/src/lib/i18n.ts) deliberately **strips to the language subtag**:

```ts
const locale = new Intl.Locale(browserLocale);
return locale.language; // "ja-JP" → "ja"
```

That is correct for **label resolution** (we have one translation table per language), but it throws away exactly the information formatting needs. react-aria's `I18nProvider` / `Intl` need the **full BCP-47 tag** to drive first-day-of-week (US = Sun, GB/EU = Mon), segment order (`MM/DD/YYYY` vs `DD/MM/YYYY`), 12h vs 24h, and numbering system.

Concrete failure: a browser reporting `en-GB` gets stripped to `en`, react-aria falls back to en-US defaults, and a British user sees `MM/DD/YYYY`, Sunday-first — wrong.

**Rule: never feed the stripped language code into react-aria. Feed the full tag.**

### 5.2 Direction: split "language" from "formatting locale" at the AppShell

This is bigger than DatePicker and shouldn't be solved DatePicker-locally — currency, number, and relative-time formatting will all want the same thing. The shape (high-level; to be specced separately):

- The AppShell takes **one source of truth: a full BCP-47 `locale`** (e.g. `"en-GB"`, `"ja-JP"`). Default to `navigator.languages[0]` (the full tag we already have), _not_ the stripped version.
- From it, derive two consumers held in `appshell-context`:
  - **`language`** = `new Intl.Locale(locale).language` → drives the **existing** label/i18n system, unchanged downstream.
  - **`locale`** (full) → drives **all Intl/CLDR formatting**: react-aria's `<I18nProvider locale={locale}>` mounted once at the shell root, and future `Intl.NumberFormat` / currency / `Intl.DateTimeFormat`.
- Expose via a hook, e.g. `useResolvedLocale(): { locale: string; language: string }`. DatePicker is simply the **first consumer**; currency/number formatters join later.
- **Backward compatible:** the label path still receives a language code (derived), so existing behaviour is preserved. We just stop discarding the region for the formatting path. Passing a bare `"en"` still works (Intl falls back to language defaults).
- Optional future: allow `language` and formatting `locale` to be set independently (e.g. Japanese UI text but US number format). A footnote, not v1.

## 6. Time zone — AppShell global config param

First-cut design, matching the "global context param" instinct:

- Add **`timeZone?: string`** (IANA, e.g. `"America/Los_Angeles"`) to the AppShell config, living in `appshell-context` alongside `locale`. Conceptually, **`locale` + `timeZone` together form the AppShell "formatting / i18n context"** — a cohesive concept, extensible to currency etc.
- Expose **`useTimeZone()`**.
- DatePicker resolves the zone in this order: **field `timeZone` prop → AppShell `timeZone` → `getLocalTimeZone()`** (last-resort fallback).
- **Only relevant for date+time** (`ZonedDateTime`). For `granularity="day"` the value is a `CalendarDate` with no zone, so this is a no-op — the common case is unaffected.
- **Multi-warehouse:** the per-field `timeZone` prop is the pressure valve for "this field is pinned to the site's zone, not the user's." Where that site zone comes from in context is a product question, but the mechanism is in place.

## 7. Bundle / dependency impact

### Dependency delta (verified)

- **~10 net-new packages**, of which **3 are substantive** (`react-aria-components`, `react-aria`, `react-stately`); the rest are small utilities (`@internationalized/*`, `@react-types/shared`, `aria-hidden`, `client-only`, `use-sync-external-store`).

### Measured size (esbuild, minified + gzipped, `react`/`react-dom` externalised, tree-shaken to the date slice)

| Surface                                                                        | minified |     gzipped |
| ------------------------------------------------------------------------------ | -------: | ----------: |
| Value layer (`@internationalized/date`)                                        |  32.8 KB | **10.8 KB** |
| RAC date components (DatePicker + DateField + Calendar + Popover + Dialog + …) | 241.5 KB | **73.4 KB** |
| Full date surface (both)                                                       | 246.4 KB | **74.7 KB** |

(The value layer is largely subsumed by the components — RAC already depends on it, so the marginal cost of adding it is ~1.3 KB.)

**This is notable — ~75 KB gz if loaded eagerly** — and bigger than the original research's ~30 KB estimate. The drivers are overlay/positioning, focus management, collections, and **bundled localized ARIA strings for ~30+ locales**.

### Mitigations (in priority order)

1. **Additive & opt-in.** Only routes/consumers that import a date component pay; everything else tree-shakes it out. A consumer using only `DateField` (no calendar/popover) pays substantially less.
2. **Lazy-load the popover/calendar behind the trigger.** Code-split so the field renders cheaply and the calendar chunk loads on first open. This moves the bulk off the initial bundle.
3. **Strip unused locales.** react-aria ships a build plugin (`@react-aria/optimize-locales-plugin`, Vite/Webpack/Babel) that drops ARIA strings for locales we don't ship. If we ship only `en` + `ja`, this trims a meaningful slice of the 73 KB. _(Verify exact savings in our build.)_
4. **Gate merge on a real bundle report** in the app's own bundler. This was an open question in the research; the measurement here confirms it's necessary, not optional.

## 7.1 What the bundle actually buys us

Reframed against the value layer, the premium is almost entirely **pre-built accessibility**, not i18n.

`@internationalized/date` alone (**10.8 KB**) already delivers the _correctness_ dimensions — and we keep these in **every** option:

- **Value-type correctness** — `CalendarDate` / `CalendarDateTime` / `ZonedDateTime`; no `Date` round-trip corruption.
- **13 calendar systems** (Gregorian, Buddhist, Hebrew, Indian, Islamic variants, Japanese, Persian, ROC…) selected by locale.
- **i18n formatting** — locale-driven segment order, first-day-of-week, 12/24h, numbering system.
- **All date math** — add/subtract, compare, parse, constrain, DST-correct zone conversions.

The **+32 KB (Ark)** or **+62 KB (react-aria)** on top buys the _interaction / a11y_ dimensions we would otherwise hand-build and maintain:

- **WAI-ARIA APG conformance** — dialog/grid roles, roving tabindex, live-region announcements, focus management/trap, scroll lock.
- **Segmented input behaviour** — per-segment Up/Down, type-to-fill auto-advance, locale segment ordering, backspace, invalid-input rejection at the segment.
- **Full keyboard grid nav** — arrows, Home/End, PageUp/Down, Shift+PageUp/Down (the keyboard-research "must-haves" come free).
- **Cross-browser + screen-reader testing** maintained by the vendor, not us.

So the real question is not "is 75 KB worth i18n + calendars" — that's the 11 KB value layer we keep regardless. It's **"is the a11y/interaction layer worth building and owning ourselves (~11 KB, highest effort), or worth renting for +32 KB (Ark) / +62 KB (react-aria)?"** That is the Decision fork.

### `@internationalized/date` vs `Intl.DateTimeFormat` — different layers, not alternatives

What this doc calls the "value layer" is the date **representation**: the immutable objects our `value` / `onChange` hold (`CalendarDate` / `CalendarDateTime` / `ZonedDateTime`) plus their arithmetic and parsing. `Intl.DateTimeFormat` is a **formatter** (value → localized string) — the zero-bundle native engine we use directly for display / number / currency, and which `@internationalized/date` itself calls under the hood. They compose; they don't compete.

"Use `Intl` instead of the lib" really means making JS `Date` the value type again — which reintroduces `Date`'s footguns, most notably the **date-only midnight-UTC shift**: a plain calendar date forced through a `Date` becomes an instant at midnight, so any timezone conversion (on parse, display, or save) can roll it a day forward/back. `CalendarDate` has no time and no zone, so there is nothing to shift.

Net: the ~11 KB buys **representation + parsing + timezone/calendar correctness**, _not_ formatting — formatting is free and native in every option.

## 7.2 Packaging / dependency surface

`@internationalized/date` is **public API**, not an internal detail — its types _are_ the `value` / `onChange` / `minValue` types. Decision: ship it as a **regular `dependency`** of `@tailor-platform/app-shell` and **re-export its common surface**, so consumers import everything from one place and install nothing extra.

- **Re-exported from `@tailor-platform/app-shell`** (the 90% surface): helpers `today`, `now`, `getLocalTimeZone`, `parseDate`, `parseDateTime`, `parseAbsolute`, `parseZonedDateTime`; types `CalendarDate`, `CalendarDateTime`, `ZonedDateTime`, `Time`, `DateValue`.
- **Long tail**: a consumer needing a helper we don't re-export adds `@internationalized/date` to their own deps and imports it directly; it dedupes with app-shell's copy (and react-aria's internal copy) to a **single instance** as long as version ranges overlap — keep app-shell's range compatible with react-aria's.

**Why a regular dep, not a peer:** lowest friction for a multi-feature library where dates are one feature. Consumers install only `@tailor-platform/app-shell`; there's no phantom-dependency hazard under pnpm because app-shell owns and resolves the copy. The contract is: **import date helpers/types from `@tailor-platform/app-shell`; only add `@internationalized/date` yourself for a long-tail helper.**

A later move to a peer dep, or to a lighter foundation (§9), stays an internal change — the re-export surface is the consumer contract, not the underlying package.

## 8. Open questions (follow-ups, not blockers)

- **Form integration.** `CalendarDate` doesn't `JSON.stringify` cleanly. Decide whether to coerce to ISO at the form boundary or teach the schema/validator the `@internationalized/date` types. Drives whether `validate` / `validationBehavior` get exposed.
- **Backend codec.** A small `parseAbsolute(iso, tz) → ZonedDateTime` / `value.toAbsoluteString()` layer. Decide where it lives (resolver edge vs GraphQL client vs field).
- **Presets** (`{ label, value }[]` rail in the popover) — defer to v1.1; validate that imperatively setting a value from a preset click doesn't break focus management. **→ track as a subtask on the issue.**
- **Keyboard / expression layer** (`t`, `+7`, `next tue`, etc.) — substantial enough to be **its own proposal**; the chosen foundation gives us the full APG grid + segment nav for free, the expression overlay is additive on top. **→ track as a subtask on the issue.**
- **Inline `Calendar` a11y.** The APG pattern is dialog-shaped; confirm RAC's standalone `Calendar` is correct for the no-popover reporting-filter case.
- **DateRangePicker.** Cells already carry range-state styling (§4.2), so it should be additive — confirm when we pick it up.

## 9. Future plans — a lighter foundation

We chose `react-aria-components` for v1, but the ~75 KB cost and the overlap with Base UI make a lighter foundation worth revisiting once the component is established and we have real usage + bundle data. **This is a tracked possibility, not a commitment.**

Why deferring is low-regret: all candidates share the **same public API (§3)** and the **same value layer (`@internationalized/date`)**, so a future migration touches only the internal wrapper — consumers and stored values are unaffected.

Two directions, in order of preference if/when we revisit:

1. **`@internationalized/date` + Base UI** (~11 KB) — removes the second foundation entirely; maximal alignment with our Base UI stack. Cost: we build and own the segmented input + calendar-grid + APG dialog a11y. De-risk by starting from the simpler APG _text-input + calendar-dialog_ pattern (Base UI `Dialog` already handles focus trap/dismiss), adding the segmented input afterward.
2. **Ark UI / Zag.js** (~43 KB) — ~40 % lighter than react-aria with the same value layer and good APG a11y, if a lighter, date-scoped second foundation is acceptable.

**Triggers to revisit:** the date components show up as a material slice in a bundle report; we adopt `@internationalized/date` elsewhere anyway; or Base UI ships its own date primitives. **Not pursued:** react-day-picker (`Date`-based, abandons value correctness) and raw Zag-machine-on-Base-UI (no lighter than Ark, dual positioning).
