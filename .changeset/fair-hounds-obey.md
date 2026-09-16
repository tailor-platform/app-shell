---
"@tailor-platform/eslint-plugin-app-shell": minor
---

Add the initial `@tailor-platform/eslint-plugin-app-shell` release for Oxlint. Enable its `recommended` ruleset from `oxlint.config.ts`:

```ts
import { recommended } from "@tailor-platform/eslint-plugin-app-shell";

export default defineConfig({ extends: [recommended] });
```

The ruleset includes:

- `@tailor-platform/app-shell/no-react-router-imports`, which requires routing APIs to be imported from `@tailor-platform/app-shell` rather than `react-router` or `react-router-dom`, preserving AppShell's router boundary.
- `@tailor-platform/app-shell/no-astw-prefix`, which rejects the internal `astw:` CSS prefix in application source. Use ordinary Tailwind utilities on application markup and documented AppShell layout props instead.
