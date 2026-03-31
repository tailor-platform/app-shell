---
"@tailor-platform/app-shell": minor
---

Add `useOverrideBreadcrumb` hook for dynamically overriding breadcrumb titles from within page components. This is useful for displaying data-driven titles (e.g., record names) instead of static route-based titles.

```tsx
import { useOverrideBreadcrumb } from "@tailor-platform/app-shell";

const OrderDetail = () => {
  const { data } = useQuery(GET_ORDER, { variables: { id } });
  useOverrideBreadcrumb(data?.order?.name);
  return <div>...</div>;
};
```
