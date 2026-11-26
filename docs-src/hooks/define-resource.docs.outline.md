---
kind: prose
group: define-resource
title: defineResource
description: Define a nested resource (page) within a module
---

# defineResource

Creates a nested resource (page) within a module. Resources represent individual pages in your application hierarchy.

## Signature

```typescript
import { defineResource } from "@tailor-platform/app-shell";

type ResourceOptions = Parameters<typeof defineResource>[0];
type AppResource = ReturnType<typeof defineResource>;
```

The option and return types can be derived from the public function; `DefineResourceProps` and `Resource` are not package-root exports.

## Parameters

### `path`

- **Type:** `string`
- **Required:** Yes
- **Description:** URL path segment for the resource. Supports dynamic parameters with `:param` syntax.

```typescript
defineResource({ path: ":id" }); // Dynamic: /products/:id
defineResource({ path: "categories" }); // Static: /products/categories
```

### `component`

- **Type:** `(props: ResourceComponentProps) => React.ReactNode`
- **Required:** No
- **Description:** Page component to render. If omitted, the exact resource path returns 404 while its `subResources` remain accessible. Guards still run: `redirectTo()` can redirect; if all guards pass, the component-less path remains a 404.

**ResourceComponentProps:**

```typescript
type ResourceComponentProps = {
  title: string; // Resolved title
  icon?: React.ReactNode;
  resources?: Array<ReturnType<typeof defineResource>>; // Sub-resources
};
```

Import `ResourceComponentProps` from AppShell when typing a page. AppShell passes `title` and `resources`; the optional `icon` field is not injected into page props.

### `meta`

- **Type:** `object`
- **Required:** No
- **Description:** Metadata configuration

**meta.title**

- **Type:** `string | LocalizedString`
- **Default:** Capitalized `path`
- **Description:** Display title in navigation and breadcrumbs

**meta.icon**

- **Type:** `React.ReactNode`
- **Description:** Icon associated with this resource's navigation metadata. It is not inherited from the module or injected into page props.

**meta.breadcrumbTitle**

- **Type:** `string | ((segment: string) => LocalizedString)`
- **Description:** Custom breadcrumb segment title. Pass `labels.t(key)` directly for localization: `breadcrumbTitle: labels.t("orders")`. Other callbacks receive the URL segment and may return a `LocalizedString`, for example `breadcrumbTitle: (segment) => labels.t("order", { id: segment })` for a dynamic label. AppShell resolves it using the current locale. The existing `() => labels.t(key)` form remains supported; handwritten locale functions must be returned from an outer callback. When omitted, the breadcrumb uses the localized `meta.title`.

### `subResources`

- **Type:** `Array<ReturnType<typeof defineResource>>`
- **Required:** No
- **Description:** Nested resources within this resource

### `guards`

- **Type:** `Guard[]`
- **Required:** No
- **Description:** Access control guards

See [Guards Overview](./guards/overview.md) for details.

### `errorBoundary`

- **Type:** `ErrorBoundaryComponent` (`React.ReactNode`)
- **Required:** No
- **Description:** Error boundary component for this resource

## Return Type

```typescript
type AppResource = ReturnType<typeof defineResource>;
```

A resource object used in the `resources` array of `defineModule`.

## Examples

### Basic Resource

```typescript
import { defineResource } from "@tailor-platform/app-shell";

const detailResource = defineResource({
  path: ":id",
  component: () => <div>Detail Page</div>,
});
```

### Resource with Title

```typescript
const categoriesResource = defineResource({
  path: "categories",
  meta: {
    title: "Product Categories",
  },
  component: CategoriesPage,
});
```

### Dynamic Route with useParams

```tsx
import { defineResource, useParams } from "@tailor-platform/app-shell";

function ProductDetailPage() {
  const { id } = useParams();
  return <div>Product {id}</div>;
}

const productDetailResource = defineResource({
  path: ":id",
  meta: {
    title: "Product Details",
  },
  component: ProductDetailPage,
});
```

### Nested Resources

```typescript
const ordersResource = defineResource({
  path: "orders",
  component: OrdersListPage,
  subResources: [
    defineResource({
      path: ":id",
      component: OrderDetailPage,
      subResources: [
        defineResource({
          path: "edit",
          component: OrderEditPage,
        }),
      ],
    }),
  ],
});

// URLs:
// /orders
// /orders/:id
// /orders/:id/edit
```

### Resource with Guards

```typescript
import { pass, hidden } from "@tailor-platform/app-shell";

const adminSettingsResource = defineResource({
  path: "admin-settings",
  component: AdminSettingsPage,
  guards: [
    ({ context }) => {
      return context.currentUser?.role === "admin" ? pass() : hidden();
    },
  ],
});
```

### Resource with Error Boundary

```typescript
import { useRouteError } from "@tailor-platform/app-shell";

const ErrorBoundary = () => {
  const error = useRouteError() as Error;
  return <div>Error: {error.message}</div>;
};

const detailResource = defineResource({
  path: ":id",
  component: DetailPage,
  errorBoundary: <ErrorBoundary />,
});
```

### Resource with Custom Breadcrumb

```typescript
const orderResource = defineResource({
  path: ":id",
  meta: {
    breadcrumbTitle: (segment) => `Order #${segment}`,
  },
  component: OrderDetailPage,
});

// Breadcrumb shows: "Orders > Order #12345"
// Instead of: "Orders > 12345"
```

### Multiple Resources

```typescript
const productsModule = defineModule({
  path: "products",
  meta: { title: "Products" },
  component: ProductsPage,
  resources: [
    defineResource({
      path: ":id",
      meta: { title: "Product Details" },
      component: ProductDetailPage,
    }),
    defineResource({
      path: "categories",
      meta: { title: "Categories" },
      component: CategoriesPage,
    }),
    defineResource({
      path: "brands",
      meta: { title: "Brands" },
      component: BrandsPage,
    }),
  ],
});
```

## Navigation Behavior

Resources appear in:

- ✅ Sidebar navigation (top-level resources only)
- ✅ Breadcrumbs (all levels)
- ✅ CommandPalette search (all levels)
- ❌ Main navigation menu (use modules instead)

### Example Navigation

```typescript
defineModule({
  path: "products",
  meta: { title: "Products" },
  component: ProductsPage,
  resources: [
    defineResource({
      path: "all",
      component: AllProductsPage, // Appears in sidebar
    }),
    defineResource({
      path: ":id",
      component: ProductDetailPage,
      subResources: [
        defineResource({
          path: "edit",
          component: EditPage, // Only in breadcrumbs, not sidebar
        }),
      ],
    }),
  ],
});
```

**Sidebar:**

```
› Products
  - All Products
```

**Breadcrumbs (on edit page):**

```
Products > Product Details > Edit
```

## TypeScript

```typescript
import { defineResource } from "@tailor-platform/app-shell";

type ResourceOptions = Parameters<typeof defineResource>[0];
type AppResource = ReturnType<typeof defineResource>;

const props: ResourceOptions = {
  path: ":id",
  component: DetailPage,
  guards: [],
};

const resource: AppResource = defineResource(props);
```

## Related

- [defineModule](./define-module.md) - Define top-level modules
- [Guards Overview](./guards/overview.md) - Access control
- [useParams](./router/use-params.md) - Access route parameters
- [Modules & Resources Concept](../concepts/modules-and-resources.md) - Detailed guide
