---
"@tailor-platform/app-shell": minor
---

Add a built-in error state to `Combobox.Async`, `Autocomplete.Async`, and `Select.Async`

When an async fetcher throws or rejects, the components now render an inline error state in the popover — a "Couldn't load results." message plus a **Retry** button that re-runs the last fetch — instead of silently falling back to the misleading "No results." empty state. This makes failed fetches distinguishable from genuinely-empty results without any consumer code.

The debounce/abort lifecycle is handled centrally: aborted/superseded requests are ignored, and outages are de-duped so typing during an outage doesn't stack repeated announcements.

Three new props on each `.Async` component:

| Prop           | Type                       | Default                    | Description                                                        |
| -------------- | -------------------------- | -------------------------- | ------------------------------------------------------------------ |
| `errorText`    | `string`                   | `"Couldn't load results."` | Message shown in the popover when the fetcher fails                |
| `retryText`    | `string`                   | `"Retry"`                  | Label for the retry button                                         |
| `onFetchError` | `(error: unknown) => void` | -                          | Called once per outage when a fetch fails (logging/error tracking) |

The `Combobox.useAsync` / `Autocomplete.useAsync` / `Select.useAsync` hooks now also expose `error` and a `retry()` function and accept an `onFetchError` option, for consumers building custom compositions with `Parts`.
