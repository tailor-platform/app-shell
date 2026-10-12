---
"@tailor-platform/app-shell": patch
---

Fix `<Layout fill>` with several columns on narrow screens. Below the breakpoint where the columns stack (`lg` for two columns, `xl` for three), the layout no longer bounds its rows, so no column is squashed to zero height and the content area scrolls as usual — as the `fill` docs already describe. Side-by-side behaviour is unchanged.
