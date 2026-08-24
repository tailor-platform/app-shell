---
"@tailor-platform/app-shell": minor
---

Move `react-router` from `dependencies` to `peerDependencies`, at `^8.3.0`.

`react-router` carries React context, and context identity is per module instance, so app-shell
and the app it powers must share **one** copy. As a regular dependency that was never guaranteed:
whenever an app's resolved `react-router` differed from app-shell's, both were installed, the two
routers were disjoint, and the app's own `useNavigate` / `useLocation` / `<Link>` threw
`may be used only in the context of a <Router> component` — while app-shell's own chrome kept
working, so nothing looked broken from app-shell's side. TypeScript could not see it either. That
could also start happening with no code change on either side, whenever a new `react-router`
release shifted one range's resolution and not the other's.

As a peer dependency the app supplies the single instance, and a mismatch is reported at install
time instead of surfacing as a broken page.

**What you need to do.** Declare `react-router` in your app's own dependencies:

```jsonc
{
  "dependencies": {
    "@tailor-platform/app-shell": "^1.13.0",
    "react-router": "^8.3.0",
  },
}
```

Most apps already do — app-shell has required react-router 8 since 1.11.0. If you don't declare
it, npm and pnpm install a satisfying version for app-shell automatically, but under pnpm it is
not linked at your project's top level, so your own `import { useNavigate } from "react-router"`
fails to resolve at build time. Declaring it explicitly avoids that.
