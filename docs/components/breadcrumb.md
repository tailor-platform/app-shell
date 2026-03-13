# Breadcrumb

Navigation breadcrumb trail.

## Parts

| Part                   | Description                                |
| ---------------------- | ------------------------------------------ |
| `Breadcrumb.Root`      | Nav container (`<nav>`)                    |
| `Breadcrumb.List`      | Ordered list                               |
| `Breadcrumb.Item`      | Individual breadcrumb item                 |
| `Breadcrumb.Link`      | Clickable link (uses react-router `Link`)  |
| `Breadcrumb.Page`      | Current page (non-clickable)               |
| `Breadcrumb.Separator` | Separator between items (default: chevron) |
| `Breadcrumb.Ellipsis`  | Ellipsis for collapsed items               |

## Example

```tsx
import { Breadcrumb } from "@tailor-platform/app-shell";

<Breadcrumb.Root>
  <Breadcrumb.List>
    <Breadcrumb.Item>
      <Breadcrumb.Link to="/">Home</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Separator />
    <Breadcrumb.Item>
      <Breadcrumb.Link to="/products">Products</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Separator />
    <Breadcrumb.Item>
      <Breadcrumb.Page>Current Page</Breadcrumb.Page>
    </Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb.Root>;
```
