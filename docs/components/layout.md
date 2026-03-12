---
title: Layout
description: Responsive column layout component for organizing page content in 1, 2, or 3 columns
---

# Layout

`Layout` is a responsive column layout component that helps you organize page content into 1, 2, or 3 columns with automatic responsive behavior. Perfect for detail pages, dashboards, and forms.

## Import

```tsx
import { Layout } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Layout columns={2}>
  <Layout.Column>
    <h2>Main Content</h2>
    <p>Your main content goes here...</p>
  </Layout.Column>
  <Layout.Column>
    <h2>Sidebar</h2>
    <p>Additional info or actions...</p>
  </Layout.Column>
</Layout>
```

## Props

### Layout Props

| Prop        | Type                | Default      | Description                                     |
| ----------- | ------------------- | ------------ | ----------------------------------------------- |
| `columns`   | `1 \| 2 \| 3`       | **Required** | Number of columns in the layout                 |
| `title`     | `string`            | -            | Optional page title displayed above columns     |
| `actions`   | `React.ReactNode[]` | -            | Optional action buttons in header               |
| `gap`       | `4 \| 6 \| 8`       | `4`          | Gap between columns (in Tailwind spacing units) |
| `className` | `string`            | -            | Additional CSS classes for container            |
| `children`  | `Layout.Column[]`   | **Required** | Column components (must match `columns` count)  |

### Layout.Column Props

| Prop        | Type              | Default | Description            |
| ----------- | ----------------- | ------- | ---------------------- |
| `className` | `string`          | -       | Additional CSS classes |
| `children`  | `React.ReactNode` | -       | Column content         |

## Column Configurations

### 1 Column

Full-width layout, always stacks vertically:

```tsx
<Layout columns={1}>
  <Layout.Column>
    <DescriptionCard data={data} fields={fields} />
  </Layout.Column>
</Layout>
```

**Responsive behavior:**

- All screens: 1 column (full width)

### 2 Columns

Main content with sidebar:

```tsx
<Layout columns={2}>
  <Layout.Column>
    {/* Main content - flexible width */}
    <DescriptionCard data={orderData} fields={orderFields} />
  </Layout.Column>
  <Layout.Column>
    {/* Sidebar - fixed 280px on desktop */}
    <Card>Quick Actions</Card>
    <Card>History</Card>
  </Layout.Column>
</Layout>
```

**Responsive behavior:**

- Mobile (< 1024px): Stacks vertically
- Desktop (≥ 1024px): First column flexible, second column 280px

**Use cases:**

- Detail pages with sidebar
- Forms with preview
- Main content + related items

### 3 Columns

Left sidebar, main content, right sidebar:

```tsx
<Layout columns={3}>
  <Layout.Column>
    {/* Left sidebar - fixed 320px */}
    <Navigation />
  </Layout.Column>
  <Layout.Column>
    {/* Main content - flexible */}
    <DescriptionCard data={data} fields={fields} />
  </Layout.Column>
  <Layout.Column>
    {/* Right sidebar - fixed 280px */}
    <ActivityFeed />
  </Layout.Column>
</Layout>
```

**Responsive behavior:**

- Mobile (< 1280px): Stacks vertically
- Desktop (≥ 1280px): Left 320px, middle flexible, right 280px

**Use cases:**

- Dashboards with multiple panels
- Complex detail pages
- Editor with navigation and preview

## Header

Add a title and actions to create a page header:

```tsx
<Layout
  columns={2}
  title="Order #12345"
  actions={[
    <Button key="edit">Edit</Button>,
    <Button key="delete" variant="destructive">
      Delete
    </Button>,
  ]}
>
  <Layout.Column>{/* ... */}</Layout.Column>
  <Layout.Column>{/* ... */}</Layout.Column>
</Layout>
```

The header displays:

- **Title** on the left (large, bold)
- **Actions** on the right (buttons, dropdowns, etc.)

## Gap Spacing

Control the space between columns:

```tsx
// Small gap (16px)
<Layout columns={2} gap={4}>
  {/* ... */}
</Layout>

// Medium gap (24px)
<Layout columns={2} gap={6}>
  {/* ... */}
</Layout>

// Large gap (32px)
<Layout columns={2} gap={8}>
  {/* ... */}
</Layout>
```

## Examples

### Order Detail Page

