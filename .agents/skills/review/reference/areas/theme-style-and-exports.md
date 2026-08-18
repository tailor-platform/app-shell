# Theme, Style, and Export Review Criteria

Review these changes as **published consumer-contract work**, not only local styling work.

## Why this area exists in AppShell

AppShell ships both React components and CSS entrypoints. Theme work can look fine inside this repo while still breaking a consuming app's imports, Tailwind token access, dark mode, or host-CSS overrides.

## Current AppShell examples

- `packages/core/package.json` publishes the consumer-facing style/export contract: `./styles`, `./theme.css`, and `./themes/*`.
- `packages/core/src/assets/theme.bridge.css` maps semantic tokens into Tailwind-facing `--color-*` variables.
- `packages/core/src/assets/theme-bridge.test.ts` exists specifically because component snapshots would not catch a missing bridge token.
- `packages/core/src/assets/theme.shims.css` and `packages/core/src/assets/theme.css` carry compatibility and base-theme behavior that consumers import directly.

## Area-exclusive review checks

### Public entrypoints stay stable

Check whether public style and export paths remain understandable and stable:

- CSS entrypoints
- `styles` exports
- compatibility shims
- legacy import paths that consumers may still rely on

### Consumer integration

Review how the change behaves in a consuming app, including:

- Tailwind theme bridging
- CSS variable availability
- consumer overrides and host CSS interaction
- dark mode
- asset delivery if touched

Be skeptical when the repo's own examples still work only because they import more CSS or run in a friendlier environment than consumers do.

### JS/CSS boundary ownership

Be skeptical when a JS entrypoint starts owning CSS side effects unless that contract is explicit and documented.

### Documentation and migration

Review whether docs and examples still describe the shipped contract:

- correct import path
- current migration story
- current workaround status
- current theme model and terminology

## Expected evidence

Prefer evidence that exercises the published contract: export paths, generated CSS, theme bridge coverage, or an example/consumer integration path.

## Pair with

- `../cross-cutting/component-design.md`
