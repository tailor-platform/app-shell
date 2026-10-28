---
"@tailor-platform/app-shell": minor
---

Add element components to `Text`: `Text.h1` to `Text.h6`, `Text.p`, `Text.span`, and `Text.div`. Each one always renders its named HTML element with a default typography role, and takes `variant`, `className`, the element's own attributes, and a ref.

```tsx
<Text.h1>Purchase orders</Text.h1>
<Text.h3 variant="heading-lg">Line items</Text.h3>
<Text.p className="text-muted-foreground">Orders sent this month.</Text.p>
<Text.span variant="body-sm">Updated recently</Text.span>
```

The defaults are `heading-lg` for `Text.h1`, `heading-md` for `Text.h2`, `heading-sm` for `Text.h3` to `Text.h6`, `body-md` for `Text.p` and `Text.div`, and `label-md` for `Text.span`. Headings written this way do not need a `jsx-a11y/heading-has-content` disable comment. `Text` and its `render` prop do not change; use `render` for other elements and to compose with another component.
