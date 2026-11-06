---
"@tailor-platform/eslint-plugin-app-shell": minor
---

Add the `prefer-text-components` rule. It reports a Tailwind font size such as `text-sm` on a plain `p`, `h1` to `h6`, or `span` element, and names the `Text` element component to use (for example `Text.p`, default role `body-md`). It also reports a weight, `leading-*` or `tracking-*` on these elements when the class string has no typography role; on `p` and `span`, `font-semibold` alone is allowed for emphasis. The rule is not in `recommended`; enable it in your config. `Text.p` and the other element components need `@tailor-platform/app-shell` 1.19.0 or later.
