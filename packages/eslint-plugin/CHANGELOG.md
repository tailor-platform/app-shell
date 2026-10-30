# @tailor-platform/eslint-plugin-app-shell

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
