---
title: useOverrideBreadcrumb
description: Hook for dynamically overriding breadcrumb titles from within page components
---

# useOverrideBreadcrumb

React hook to dynamically override the breadcrumb title for the current page. Useful for displaying data-driven titles (e.g., record names fetched from an API) instead of static route-based titles.

## Signature

```typescript
function useOverrideBreadcrumb(title: string | undefined): void;
```

## Parameters

### `title`

- **Type:** `string | undefined`
- **Required:** Yes
- **Description:** The title to display in the breadcrumb for the current path. When `undefined`, any previous override is removed and the default title (from `defineResource`) is restored.

## Usage

### With `defineResource`

```tsx
import { useOverrideBreadcrumb } from "@tailor-platform/app-shell";

defineResource({
  path: ":id",
  component: () => {
    const { id } = useParams();
    const { data } = useQuery(GET_ORDER, { variables: { id } });

    // Update breadcrumb with the order name
    useOverrideBreadcrumb(data?.order?.name);

    return <OrderDetail />;
  },
});
```

### With file-based routing

```tsx
import { useOverrideBreadcrumb, useParams } from "@tailor-platform/app-shell";

const OrderDetailPage = () => {
  const { id } = useParams();
  const { data } = useQuery(GET_ORDER, { variables: { id } });

  // Update breadcrumb with the order name
  useOverrideBreadcrumb(data?.order?.name);

  return <div>...</div>;
};

export default OrderDetailPage;
```

## Notes

- The hook updates reactively — pass the result of a data-fetching query directly and the breadcrumb updates when the data resolves.
- When `title` is `undefined` (e.g., while data is loading), the override is cleared and the default title is shown.
- The override is automatically cleaned up when the component unmounts.

## Related

- [defineResource](./define-resource.md) - Define routes and their default breadcrumb titles
- [Routing and Navigation](../concepts/routing-navigation.md) - Overview of breadcrumb behavior
