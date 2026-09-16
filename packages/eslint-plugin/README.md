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
