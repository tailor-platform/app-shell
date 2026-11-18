---
kind: code-backed
group: create-typed-paths
title: createTypedPaths
description: Create type-safe route path helpers from a route-to-parameters type map
sources:
  - packages/core/src/fs-routes/typed-paths.ts
---

# createTypedPaths

Creates a type-safe path builder from a route-to-parameters type map. The Vite plugin can generate this map and a ready-to-use `paths` helper, but the factory can also be used with a manually declared map.

## Signature

```typescript
const paths = createTypedPaths<Routes>();
```

The factory takes **no runtime arguments**. It does not accept a pages object or register routes.

## Type Parameter

### `Routes`

- **Constraint:** `Record<string, Record<string, string>>`
- **Description:** A map whose keys are route templates and whose values name each route's string parameters. Use `{}` for a static route.

## Return Value

An object with a `for(template, params)` method:

- Static routes need only the template.
- Dynamic routes require an object with the declared parameter names.
- The result is a URL path string; dynamic parameter values are URL-encoded.
- A query suffix on the template is preserved, such as `"/products/:id?tab=details"`.

## Usage

### Basic Usage

```typescript
import { createTypedPaths } from "@tailor-platform/app-shell";

type Routes = {
  "/products": {};
  "/products/:id": { id: string };
};

const paths = createTypedPaths<Routes>();

paths.for("/products"); // "/products"
paths.for("/products/:id", { id: "123" }); // "/products/123"
paths.for("/products/:id?tab=details", { id: "123" }); // "/products/123?tab=details"
```

The following examples reuse `paths` from above. Its type map must match the routes configured in your application.

### With useNavigate

```tsx
import { Button, useNavigate } from "@tailor-platform/app-shell";

function ProductCard({ id }: { id: string }) {
  const navigate = useNavigate();

  return <Button onClick={() => navigate(paths.for("/products/:id", { id }))}>View Details</Button>;
}
```

### With Link Component

```tsx
import { Link } from "@tailor-platform/app-shell";

function ProductLink({ id }: { id: string }) {
  return <Link to={paths.for("/products/:id", { id })}>View Product</Link>;
}
```

### Nested Routes

```typescript
const orderPaths = createTypedPaths<{
  "/orders": {};
  "/orders/:id": { id: string };
  "/orders/:id/edit": { id: string };
}>();

orderPaths.for("/orders"); // "/orders"
orderPaths.for("/orders/:id", { id: "1" }); // "/orders/1"
orderPaths.for("/orders/:id/edit", { id: "1" }); // "/orders/1/edit"
```

## TypeScript Benefits

```typescript
paths.for("/products/:id", { id: "123" }); // Valid

// @ts-expect-error Missing required parameters
paths.for("/products/:id");

// @ts-expect-error Wrong parameter name
paths.for("/products/:id", { productId: "123" });

// @ts-expect-error Unknown route
paths.for("/missing");
```

## Generated File-Based Routes

With the Vite plugin's `generateTypedRoutes` option enabled, prefer importing `paths` from your generated routes file instead of maintaining the type map yourself. The generated file calls `createTypedPaths<RouteParams>()` for you; application code still uses `paths.for(template, params)`.

```tsx
import { Link } from "@tailor-platform/app-shell";
import { paths } from "./routes.generated";

function ProductLink({ id }: { id: string }) {
  return <Link to={paths.for("/products/:id", { id })}>View Product</Link>;
}
```

This assumes your generated map contains `/products/:id`. The import path depends on the configured output location. See [File-Based Routing](../concepts/file-based-routing.md) for setup.

## Related

- [File-Based Routing](../concepts/file-based-routing.md) - Setup guide
- [Routing and Navigation](../concepts/routing-navigation.md) - Generated routes and navigation
- [useNavigate](./router/use-navigate.md) - Programmatic navigation
