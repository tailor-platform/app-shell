# @tailor-platform/eslint-plugin-app-shell

## 0.3.0

### Minor Changes

- 6938be5: Add the `prefer-text-components` rule. It reports a Tailwind font size such as `text-sm` on a plain `p`, `h1` to `h6`, or `span` element, and names the `Text` element component to use (for example `Text.p`, default role `body-md`). It also reports a weight, `leading-*` or `tracking-*` on these elements when the class string has no typography role; on `p` and `span`, `font-semibold` alone is allowed for emphasis. The rule is not in `recommended`; enable it in your config. `Text.p` and the other element components need `@tailor-platform/app-shell` 1.19.0 or later.

## 0.2.0

### Minor Changes

- f16bacc: Add the `no-deprecated-tokens` rule and enable it in `recommended` as a warning. It reports the deprecated `--status-*`, `--alert-*`, `--destructive` and `--app-shell-type-*` tokens and their Tailwind utilities in string and template literals, and names the replacement, for example `text-destructive` → `text-danger-text` and `bg-status-completed/10` → `bg-success-surface`. These tokens still work but will be removed in the next major version of AppShell. The rule does not read CSS files.

## 0.1.0

### Minor Changes

- ee90145: Add the initial `@tailor-platform/eslint-plugin-app-shell` release for Oxlint. Enable its `recommended` ruleset from `oxlint.config.ts`:
  
  ```ts
  import { recommended } from "@tailor-platform/eslint-plugin-app-shell";
  
  export default defineConfig({ extends: [recommended] });
  ```
  
  The ruleset includes:
  
  - `@tailor-platform/app-shell/no-react-router-imports`, which requires routing APIs to be imported from `@tailor-platform/app-shell` rather than `react-router` or `react-router-dom`, preserving AppShell's router boundary.
  - `@tailor-platform/app-shell/no-astw-prefix`, which rejects the internal `astw:` CSS prefix in application source. Use ordinary Tailwind utilities on application markup and documented AppShell layout props instead.
