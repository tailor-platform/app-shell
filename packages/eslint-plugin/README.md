# @tailor-platform/eslint-plugin-app-shell

[![npm version](https://img.shields.io/npm/v/@tailor-platform/eslint-plugin-app-shell)](https://www.npmjs.com/package/@tailor-platform/eslint-plugin-app-shell)
[![npm downloads](https://img.shields.io/npm/dm/@tailor-platform/eslint-plugin-app-shell)](https://www.npmjs.com/package/@tailor-platform/eslint-plugin-app-shell)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/tailor-platform/app-shell/blob/main/LICENSE.md)

AppShell usage rules for Oxlint.

## Oxlint

```ts
import { recommended } from "@tailor-platform/eslint-plugin-app-shell";
import { defineConfig } from "oxlint";

export default defineConfig({ extends: [recommended] });
```

`recommended` enables:

- `@tailor-platform/app-shell/no-react-router-imports` — requires routing APIs to be imported from `@tailor-platform/app-shell` rather than `react-router` or `react-router-dom`.
- `@tailor-platform/app-shell/no-astw-prefix` — prevents applications from depending on AppShell's internal `astw:` CSS prefix.
- `@tailor-platform/app-shell/no-deprecated-tokens` (warning) — reports deprecated colour and typography tokens and names the replacement. It covers the `--status-*`, `--alert-*` and `--destructive` tokens and their Tailwind utilities (for example `text-destructive` → `text-danger-text`), and `--app-shell-type-*` (→ `--type-*`). These still work but will be removed in the next major version. The rule reads string and template literals in JS and TS files, so it does not check CSS files; search theme CSS for `--status-`, `--alert-` and `--destructive` as the migration guide describes.

## Rules not in `recommended`

Enable these rules in your own config:

```ts
import { recommended } from "@tailor-platform/eslint-plugin-app-shell";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [recommended],
  rules: { "@tailor-platform/app-shell/prefer-text-components": "warn" },
});
```

- `@tailor-platform/app-shell/prefer-text-components` — reports a Tailwind font size (`text-xs` to `text-9xl`, and arbitrary sizes such as `text-[11px]`) on a plain `p`, `h1` to `h6`, or `span` element, and names the `Text` element component to use. For example, `<p className="text-sm">` → `<Text.p>` (default role `body-md`), and `<h3 className="text-lg font-semibold">` → `<Text.h3>` (default role `heading-sm`; set another role with `variant`). For `span`, it names `Text.span` (default role `label-md`), or a role utility such as `text-label-md` or `text-body-sm` when you style the element yourself.
  - It reads string and template literals in `className`, ternary branches, and the arguments of `cn`, `clsx`, `cx`, `classNames`, `twMerge` and `twJoin`. It does not follow variables or constants.
  - It does not report weight utilities on their own. `font-semibold` is allowed with a role for emphasis.
  - It has no autofix. A size does not decide the role: `text-sm` can be `body-md`, `label-md` or `heading-sm`.
  - `Text.p` and the other element components are available from `@tailor-platform/app-shell` 1.19.0. In an app on an earlier version, the rule names components that do not exist yet, so upgrade AppShell before you enable it.
