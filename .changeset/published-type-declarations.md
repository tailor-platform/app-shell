---
"@tailor-platform/app-shell": minor
---

Fix the published type declarations, which referenced types they never declared.

`dist/app-shell.d.ts` shipped with nine errors inside our own package. Consumers who compile with `skipLibCheck: false` saw all nine attributed to `@tailor-platform/app-shell`, not to their own code. We never noticed because `packages/core/tsconfig.json` sets `skipLibCheck: true`, so neither `pnpm type-check` nor CI ever looked at the declarations we emit.

Three defects, all now fixed at the source:

- **`PositionProps` was referenced but never declared.** It is the type of the `position` prop on `Menu.Content` and `Tooltip.Content`, but it was tagged `@internal`, so the declaration rollup stripped it while keeping five references to it. It is now **exported from the package root**, which is the additive change that makes this release a minor: consumers can finally name the type they are required to pass.

  ```tsx
  import { Menu, type PositionProps } from "@tailor-platform/app-shell";

  const dropdown: PositionProps = { side: "bottom", align: "start", sideOffset: 8 };
  <Menu.Content position={dropdown} />;
  ```

- **`Form` emitted a broken merged declaration** (TS2395). A `function` declaration carrying an expando `displayName` is emitted as a function/namespace merge, and the rollup duplicated the namespace — once exported, once local. `Form` is now a const with an explicit component type, following the same idiom already used by `Select`, `Combobox`, and `Autocomplete`. Its generic is unchanged, so `<Form<MyValues>>` still infers callback values.

- **`Layout.Header` was emitted as a type instead of a value** (TS2709). `Layout.Header = Header` emitted `var Header: typeof import("./Layout").Header`, which the rollup rewrote to a bare `Header` — a namespace, not a type. `Layout` now uses the explicit `Object.assign` idiom, like `Grid`.

The public runtime API is unchanged: the built bundle exports exactly the same 100 names as before, and `PositionProps` is a type-only export.

A `check-dts` gate now runs in CI to keep this from returning. It builds, packs the tarball, installs it into a scratch project, and type-checks every entry point that publishes `types` with `skipLibCheck: false` — the same thing a consumer does. Entry points are read from `package.json`, so new ones are covered as soon as they are added.
