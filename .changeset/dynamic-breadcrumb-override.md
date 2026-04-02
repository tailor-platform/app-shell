---
"@tailor-platform/app-shell": minor
---

Add `useOverrideBreadcrumb` hook for dynamically overriding breadcrumb titles from within page components. This is useful for displaying data-driven titles (e.g., record names) instead of static route-based titles.

With `defineResource`:

```tsx
import { useOverrideBreadcrumb } from "@tailor-platform/app-shell";

defineResource({
  path: ":id",
  component: () => {
    const { data } = useQuery(GET_ORDER, { variables: { id } });

    // Update breadcrumb with the order name
    useOverrideBreadcrumb(data?.order?.name);

    return <OrderDetail />;
  },
});
```

With file-based routing (`pages/orders/[id]/page.tsx`):

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
