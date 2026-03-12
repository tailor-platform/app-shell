---
title: defineResource
description: Define a nested resource (page) within a module
---

# defineResource

Creates a nested resource (page) within a module. Resources represent individual pages in your application hierarchy.

## Signature

```typescript
function defineResource(props: DefineResourceProps): Resource;
```

## Parameters

### `path`

- **Type:** `string`
- **Required:** Yes
- **Description:** URL path segment for the resource. Supports dynamic parameters with `:param` syntax.

```typescript
defineResource({
  path: ":id", // Dynamic: /products/:id
  path: "categories", // Static: /products/categories
});
```

### `component`

- **Type:** `(props: ResourceComponentProps) => React.ReactNode`
- **Required:** Yes
- **Description:** Page component to render

**ResourceComponentProps:**

```typescript
{
  title: string;          // Resolved title
  icon?: React.ReactNode; // Inherited from module
  resources?: Resource[]; // Child resources
}
```

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
- **Description:** Icon override (inherits from module by default)

**meta.breadcrumbTitle**

- **Type:** `string | ((segment: string) => string)`
- **Description:** Custom breadcrumb segment title

### `subResources`

- **Type:** `Resource[]`
- **Required:** No
- **Description:** Nested resources within this resource

### `guards`

- **Type:** `Guard[]`
- **Required:** No
- **Description:** Access control guards

See [Guards Overview](./guards/overview.md) for details.

### `errorBoundary`

- **Type:** `React.ReactNode`
- **Required:** No
- **Description:** Error boundary component for this resource

### `loader`

- **Type:** `(args: LoaderFunctionArgs) => Promise<unknown> | unknown`
- **Required:** No
- **Description:** React Router loader function

## Return Type

```typescript
Resource;
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

```typescript
import { useParams } from "@tailor-platform/app-shell";

const productDetailResource = defineResource({
  path: ":id",
  meta: {
    title: "Product Details",
  },
  component: () => {
    const { id } = useParams();
    return <div>Product {id}</div>;
  },
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

### Resource with Loader

```typescript
const productResource = defineResource({
  path: ":id",
  component: ProductPage,
  loader: async ({ params }) => {
    const product = await fetch(`/api/products/${params.id}`);
    return product.json();
  },
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
import { type DefineResourceProps, type Resource } from "@tailor-platform/app-shell";

const props: DefineResourceProps = {
  path: ":id",
  component: DetailPage,
  guards: [],
};

const resource: Resource = defineResource(props);
```

## Related

- [defineModule](./define-module.md) - Define top-level modules
- [Guards Overview](./guards/overview.md) - Access control
- [useParams](./router/use-params.md) - Access route parameters
- [Modules & Resources Concept](../concepts/modules-and-resources.md) - Detailed guide
