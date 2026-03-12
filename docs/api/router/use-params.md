---
title: useParams
description: Hook to access dynamic route parameters
---

# useParams

React Router hook to access dynamic route parameters from the URL. Re-exported from `react-router` for convenience.

## Signature

```typescript
const useParams: <T extends Record<string, string>>() => T;
```

## Usage

### Access Single Parameter

```typescript
import { useParams } from "@tailor-platform/app-shell";

// Route: /products/:id
function ProductDetail() {
  const { id } = useParams();

  return <div>Product ID: {id}</div>;
}
```

### Multiple Parameters

```typescript
// Route: /categories/:category/products/:id
function ProductInCategory() {
  const { category, id } = useParams();

  return (
    <div>
      Category: {category}
      <br />
      Product ID: {id}
    </div>
  );
}
```

### With Data Fetching

```typescript
function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(r => r.json())
      .then(setOrder);
  }, [id]);

  return <div>Order #{id}</div>;
}
```

### TypeScript with Type Safety

```typescript
import { useParams } from "@tailor-platform/app-shell";

interface ProductParams {
  id: string;
}

function ProductDetail() {
  const { id } = useParams<ProductParams>();
  //    ^ type: string

  return <div>Product {id}</div>;
}
```

## Route Definition

Parameters are defined in `defineResource` using `:param` syntax:

```typescript
import { defineModule, defineResource } from "@tailor-platform/app-shell";

const productsModule = defineModule({
  path: "products",
  component: ProductsList,
  resources: [
    defineResource({
      path: ":id", // ← Dynamic parameter
      component: () => {
        const { id } = useParams(); // Access here
        return <div>Product {id}</div>;
      },
    }),
  ],
});
```

### Nested Parameters

```typescript
const ordersModule = defineModule({
  path: "orders",
  component: OrdersList,
  resources: [
    defineResource({
      path: ":orderId",
      component: OrderDetail,
      subResources: [
        defineResource({
          path: "items/:itemId",
          component: () => {
            const { orderId, itemId } = useParams();
            return <div>Order {orderId}, Item {itemId}</div>;
          },
        }),
      ],
    }),
  ],
});

// URL: /orders/123/items/456
// useParams() returns: { orderId: "123", itemId: "456" }
```

## Important Notes

### Always Import from AppShell

```typescript
// ✅ Correct
import { useParams } from "@tailor-platform/app-shell";

// ❌ Wrong - won't work with AppShell's router
import { useParams } from "react-router";
```

### Parameters are Always Strings

```typescript
const { id } = useParams();
// id is always a string, even for numeric IDs

// Convert if needed:
const numericId = parseInt(id, 10);
```

### Optional Parameters

For optional parameters, check for undefined:

```typescript
const { filter } = useParams();

if (filter) {
  // Filter is provided
} else {
  // Filter is optional and not provided
}
```

## Examples

### Edit Page

```typescript
// Route: /products/:id/edit
function ProductEdit() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    loadProduct(id).then(setProduct);
  }, [id]);

  return (
    <form>
      <h1>Edit Product {id}</h1>
      {/* form fields */}
    </form>
  );
}
```

### Delete Confirmation

```typescript
function DeleteConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleDelete = async () => {
    await deleteProduct(id);
    navigate("/products");
  };

  return (
    <div>
      <p>Delete product {id}?</p>
      <button onClick={handleDelete}>Confirm</button>
    </div>
  );
}
```

## Related

- [useNavigate](./use-navigate.md) - Programmatic navigation
- [useLocation](./use-location.md) - Access current location
- [defineResource](../define-resource.md) - Define routes with parameters
- [Routing & Navigation](../../concepts/routing-navigation.md) - Navigation guide
