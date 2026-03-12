---
title: useNavigate
description: Hook for programmatic navigation between routes
---

# useNavigate

React Router hook for programmatic navigation. Re-exported from `react-router` for convenience.

## Signature

```typescript
const useNavigate: () => (to: string | number, options?: NavigateOptions) => void;
```

## Usage

### Navigate to Path

```typescript
import { useNavigate } from "@tailor-platform/app-shell";

function MyComponent() {
  const navigate = useNavigate();

  const goToProducts = () => {
    navigate("/products");
  };

  return <button onClick={goToProducts}>View Products</button>;
}
```

### Navigate with Dynamic Parameters

```typescript
function ProductCard({ id }: { id: string }) {
  const navigate = useNavigate();

  const viewDetails = () => {
    navigate(`/products/${id}`);
  };

  return <button onClick={viewDetails}>Details</button>;
}
```

### Navigate Back

```typescript
function BackButton() {
  const navigate = useNavigate();

  return <button onClick={() => navigate(-1)}>Back</button>;
}
```

### Navigate Forward

```typescript
function ForwardButton() {
  const navigate = useNavigate();

  return <button onClick={() => navigate(1)}>Forward</button>;
}
```

### Replace Current Entry

```typescript
function LoginSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Replace current history entry (user can't go back to login)
    navigate("/dashboard", { replace: true });
  }, []);

  return <div>Redirecting...</div>;
}
```

### Navigate with State

```typescript
function ProductsList() {
  const navigate = useNavigate();

  const selectProduct = (product: Product) => {
    navigate(`/products/${product.id}`, {
      state: { from: "list" },
    });
  };

  return <ProductList onSelect={selectProduct} />;
}

// Access state in target component
function ProductDetail() {
  const location = useLocation();
  const from = location.state?.from; // "list"
}
```

## NavigateOptions

```typescript
interface NavigateOptions {
  replace?: boolean; // Replace current entry instead of pushing
  state?: any; // Pass state to target route
  preventScrollReset?: boolean;
  relative?: "route" | "path";
}
```

## Important Notes

### Import from AppShell

Always import from `@tailor-platform/app-shell`, not `react-router`:

```typescript
// ✅ Correct
import { useNavigate } from "@tailor-platform/app-shell";

// ❌ Wrong - won't work with AppShell's router
import { useNavigate } from "react-router";
```

This ensures you're using AppShell's router instance.

## Related

- [useParams](./use-params.md) - Access route parameters
- [useLocation](./use-location.md) - Access current location
- [Routing & Navigation](../../concepts/routing-navigation.md) - Navigation guide
