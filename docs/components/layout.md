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

The column count is auto-detected from the number of `Layout.Column` children:

```tsx
<Layout>
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

| Prop        | Type                | Default      | Description                                                                     |
| ----------- | ------------------- | ------------ | ------------------------------------------------------------------------------- |
| `className` | `string`            | -            | Additional CSS classes for container                                            |
| `children`  | `Layout.Column[]`   | **Required** | `Layout.Header` and/or `Layout.Column` components                               |
| `columns`   | `1 \| 2 \| 3`       | -            | **(Deprecated)** Auto-detected from `Layout.Column` children count when omitted |
| `title`     | `string`            | -            | **(Deprecated)** Use `<Layout.Header title="...">` instead                      |
| `actions`   | `React.ReactNode[]` | -            | **(Deprecated)** Use `<Layout.Header actions={[...]}>` instead                  |
| `gap`       | `number`            | `4`          | **(Deprecated)** Use `className` (e.g. `className="gap-6"`) instead             |

### Layout.Header Props

`Layout.Header` is a compound sub-component for page-level headers. Place it as a direct child of `<Layout>`, above any `<Layout.Column>` children.

| Prop       | Type                | Default | Description                                                |
| ---------- | ------------------- | ------- | ---------------------------------------------------------- |
| `title`    | `string`            | -       | Page title (left side, rendered as `<h1>`)                 |
| `actions`  | `React.ReactNode[]` | -       | Action buttons or nodes (right side)                       |
| `children` | `React.ReactNode`   | -       | Full-width content below the title/actions row (e.g. tabs) |

### Layout.Column Props

| Prop        | Type                          | Default | Description                                                               |
| ----------- | ----------------------------- | ------- | ------------------------------------------------------------------------- |
| `className` | `string`                      | -       | Additional CSS classes                                                    |
| `area`      | `"left" \| "main" \| "right"` | -       | Column area role for explicit width control (see [Area Mode](#area-mode)) |
| `children`  | `React.ReactNode`             | -       | Column content                                                            |

## Column Configurations

### 1 Column

Full-width layout, always stacks vertically:

```tsx
<Layout>
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
<Layout>
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
<Layout>
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

Use `Layout.Header` to add a page-level header with title, actions, and optional full-width content:

```tsx
<Layout>
  <Layout.Header
    title="Order #12345"
    actions={[
      <Button key="edit">Edit</Button>,
      <Button key="delete" variant="destructive">
        Delete
      </Button>,
    ]}
  />
  <Layout.Column>{/* ... */}</Layout.Column>
  <Layout.Column>{/* ... */}</Layout.Column>
</Layout>
```

The header displays:

- **Title** on the left (rendered as `<h1>`, large and bold)
- **Actions** on the right (buttons, dropdowns, etc.)
- **Children** (optional) full-width below the title/actions row

### Header with Tabs

```tsx
<Layout>
  <Layout.Header title="Purchase Orders" actions={[<Button key="create">Create</Button>]}>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="open">Open</TabsTrigger>
      </TabsList>
    </Tabs>
  </Layout.Header>
  <Layout.Column>…</Layout.Column>
</Layout>
```

## Area Mode

By default, column widths are determined by position (first, second, third). You can use the `area` prop on `Layout.Column` to explicitly assign roles:

| Area      | Width          |
| --------- | -------------- |
| `"left"`  | Fixed 320px    |
| `"main"`  | Flexible (1fr) |
| `"right"` | Fixed 280px    |

All `Layout.Column` children must have an `area` prop, or none — mixing is not supported.

```tsx
<Layout>
  <Layout.Column area="main">
    <h2>Content</h2>
  </Layout.Column>
  <Layout.Column area="left">
    <nav>Sidebar</nav>
  </Layout.Column>
</Layout>
```

With area mode, the visual order is always left → main → right regardless of source order.

## Gap Spacing

Use `className` to control the space between columns:

```tsx
<Layout className="astw:gap-6">
  <Layout.Column>{/* ... */}</Layout.Column>
  <Layout.Column>{/* ... */}</Layout.Column>
</Layout>
```

## Examples

### Order Detail Page

```tsx
function OrderDetailPage() {
  const { id } = useParams();
  const order = useOrder(id);

  return (
    <Layout>
      <Layout.Header
        title={`Order #${order.orderNumber}`}
        actions={[
          <Button key="print" variant="outline">
            Print
          </Button>,
          <Button key="edit">Edit Order</Button>,
        ]}
      />
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
    <Layout>
      <Layout.Header title="Dashboard" />
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
    <Layout>
      <Layout.Header
        title="Edit Product"
        actions={[
          <Button key="cancel" variant="outline">
            Cancel
          </Button>,
          <Button key="save">Save Changes</Button>,
        ]}
      />
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

### Area-Based Layout

```tsx
function EditorPage() {
  return (
    <Layout>
      <Layout.Header title="Editor" />
      <Layout.Column area="left">
        <FileTree />
      </Layout.Column>
      <Layout.Column area="main">
        <CodeEditor />
      </Layout.Column>
      <Layout.Column area="right">
        <PropertiesPanel />
      </Layout.Column>
    </Layout>
  );
}
```

### Single Column with Header

```tsx
<Layout>
  <Layout.Header title="Settings" actions={[<Button key="save">Save Changes</Button>]} />
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

The Layout component validates its children:

- Only `Layout.Header` and `Layout.Column` are allowed as direct children
- Maximum of 3 `Layout.Column` children (extra columns are ignored with a warning)
- When using `area` mode, all columns must have an `area` prop (or none)
- Duplicate `area` values produce a warning and fall back to position-based layout

## Styling

### Custom Styling

Add custom classes to the layout container:

```tsx
<Layout className="astw:bg-gray-50 astw:p-8 astw:rounded-lg">{/* ... */}</Layout>
```

Add custom classes to individual columns:

```tsx
<Layout>
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
