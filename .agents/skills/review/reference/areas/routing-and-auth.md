# Routing and Auth Review Criteria

Review these changes as **multi-surface integration work**, not as isolated route objects.

## Why this area exists in AppShell

In AppShell, one route/resource model fans out into several user-visible surfaces:

- router creation and error boundaries
- sidebar navigation
- command-palette navigation/search
- breadcrumb and page-meta resolution
- auth callback and redirect handling

A change that looks correct in one surface can still drift in another.

## Current AppShell examples

- `packages/core/src/routing/router.tsx` keeps the router instance stable across auth-driven rerenders so OAuth callback URLs are not processed twice.
- `packages/core/src/routing/navigation.tsx` builds sidebar nav items from the guarded module/resource tree.
- `packages/core/src/components/command-palette.tsx` turns those nav items back into navigable routes via `navItemsToRoutes()`.
- `packages/core/src/routing/routes.tsx` has special handling for component-less resources, settings routes, and 404 behavior.
- `packages/core/src/hooks/use-page-meta.ts` and `packages/core/src/hooks/use-override-breadcrumb.ts` are separate metadata surfaces that still need to agree with routing behavior.

## Area-exclusive review checks

### Parity across surfaces

When routing behavior changes, check whether the same concept still behaves consistently across:

- declarative routing
- file-based routing
- sidebar navigation
- command palette/navigation search
- breadcrumb generation
- root page metadata

Be skeptical when one route concept now needs separate wiring in more than one of those places.

### Ownership boundaries

Review whether ownership remains clear for:

- route loader responsibilities
- guard responsibilities
- auth callback handling
- redirect decisions
- browser-facing navigation state

Be skeptical when the same responsibility is split across multiple layers without a crisp boundary.

### Lifecycle stability

Routing/auth bugs here are often ordering problems rather than syntax problems. Review for:

- router creation stability across rerenders
- callback processing that runs exactly when intended
- auth initialization that does not race normal navigation
- Suspense/subscription interactions that do not create loops or repeated requests
- fixes that depend on fragile effect ordering rather than a stable lifecycle boundary

### Real browser behavior

Keep real browser behavior in mind for:

- deep links
- reload
- back/forward navigation
- logout/login transitions
- callback entry URLs
- 404 and settings-route fallbacks

## Expected evidence

Prefer browser-level or e2e smoke evidence for public routing/auth changes, especially when callback URLs, redirects, or navigation surfaces changed.

## Pair with

- `../cross-cutting/react.md`
- `../cross-cutting/accessibility.md`
- `../cross-cutting/low-level-apis.md` only if the diff uses timing or imperative coordination
