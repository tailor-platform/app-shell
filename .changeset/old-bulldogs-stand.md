---
"@tailor-platform/app-shell": minor
---

Add `Layout.Header` sub-component and `area` prop to `Layout.Column`.

## Motivation

The current `Layout` component requires a `columns` prop that must exactly match the number of `Layout.Column` children, and embeds header concerns (`title`, `actions`) directly into the layout component. This coupling creates several issues:

- **Redundant declaration** — The column count can be inferred from the number of `Layout.Column` children, making the `columns` prop unnecessary boilerplate.
- **Limited column placement** — The 2-column template always treats the 1st column as main (flex) and the 2nd as a fixed sidebar. There is no way to express a "left sidebar + main content" layout.
- **Mixed responsibilities** — `Layout` handles both page heading (title/actions) and column arrangement. Separating these into `Layout.Header` and `Layout.Column` makes each concern independently composable — for example, placing tabs between the header and columns.

## What's New

- **`Layout.Header`**: Compose inside `Layout` for title, actions, and extra content (e.g. tabs) above columns.
- **`Layout.Column` `area` prop**: Declare column roles (`left`, `main`, `right`) for area-based width templates, enabling layouts like left sidebar + main that were previously not possible.
- **`columns` and `gap` props are deprecated**: Column count is auto-detected from children; use `className` for gap.
- **No breaking changes** — existing code continues to work as-is.

## Usage

```tsx
// With Layout.Header (title, actions, and extra content such as tabs)
<Layout className="gap-6">
  <Layout.Header title="Edit" actions={<Button>Save</Button>}>
    <Tabs>...</Tabs>   {/* Renders below title/actions, above Columns */}
  </Layout.Header>
  <Layout.Column>Main content</Layout.Column>
  <Layout.Column>Side panel</Layout.Column>
</Layout>

// With area prop (Left + Main)
<Layout>
  <Layout.Column area="left">Side nav</Layout.Column>
  <Layout.Column area="main">Main content</Layout.Column>
</Layout>

// With area prop (3 columns)
<Layout>
  <Layout.Column area="left">Left panel</Layout.Column>
  <Layout.Column area="main">Main content</Layout.Column>
  <Layout.Column area="right">Right panel</Layout.Column>
</Layout>

// Existing API still works
<Layout title="Edit" actions={[<Button key="save">Save</Button>]} columns={2}>
  <Layout.Column>Main content</Layout.Column>
  <Layout.Column>Side panel</Layout.Column>
</Layout>
```

## Sub-components

| Component | Status | Props |
|---|---|---|
| `Layout.Column` | Retained | `area?: "left" \| "main" \| "right"`, `className?`, `children?` |
| `Layout.Header` | **New** | `title?`, `actions?: ReactNode`, `children?: ReactNode` |

## Children Rules

- **`Layout.Header`** — At most one. Placed above Columns.
- **`Layout.Column`** — Maximum of 3. If more than 3 are provided, only the first 3 are rendered and a `console.warn` is emitted.
- **`area` prop** — All-or-nothing: either every Column specifies `area`, or none do. Partial specification, duplicate areas, or invalid values emit a `console.warn` and fall back to position-based behavior.
- **Anything else** — Not rendered. A `console.warn` is emitted.

## Width Templates

### Position-based (no `area`, unchanged from current API)

| Column Count | Responsive Behavior | Width Distribution |
|---|---|---|
| 1 | Always stacked vertically | Full width |
| 2 | < 1024px: stacked / ≥ 1024px: side-by-side | 1st flex-1, 2nd fixed 280px |
| 3 | < 1280px: stacked / ≥ 1280px: side-by-side | 1st fixed 320px, 2nd flex-1, 3rd fixed 280px |

### Area-based (with `area` prop)

| Area | Width |
|---|---|
| `left` | Fixed 320px |
| `main` | flex-1 |
| `right` | Fixed 280px |

Responsive behavior is the same: 2 columns break at 1024px, 3 columns break at 1280px.

