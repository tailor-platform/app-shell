---
"@tailor-platform/app-shell": minor
---

Expand the re-exported React Router surface so an app never needs `react-router` as a direct
dependency, and add `memory` routing to `AppShell` for tests.

AppShell owns the router — it builds the route tree, constructs the router, and renders the
`RouterProvider`. An app that also resolves its own copy of `react-router` ends up with two
copies in the bundle and two unrelated router contexts: AppShell's navigation keeps working
while the app's own `useNavigate` / `useLocation` / `<Link>` throw
`may be used only in the context of a <Router> component`, with nothing for TypeScript to catch.
Apps were reaching for a direct dependency because the re-exported surface was incomplete. This
closes those gaps.

**Newly available from `@tailor-platform/app-shell`:**

- `useMatch`, `useResolvedPath` — route matching, for active states and relative paths
- `useNavigation` — the in-flight navigation, for pending UI
- `NavLink` — a link that knows when it is active
- `useBlocker`, `useBeforeUnload` — guard navigation away from unsaved changes
- Types: `Location`, `NavigateFunction`, `NavigateOptions`, `To`, `Params`, `PathMatch`,
  `LinkProps`, `NavLinkProps`, `Navigation`, `Blocker`, `BlockerFunction`

**New `@tailor-platform/app-shell/testing` entry point**, so tests need no `react-router` either:

- `AppShell` — the same shell, additionally accepting `memory` / `initialEntries` to mount at a
  fixed URL without touching `window.location`. For page and integration tests.
- `TestRouter` — a minimal router context for unit-testing a single component that uses
  `useNavigate` or renders a `<Link>`, without booting the whole shell. Pass `path` when the
  component reads the route (`useParams`, `useMatch`), so the location matches something.

```tsx
import { AppShell, TestRouter } from "@tailor-platform/app-shell/testing";

render(
  <AppShell memory initialEntries={["/orders/A42"]} modules={modules}>
    <SidebarLayout />
  </AppShell>,
);
```

Memory routing is reachable only from `/testing`. The production `AppShell` pins it off, so it
holds for JS callers and `any` spreads as well as typed ones.

Router construction (`createBrowserRouter`, `RouterProvider`, `MemoryRouter`, `Routes`, `Route`)
and the data-router APIs (`useLoaderData`, `useSubmit`, `useFetcher`, `useActionData`) remain
deliberately unexported: AppShell owns the former and does not wire up the latter. If something
you need is missing, ask for it rather than adding a direct `react-router` dependency.
