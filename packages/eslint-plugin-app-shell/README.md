# @tailor-platform/eslint-plugin-app-shell

AppShell usage rules for Oxlint.

## Oxlint

```ts
import { recommended } from "@tailor-platform/eslint-plugin-app-shell";
import { defineConfig } from "oxlint";

export default defineConfig({ extends: [recommended] });
```

`recommended` enables `@tailor-platform/app-shell/no-react-router-imports`, which requires routing APIs to be imported from `@tailor-platform/app-shell` rather than `react-router` or `react-router-dom`.
