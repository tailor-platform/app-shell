---
"@tailor-platform/app-shell": minor
"@tailor-platform/app-shell-vite-plugin": minor
---

Add file-based routing support via new Vite plugin

File-based routing allows defining pages by placing components in a directory structure, eliminating the need for explicit `defineModule()` and `defineResource()` calls.

### Why file-based routing?

**URL-First Design is Already the Norm** - Most projects naturally align their module/resource hierarchy with URL paths. A "purchasing" module at `/purchasing` with an "orders" resource at `/purchasing/orders` is the intuitive choice. The previous API required manually wiring up this structure even though the mapping was already implicit.

**AI-Friendly Development** - By adopting file-based routing patterns pioneered by Next.js, AI tools can understand and navigate your codebase with less context. Code generation becomes more predictable and the established convention serves as shared knowledge between humans and AI.

**Providing Rails, Not Just Flexibility** - The legacy `defineModule()`/`defineResource()` API gave flexibility but offered few conventions for directory structure, hierarchy management, or file naming. File-based routing provides an opinionated, battle-tested convention.

Importantly, this is implemented as a Vite plugin layer on top of the existing programmatic API. Projects requiring non-standard routing can still use `defineModule()`/`defineResource()` directly.

### Backward Compatibility

File-based routing is a **recommended opt-in** feature. The legacy declarative API (`defineModule()`/`defineResource()`) remains fully supported and will continue to work. You can choose either approach per project, though mixing both in the same application is not supported.

### Vite Plugin

The new `@tailor-platform/app-shell-vite-plugin` package provides file-based routing support:

```typescript
// vite.config.ts
import { appShellRoutes } from '@tailor-platform/app-shell-vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    appShellRoutes(), // scans src/pages by default
  ],
});
```

Under the hood, the plugin:
1. **Scans pages** - Finds `page.tsx` files in `src/pages` and builds a route tree
2. **Generates virtual module** - Creates `virtual:app-shell-pages` with all discovered pages
3. **Auto-injects pages** - Intercepts `@tailor-platform/app-shell` imports and wraps `AppShell` with `AppShell.WithPages(pages)`
4. **Validates at build time** - Uses ts-morph AST analysis to validate `appShellPageProps`
5. **Supports HMR** - Watches for page changes and triggers hot reload

No manual wiring needed—just import `AppShell` as usual and pages are automatically available.

### Defining Pages

```tsx
// src/pages/dashboard/page.tsx
import type { AppShellPageProps } from '@tailor-platform/app-shell';

const DashboardPage = () => <div>Dashboard</div>;

DashboardPage.appShellPageProps = {
  meta: { title: "Dashboard" },
  guards: [authGuard],
} satisfies AppShellPageProps;

export default DashboardPage;
```

### Type-safe Routes (Optional)

```typescript
// vite.config.ts
appShellRoutes({ generateTypedRoutes: true })
```

When enabled, the plugin generates `src/routes.generated.ts` containing:
- `GeneratedRouteParams` type mapping all routes to their parameter types
- `paths` helper with a type-safe `for()` method for building URLs
- Module augmentation to register route types with app-shell

```tsx
// Auto-generated: src/routes.generated.ts
export type GeneratedRouteParams = {
  "/": {};
  "/dashboard": {};
  "/dashboard/orders/:id": { id: string };
};
export const paths = createTypedPaths<GeneratedRouteParams>();

// Usage - TypeScript enforces correct params
import { paths } from './routes.generated';

paths.for("/dashboard");                              // ✓ OK
paths.for("/dashboard/orders/:id", { id: "123" });    // ✓ OK → "/dashboard/orders/123"
paths.for("/dashboard/orders/:id");                   // ✗ Error: missing 'id'
paths.for("/invalid-route");                          // ✗ Error: route doesn't exist
```