```tsx
function OrderDetailPage() {
  const { id } = useParams();
  const order = useOrder(id);

  return (
    <Layout
      columns={2}
      title={`Order #${order.orderNumber}`}
      actions={[
        <Button key="print" variant="outline">
          Print
        </Button>,
        <Button key="edit">Edit Order</Button>,
      ]}
    >
      <Layout.Column>
        <DescriptionCard
          data={order}
          fields={[
            { key: "customer.name", label: "Customer" },
            { key: "orderDate", label: "Order Date", type: "date" },
            { key: "status", label: "Status", type: "badge" },
            { type: "divider" },
            { key: "total", label: "Total", type: "money" },
            { key: "shippingAddress", label: "Shipping", type: "address" },
          ]}
        />
      </Layout.Column>
      <Layout.Column>
        <Card>
          <h3>Quick Actions</h3>
          <Button fullWidth>Mark as Shipped</Button>
          <Button fullWidth>Send Invoice</Button>
        </Card>
        <Card>
          <h3>Order History</h3>
          <Timeline events={order.history} />
        </Card>
      </Layout.Column>
    </Layout>
  );
}
```

### Dashboard with 3 Columns

```tsx
function Dashboard() {
  return (
    <Layout columns={3} title="Dashboard">
      <Layout.Column>
        <Card>
          <h3>Navigation</h3>
          <nav>
            <a href="#overview">Overview</a>
            <a href="#sales">Sales</a>
            <a href="#products">Products</a>
          </nav>
        </Card>
      </Layout.Column>
      <Layout.Column>
        <Card>
          <h2>Sales Overview</h2>
          <Chart data={salesData} />
        </Card>
        <Card>
          <h2>Recent Orders</h2>
          <OrdersTable orders={recentOrders} />
        </Card>
      </Layout.Column>
      <Layout.Column>
        <Card>
          <h3>Activity Feed</h3>
          <ActivityList activities={activities} />
        </Card>
      </Layout.Column>
    </Layout>
  );
}
```

### Form with Live Preview

```tsx
function ProductEditor() {
  const [product, setProduct] = useState(initialProduct);

  return (
    <Layout
      columns={2}
      title="Edit Product"
      actions={[
        <Button key="cancel" variant="outline">
          Cancel
        </Button>,
        <Button key="save">Save Changes</Button>,
      ]}
    >
      <Layout.Column>
        <Card>
          <h3>Product Details</h3>
          <Input
            label="Name"
            value={product.name}
            onChange={(e) => setProduct({ ...product, name: e.target.value })}
          />
          <Input
            label="Price"
            type="number"
            value={product.price}
            onChange={(e) => setProduct({ ...product, price: e.target.value })}
          />
          <Textarea
            label="Description"
            value={product.description}
            onChange={(e) => setProduct({ ...product, description: e.target.value })}
          />
        </Card>
      </Layout.Column>
      <Layout.Column>
        <Card>
          <h3>Preview</h3>
          <ProductCard product={product} />
        </Card>
      </Layout.Column>
    </Layout>
  );
}
```

### Single Column with Header

```tsx
<Layout columns={1} title="Settings" actions={[<Button key="save">Save Changes</Button>]}>
  <Layout.Column>
    <Card>
      <h3>Account Settings</h3>
      <SettingsForm />
    </Card>
  </Layout.Column>
</Layout>
```

## Responsive Behavior

The Layout component automatically handles responsive breakpoints:

### Breakpoints

| Screen Size               | 1 Column   | 2 Columns    | 3 Columns    |
| ------------------------- | ---------- | ------------ | ------------ |
| Mobile (< 1024px)         | Full width | Stacked      | Stacked      |
| Desktop (1024px - 1280px) | Full width | Side-by-side | Stacked      |
| Large (≥ 1280px)          | Full width | Side-by-side | Side-by-side |

### Column Widths

**2 Columns (Desktop):**

- Column 1: Flexible (takes remaining space)
- Column 2: Fixed 280px minimum

**3 Columns (Desktop):**

- Column 1: Fixed 320px
- Column 2: Flexible (takes remaining space)
- Column 3: Fixed 280px

## Validation

The Layout component validates that the number of `Layout.Column` children matches the `columns` prop:

```tsx
// ✅ Correct - 2 columns with 2 children
<Layout columns={2}>
  <Layout.Column>A</Layout.Column>
  <Layout.Column>B</Layout.Column>
</Layout>

// ❌ Error - 2 columns with 3 children
<Layout columns={2}>
  <Layout.Column>A</Layout.Column>
  <Layout.Column>B</Layout.Column>
  <Layout.Column>C</Layout.Column> {/* Error! */}
</Layout>
```

Error message:

```
Layout: Expected exactly 2 Layout.Column children, but found 3.
Please ensure the number of <Layout.Column> children matches the `columns={2}` prop.
```

## Styling

### Custom Styling

Add custom classes to the layout container:

```tsx
<Layout columns={2} className="astw:bg-gray-50 astw:p-8 astw:rounded-lg">
  {/* ... */}
</Layout>
```

Add custom classes to individual columns:

```tsx
<Layout columns={2}>
  <Layout.Column className="astw:bg-white astw:shadow-sm">
    {/* Main content with background */}
  </Layout.Column>
  <Layout.Column className="astw:space-y-4">{/* Sidebar with extra spacing */}</Layout.Column>
</Layout>
```

## Best Practices

### Do:

- ✅ Use 2 columns for detail pages with sidebar
- ✅ Use 3 columns for dashboards and complex layouts
- ✅ Add meaningful titles to pages
- ✅ Group related actions in the header
- ✅ Keep sidebars focused (5-7 items max)

### Don't:

- ❌ Use 3 columns for mobile-first designs (too complex)
- ❌ Mix Layout with other layout systems (conflicts)
- ❌ Put too many actions in header (use dropdown menus)
- ❌ Forget to handle responsive behavior

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- Keyboard navigation support
- Screen reader friendly

## Related Components

- [DescriptionCard](./description-card.md) - Display data in columns
- [Badge](./badge.md) - Status indicators
- [SidebarLayout](./sidebar-layout.md) - App-level layout

## Related Concepts

- [Styling and Theming](../concepts/styling-theming.md) - Customize appearance
- [Modules and Resources](../concepts/modules-and-resources.md) - Page structure
