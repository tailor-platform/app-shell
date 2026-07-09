# AppShell Components

> **AppShell version:** `0.36.0` (matches `packages/erp-kit/templates/scaffold/app/*/frontend/package.json` pinned `@tailor-platform/app-shell` semver)
> **Source of truth:** `@tailor-platform/app-shell` exports
> **Update process:** see "Keeping this file in sync" at the bottom

## Scope vs design-system.md

| This file (`components.md`)                                                                                       | `design-system.md`                                                                                |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Imports**, compound structure, hooks, canonical **composition** (`Card` + `Table`, `DataTable`, `Dialog`, etc.) | **Tokens**, theme imports, typography/spacing/radius/elevation **tables**, breakpoints **intent** |
| JSX examples tied to ERP patterns (`patterns/*`)                                                                  | **`astw:`** rules — only on AppShell `*ClassName` props; plain utilities on **your** elements     |
| Prop summaries + links to upstream `docs/components/*.md`                                                         | **Visual conformance**: no magic colors/px on custom markup, motion, dark mode                    |

**Rule of thumb:** “Which component / prop?” → **here.** “Which token / spacing step / elevation?” → **`design-system.md`** §§4–6.

This file intentionally does **not** duplicate full token catalogs. “Every heading here ≈ documented export cluster” maintenance lives in **Keeping this file in sync** — upstream npm remains authoritative for completeness.

Entries follow this shape:

```
**Import:** how to import it
**Purpose:** one sentence
**API:** key props or sub-components
**Example:** minimal JSX
**Used in patterns:** which patterns/<type>/<slug>.md cite this component
**Notes:** version-specific quirks (optional)
```

For the full upstream API of any component, follow the link to the published reference at the top of its section.

---

## Layout primitives

### `AppShell`

**Import:** `import { AppShell } from '@tailor-platform/app-shell'`
**Purpose:** Application root — wraps `<App />` with AppShell context, theme, and routing.
**API:** Compound — `AppShell.Root`, plus subcomponents wired through `AppShellProps`. Configured once in `App.tsx`.
**Example:** see `project-setup.md`.
**Used in patterns:** all (root container).

### `Layout`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/layout.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/layout.md)

**Import:** `import { Layout } from '@tailor-platform/app-shell'`
**Purpose:** Standard page container with header + 1–N column body. The most-used component — every page wraps content in `<Layout>`.
**API:** `Layout` (root) + `Layout.Column` + `Layout.Header`. `LayoutProps`: `fill` (boolean), `columns` (number, default auto-detected from children), `gap`, `title`, `actions`, `className`, `style`.

**`fill`** — stretches the layout to the available height and bounds the column row so children can scroll internally instead of growing the page. Use on table-first pages (`<Layout fill>` + `DataTable`): the title, table toolbar, sticky column headers, and pagination footer stay pinned while only the rows scroll — see **`patterns/list-dense-scan.md`**. Omit on pages that should flow and scroll naturally (forms, dashboards).

**Column-count → width rules** (column count is auto-detected from `Layout.Column` children):

| Columns | Breakpoint | Widths                         | Below breakpoint |
| ------- | ---------- | ------------------------------ | ---------------- |
| 1       | always     | full                           | n/a              |
| 2       | ≥ 1024px   | flex + 280px                   | stacks           |
| 3       | ≥ 1280px   | 320px + flex + 280px           | stacks           |
| 4+      | ≥ 1280px   | equal share — `repeat(N, 1fr)` | stacks           |

Desktop breakpoints and desktop-first rationale: **`design-system.md`** §4 Breakpoints. This table is **`Layout` column mechanics only**.

**`Layout.Header`** — direct child of `<Layout>`, above any `<Layout.Column>`. Only the first is rendered if multiple are passed.

| Prop       | Type                | Description                                      |
| ---------- | ------------------- | ------------------------------------------------ |
| `title`    | `string`            | Page title — `<h1>` on the left                  |
| `actions`  | `React.ReactNode[]` | Buttons on the right                             |
| `children` | `React.ReactNode`   | Full-width row below title — typical use is tabs |

**`Layout.Column`** — direct child, accepts `area` (`"left" | "main" | "right"`) for advanced placement override. If any column declares `area`, all columns switch to area-based widths (`left`=320, `main`=flex, `right`=280) and render in source order.

**Example — list page header with tabs:**

```tsx
import { Button, Layout, Tabs } from "@tailor-platform/app-shell";

<Layout>
  <Layout.Header title="Purchase orders" actions={[<Button key="create">Create</Button>]}>
    <Tabs.Root value={bucket} onValueChange={setBucket}>
      <Tabs.List>
        <Tabs.Trigger value="all">All</Tabs.Trigger>
        <Tabs.Trigger value="open">Open</Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  </Layout.Header>
  <Layout.Column>{/* table — see patterns/list/dense-scan.md */}</Layout.Column>
</Layout>;
```

**Example — detail page, 2-column with area mode:**

```tsx
<Layout>
  <Layout.Header title={order.number} actions={[<Button>Edit</Button>]} />
  <Layout.Column area="main">
    <DescriptionCard ... />
  </Layout.Column>
  <Layout.Column area="right">
    <ActionPanel ... />
    <ActivityCard ... />
  </Layout.Column>
</Layout>
```

**Notes:** Children that aren't `Layout.Header` or `Layout.Column` are filtered out. Column gap overrides (`<Layout className="astw:gap-6" />`) → **`design-system.md`** §5 (`astw:` rules).

**Used in patterns:** every page pattern (`list/*`, `detail/*`, `form/*`).

### `SidebarLayout`

**Import:** `import { SidebarLayout } from '@tailor-platform/app-shell'`
**Purpose:** Top-level layout that mounts the sidebar and renders the page outlet.
**API:** `SidebarLayoutProps` — `sidebar`, `header`, and `children` are full-region slots (each defaults to a built-in). `sidebar` defaults to `SidebarLayout.DefaultSidebar`; `header` defaults to `SidebarLayout.DefaultHeader`. Used in `App.tsx`.
**Used in patterns:** consumed by AppShell init, not directly by page patterns. See `project-setup.md`.

### `SidebarLayout.DefaultHeader` (`DefaultHeader`)

**Import:** `import { SidebarLayout } from '@tailor-platform/app-shell'` → `SidebarLayout.DefaultHeader` (also top-level `DefaultHeader`)
**Purpose:** The built-in top bar (trigger + breadcrumb, plus an `actions` cluster). Drop into `SidebarLayout`'s `header` slot to extend the header without rebuilding it.
**API:** `actions?: ReactNode | ReactNode[]` — the right-hand cluster (opinionated flex row). **Defaults to `[<AppearanceSwitcher />]`, and passing `actions` REPLACES the switcher** — include `<AppearanceSwitcher />` in the array to keep it. `actions={[]}` = empty right side.
**Used in patterns:** project-level header customization (notification bell, user menu). See `project-setup.md`.

### `SidebarLayout.DefaultSidebar` (`DefaultSidebar`), `SidebarGroup`, `SidebarItem`, `SidebarSeparator`

**Import:** `import { SidebarLayout, SidebarGroup, SidebarItem, SidebarSeparator } from '@tailor-platform/app-shell'` → `SidebarLayout.DefaultSidebar` (also top-level `DefaultSidebar`)
**Purpose:** Sidebar composition. `DefaultSidebar` auto-resolves nav items from `appShellPageProps.meta` on each page; the others let you customize manually.
**Used in patterns:** sidebar is a project-level concern. See `project-setup.md`.

### `AppearanceSwitcher`

**Import:** `import { AppearanceSwitcher } from '@tailor-platform/app-shell'`
**Purpose:** Palette-icon dropdown for Light/Dark/System color mode. The default `SidebarLayout.DefaultHeader` action; also usable standalone (e.g. a sidebar footer). Include it in `DefaultHeader`'s `actions` array when customizing the header to keep it visible.
**API:** No props — reads/writes theme via `useTheme`.
**Used in patterns:** project-level. See `project-setup.md`.

### `CommandPalette`

**Import:** `import { CommandPalette } from '@tailor-platform/app-shell'`
**Purpose:** Cmd/Ctrl-K command palette. Auto-discovers searchable resources via `defineResource`.
**API:** Renderless — drop into the layout once.
**Used in patterns:** project-level. Useful for any app with >10 routes.

---

## Interaction surfaces

### `Button`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/button.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/button.md)

**Import:** `import { Button } from '@tailor-platform/app-shell'`
**Purpose:** All buttons in the app — including polymorphic rendering via the `render` prop.
**API:** `ButtonProps` extends native `<button>` plus `variant` (`default | destructive | outline | secondary | ghost | link`), `size` (`default | sm | lg | icon | xs`), `render` (polymorphic — pass `<Link>` or another element to render-as).
**Example:**

```tsx
import { Button, Link } from '@tailor-platform/app-shell';

<Button render={<Link to="create" />}>Create</Button>
<Button variant="destructive" onClick={handleDelete}>Delete</Button>
```

**Used in patterns:** every pattern.

### `Link`

**Import:** `import { Link } from '@tailor-platform/app-shell'`
**Purpose:** Router-aware anchor. Re-exported from `react-router` so the rest of the app stays on the AppShell barrel.
**API:** `to`, `replace`, `state`, etc. — same as `react-router`.
**Used in patterns:** all (navigation).

### `Dialog`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/dialog.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/dialog.md)

**Import:** `import { Dialog } from '@tailor-platform/app-shell'`
**Purpose:** Modal dialog for confirmations, ≤5-field forms, blocking workflows.
**API:** Compound — `Dialog.Root`, `Dialog.Trigger`, `Dialog.Content`, `Dialog.Header`, `Dialog.Title`, `Dialog.Description`, `Dialog.Footer`, `Dialog.Close`. Controllable via `open` + `onOpenChange`.
**Example:**

```tsx
<Dialog.Root>
  <Dialog.Trigger render={<Button variant="destructive" />}>Delete</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Delete order #1234?</Dialog.Title>
      <Dialog.Description>This cannot be undone.</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
      <Button variant="destructive" onClick={onDelete}>
        Delete
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

**Used in patterns:** `form/modal`, `interaction/confirm`.

### `Sheet`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/sheet.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/sheet.md)

**Import:** `import { Sheet } from '@tailor-platform/app-shell'`
**Purpose:** Slide-in panel from any edge. Use for filters, side-work without losing context.
**API:** Compound — `Sheet.Root` (with `side: 'left' | 'right' | 'top' | 'bottom'`), `Sheet.Trigger`, `Sheet.Content`, `Sheet.Header`, `Sheet.Title`, `Sheet.Description`, `Sheet.Footer`, `Sheet.Close`.
**Example:**

```tsx
<Sheet.Root side="right">
  <Sheet.Trigger render={<Button variant="outline" />}>Filters</Sheet.Trigger>
  <Sheet.Content>
    <Sheet.Header>
      <Sheet.Title>Filter orders</Sheet.Title>
    </Sheet.Header>
    {/* filter inputs */}
    <Sheet.Footer>
      <Sheet.Close render={<Button variant="outline" />}>Clear</Sheet.Close>
      <Button>Apply</Button>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
```

**Used in patterns:** `list/*` (filter sheet variant).

**Notes:** Size the panel with **`contentClassName`** (often `astw:*` utilities). Rules → **`design-system.md`** §5.

### `Menu`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/menu.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/menu.md)

**Import:** `import { Menu } from '@tailor-platform/app-shell'`
**Purpose:** Dropdown menu — row actions, overflow actions, grouped commands.
**API:** Compound — `Menu.Root`, `Menu.Trigger`, `Menu.Content`, `Menu.Item`, `Menu.Separator`, `Menu.Group`, `Menu.GroupLabel`. Supports checkbox/radio items and nested sub-menus.
**Example:**

```tsx
<Menu.Root>
  <Menu.Trigger>
    <Button variant="ghost" size="icon">
      <EllipsisVertical />
    </Button>
  </Menu.Trigger>
  <Menu.Content>
    <Menu.Item onSelect={() => handleAssign(id)}>Assign</Menu.Item>
    <Menu.Item onSelect={() => handleDuplicate(id)}>Duplicate</Menu.Item>
    <Menu.Separator />
    <Menu.Item onSelect={() => handleDelete(id)}>Delete</Menu.Item>
  </Menu.Content>
</Menu.Root>
```

**Used in patterns:** `list/*` (row actions), `detail/*` (overflow actions).

**Notes:** **`list-dense-scan`** uses whole-row / primary-column navigation — keep row `Menu` items **non-navigation** (Assign, Duplicate, Delete). Avoid redundant **View**/**Open**. Detail overflows may include navigation only when not duplicating hero content.

### `Tooltip`

**Import:** `import { Tooltip } from '@tailor-platform/app-shell'`
**Purpose:** Contextual hint on hover/focus. Use sparingly — for icon-only buttons or constrained labels.
**API:** Compound — `Tooltip.Root`, `Tooltip.Trigger`, `Tooltip.Content`.
**Used in patterns:** any pattern with icon-only buttons (must have `aria-label` AND a tooltip).

---

## Display

### `Badge`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/badge.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/badge.md)

**Import:** `import { Badge } from '@tailor-platform/app-shell'`
**Purpose:** Status labels and small categorical chips.
**API:** `BadgeProps` — `variant`: `default | success | warning | neutral | error | destructive`. Plus `badgeVariants` CVA for custom-styled siblings.
**Example:**

```tsx
<Badge variant="success">Active</Badge>
```

**Used in patterns:** `list/*` (status column), `detail/*` (header status).

### `Table`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/table.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/table.md)

**Import:** `import { Table } from '@tailor-platform/app-shell'`
**Purpose:** Semantic data table with scrollable container.
**API:** Compound — `Table.Root`, `Table.Header`, `Table.Body`, `Table.Footer`, `Table.Row`, `Table.Head`, `Table.Cell`, `Table.Caption`. `Table.Root` accepts `containerClassName` for the outer wrapper, `className` for the inner `<table>`.
**Example:**

```tsx
<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>Order</Table.Head>
      <Table.Head>Status</Table.Head>
      <Table.Head className="astw:text-right">Total</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {orders.map((o) => (
      <Table.Row key={o.id}>
        <Table.Cell>{o.number}</Table.Cell>
        <Table.Cell>
          <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
        </Table.Cell>
        <Table.Cell className="astw:text-right">{formatMoney(o.total)}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table.Root>
```

**Used in patterns:** `list-dense-scan` hand-built subsets / static tables (`DataTable` is preferred for wired lists).

**Notes:**

- **Inside a card?** Pass `containerClassName="astw:px-6"` on `Table.Root` for the horizontal inset, and either drop `Card.Content` (bare list form) or pass `Card.Content className="astw:px-0"` (header+content form). Skipping the `containerClassName` lands the first column flush against the card edge. See the `Card` entry for the two canonical forms and a DON'T example. Dense cell typography (**`text-body-sm`**, **`text-mono`**) → **`design-system.md`** §4 Typography.
- **Whole row is clickable.** Use `<Table.Row onClick={() => navigate(detailPath)} className="astw:cursor-pointer">`. For keyboard and screen-reader users, also wrap the primary identifier cell content in `<Link>` (so the row is reachable via Tab; `Table.Row` is a `<tr>` and cannot itself be a Link — wrapping a `<tr>` in `<a>` is invalid HTML). **No per-row "View" / "Open" / "→" buttons.** Per-row `Menu` (overflow `…`) is the only allowed per-row action surface and is reserved for non-navigation actions like Archive, Duplicate.

### `DataTable`

> Full API: [https://github.com/tailor-platform/app-shell/blob/main/docs/components/data-table.md](https://github.com/tailor-platform/app-shell/blob/main/docs/components/data-table.md)

**Import:** compound namespace + helpers from `'@tailor-platform/app-shell'`, e.g. `DataTable`, `useDataTable`, `useCollectionVariables`, `createColumnHelper`, and types such as `Column`, `UseDataTableReturn`.

**Purpose:** Production list screens over GraphQL **connections**. Owns toolbar filter chips (**`DataTable.Filters`** from column `filter` configs), header sort, **`DataTable.Pagination`** (cursor-first; First/Last when `total` is provided), loading skeleton/error row, **`onClickRow`**, **`rowActions`** (kebab column), **`onSelectionChange`** (checkbox column).

**Primitives:** Builds on low-level **`Table`**; do not reinvent pagination/filters manually unless the dataset is trivial.

**Shape:**

```tsx
const { variables, control } = useCollectionVariables({
  params: { pageSize: 20 },
  // tableMetadata: tableMetadata.po, // typed vars when generated
});

const table = useDataTable({
  columns,
  data: fetching ? undefined : mappedFromQuery,
  loading: fetching,
  control,
  onClickRow: (row) => navigate(detailHref(row)),
  // onSelectionChange, rowActions, sort: …
});

<DataTable.Root value={table}>
  <DataTable.Toolbar>
    <DataTable.Filters />
  </DataTable.Toolbar>
  <DataTable.Table />
  <DataTable.Footer>
    <DataTable.Pagination pageSizeOptions={[10, 20, 50]} />
  </DataTable.Footer>
</DataTable.Root>;
```

**Metadata path:** Prefer `createColumnHelper` + `inferColumns(tableMetadata.order)` (`@tailor-platform/app-shell-sdk-plugin` codegen) when available so enum/datetime/string filters bind to the right editors.

**Bucket tabs / segmented UX:** AppShell defines **toolbar chips**, not lifecycle tabs. When design places **`Tabs`** (All / Draft / …) inside the card, compose them **above** `DataTable.Root` and synchronize tab-driven bucket state with **`useCollectionVariables`** (`variables.query` / filters)—see **`patterns/list/dense-scan.md`**.

**Used in patterns:** `list-dense-scan` (preferred for live collections).

### `Card`

**Import:** `import { Card } from '@tailor-platform/app-shell'`
**Purpose:** Generic container with header, content, optional action.
**API:** Compound — `Card.Root`, `Card.Header` (props: `title`, `description`, plus children for actions), `Card.Content`.
**Example:**

```tsx
<Card.Root>
  <Card.Header title="Recent orders" description="Last 7 days">
    <Button size="sm" variant="outline">
      View all
    </Button>
  </Card.Header>
  <Card.Content>{/* anything */}</Card.Content>
</Card.Root>
```

**Used in patterns:** `detail/*` (related-data sections), `form/wizard` (step container).

**Notes:**

- **Tables inside a card need TWO co-requisite geometry changes** (token-backed spacing rationale → **`design-system.md`** §4 Spacing): (a) Card stops imposing horizontal padding — drop `Card.Content` for the bare form, or pass `Card.Content className="astw:px-0"` for the header+content form. (b) `Table.Root` provides the inset itself via `containerClassName="astw:px-6"`. Skipping (b) lands the first column flush against the card edge — `Table.Cell`'s intrinsic `astw:first:pl-6` does NOT render reliably in this composition.

**Bare table-in-card (list pages, no card-level title):**

```tsx
<Card.Root>
  <Table.Root containerClassName="astw:px-6">{/* … */}</Table.Root>
</Card.Root>
```

**Header + table (detail-page sections like "Line items"):**

```tsx
<Card.Root>
  <Card.Header title="Line items" />
  <Card.Content className="astw:px-0">
    <Table.Root containerClassName="astw:px-6">{/* … */}</Table.Root>
  </Card.Content>
</Card.Root>
```

**DON'T — first column lands flush against the card edge:**

```tsx
<Card.Root>
  <Card.Content className="astw:px-0">
    <Table.Root>{/* missing containerClassName="astw:px-6" */}</Table.Root>
  </Card.Content>
</Card.Root>
```

### `MetricCard`

**Import:** `import { MetricCard } from '@tailor-platform/app-shell'`
**Purpose:** KPI tile for dashboards or hero metric strip.
**API:** `MetricCardProps` — `title`, `value`, `trend: { direction, value }`, `description`, `icon`.
**Example:**

```tsx
<MetricCard
  title="Net total"
  value="$1,500"
  trend={{ direction: "up", value: "+5%" }}
  description="vs last month"
  icon={<DollarSign />}
/>
```

**Used in patterns:** KPI tiles, dashboards, **`detail/*`** metric strips where specs call for them.

### `DocumentProgressCard`

**Import:** `import { DocumentProgressCard } from '@tailor-platform/app-shell'`
**Purpose:** Generic document lifecycle/fulfilment state — optional percentage, stacked progress bar, status legend; arbitrary `segments`.
**API:** `DocumentProgressCardProps` — `segments` (`{ label, value, color? }[]`), `title?`, `percent?`, `legend?` (defaults to `segments`), `total?` (bar denominator; larger than the sum leaves an empty track), `className?`. View-only — `percent` is explicit.
**Example:**

```tsx
<DocumentProgressCard
  title="Shipment status"
  percent={60}
  segments={[
    { label: "Shipped", value: 30, color: "green" },
    { label: "Returned", value: 3, color: "red" },
    { label: "Pending", value: 17, color: "neutral" },
  ]}
/>
```

**Used in patterns:** **`detail/*`** right-rail cards for arbitrary status breakdowns (shipped/cancelled/pending, PO received/returned/yet-to-receive, etc.). For the purchase-order fulfilment recipe (derived %, net-received/returned bar split, legend override), see `docs/components/document-progress-card.md`.

### `Avatar`

**Import:** `import { Avatar } from '@tailor-platform/app-shell'`
**Purpose:** User/entity avatar with fallback initials.
**API:** Compound — `Avatar.Root`, `Avatar.Image`, `Avatar.Fallback`. Plus `avatarVariants` CVA.
**Used in patterns:** `detail/*` (assignee/owner, comments threads).

### `DescriptionCard`

**Import:** `import { DescriptionCard } from '@tailor-platform/app-shell'`
**Purpose:** Key/value display for a single record's metadata.
**API:** `DescriptionCardProps` — `data`, `title`, `fields` (array of `{ key, label, render? }`), `columns` (1 | 2), `headerAction`.
**Example:**

```tsx
<DescriptionCard
  title="Order details"
  data={order}
  columns={2}
  fields={[
    { key: "number", label: "Order number" },
    { key: "status", label: "Status", render: (v) => <Badge>{v}</Badge> },
    { key: "createdAt", label: "Created", render: formatDate },
  ]}
/>
```

**Used in patterns:** `detail/hero-with-actions` (body sections).

### `ActionPanel`

**Import:** `import { ActionPanel } from '@tailor-platform/app-shell'`
**Purpose:** Right-rail panel listing workflow actions for a detail page (approve, reject, archive, etc.).
**API:** `ActionPanelProps` — `title`, `actions` (array of `{ label, onSelect, variant?, disabled?, hidden? }`), `className`.
**Example:**

```tsx
<ActionPanel
  title="Actions"
  actions={[
    { label: "Approve", variant: "default", onSelect: handleApprove },
    { label: "Reject", variant: "destructive", onSelect: handleReject, disabled: !canReject },
  ]}
/>
```

**Used in patterns:** `detail/hero-with-actions`.

**Notes:**

- **Workflow only — never navigation.** `ActionPanel` lists state-change actions on the current record (Approve, Reject, Archive, Generate Variants, Manage Categories, Duplicate). It must NEVER contain back-navigation, breadcrumb-replacement, or "Go to X list" / "Back to X" links — those live in `Layout.Header`'s breadcrumb. If an entry would just navigate the user somewhere else, it does not belong here.

### `ActivityCard`

**Import:** `import { ActivityCard } from '@tailor-platform/app-shell'`
**Purpose:** Timeline of events on a record (audit log, status changes, comments).
**API:** Compound — `ActivityCard.Root`, `ActivityCard.Items` (generic over item type), plus `ActivityCardProps`, `ActivityCardItem`, `ActivityCardItemProps`. Items render with timestamp + actor + description.
**Used in patterns:** `detail/hero-with-actions` (right column or bottom section).

---

## Forms

### `Form`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/form.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/form.md)

**Import:** `import { Form } from '@tailor-platform/app-shell'`
**Purpose:** Form root wired to react-hook-form. Use with `Field`, `Fieldset`, and Zod for validation.
**API:** `FormProps` — `errors`, `actionsRef`, `validationMode`, `noValidate`, plus a namespace exposing form-related sub-helpers. Generic over `FormValues`.
**Example:** see `form/single-page.md`.
**Used in patterns:** all `form/*`.

### `Field`

**Import:** `import { Field } from '@tailor-platform/app-shell'`
**Purpose:** Single form field with label + control + error message wiring.
**API:** Compound. Wraps any input control (`Input`, `Select`, `Combobox`, etc.) and binds it to react-hook-form via `name`.
**Used in patterns:** all `form/*`.

### `Fieldset`

**Import:** `import { Fieldset } from '@tailor-platform/app-shell'`
**Purpose:** Group related fields under a legend (subtle section header).
**API:** Compound — `Fieldset.Root`, `Fieldset.Legend`.
**Used in patterns:** `form/sectioned`, `form/wizard`.

### `Input`

**Import:** `import { Input } from '@tailor-platform/app-shell'`
**Purpose:** Text input. Maps to spec field types: `string`, `email`, `number`, `password`, `tel`, `url`.
**API:** `InputProps` — extends native `<input>` props.
**Used in patterns:** all `form/*`.

### `Select`

**Import:** `import { Select } from '@tailor-platform/app-shell'`
**Purpose:** Dropdown for fixed enumerations.
**API:** Compound. Sync version (small option lists). For async/typeahead, see `Combobox` and `Autocomplete`. Type: `SelectAsyncFetcher<T>` for the async variant.
**Used in patterns:** all `form/*` (enum fields).

### `Combobox`

**Import:** `import { Combobox } from '@tailor-platform/app-shell'`
**Purpose:** Single-select with search, supports async data fetching.
**API:** Compound. `ComboboxAsyncFetcher<T>` for paginated/queried option sources (e.g. lookups).
**Used in patterns:** `form/*` (foreign-key lookups).

### `Autocomplete`

**Import:** `import { Autocomplete } from '@tailor-platform/app-shell'`
**Purpose:** Free-text input with completion suggestions (multi-select capable).
**API:** Compound. `AutocompleteAsyncFetcher<T>` for async suggestion sources. `ItemGroup<T>` for grouped suggestions.
**Used in patterns:** `form/*` (tags, free-text + suggested values).

---

## Auth & access

### `AuthProvider`

**Import:** `import { AuthProvider } from '@tailor-platform/app-shell'`
**Purpose:** Wraps the app to expose auth state via `useAuth`. Mount in `App.tsx`.
**API:** `AuthProviderProps` — `client` (from `createAuthClient`), `autoLogin`, `guardComponent`.
**Used in patterns:** project-level. See `project-setup.md`.

### `createAuthClient`

**Import:** `import { createAuthClient, type EnhancedAuthClient } from '@tailor-platform/app-shell'`
**Purpose:** Factory for the auth client, configured with platform URL + client ID.
**API:** `createAuthClient(config: AuthClientConfig): EnhancedAuthClient`.
**Used in patterns:** project-level.

### `useAuth`, `useAuthSuspense`

**Import:** `import { useAuth, useAuthSuspense } from '@tailor-platform/app-shell'`
**Purpose:** Read auth state in components. `useAuth` returns nullable state; `useAuthSuspense` suspends until ready (use inside route loaders / suspense boundaries).
**API:** Returns `AuthState` (user, status, login/logout actions).
**Used in patterns:** any pattern needing user identity.

### `AuthClient` (type)

**Import:** `import { type AuthClient } from '@tailor-platform/app-shell'`
**Purpose:** Public auth client interface (re-exported from `@tailor-platform/auth-public-client`).

### `WithGuard`

**Import:** `import { WithGuard } from '@tailor-platform/app-shell'`
**Purpose:** Permission gate around a UI subtree. Hides, denies, or shows a loading state based on the guard result.
**API:** `WithGuardProps` — `guard: Guard`, `fallback`, `mode: 'hidden' | 'deny'`.
**Used in patterns:** `detail/*` (action gating), `list/*` (row-level action visibility).

### Guard helpers — `pass`, `hidden`, `redirectTo`

**Import:** `import { pass, hidden, redirectTo } from '@tailor-platform/app-shell'`
**Purpose:** Return values for guard functions. `pass()` allows, `hidden()` hides, `redirectTo(path)` navigates.
**Used in patterns:** any `Guard` definition.

### `Guard`, `GuardContext`, `GuardResult` (types)

Types for authoring guard functions used by `WithGuard` and `appShellPageProps.guards`.

---

## Routing helpers

### `useNavigate`, `useParams`, `useSearchParams`, `useLocation`, `useRouteError`

**Import:** `import { useNavigate, useParams, useSearchParams, useLocation, useRouteError } from '@tailor-platform/app-shell'`
**Purpose:** Re-exported from `react-router`. Use the AppShell barrel — never import from `react-router` directly.
**Used in patterns:** all (navigation, route params, query state).

### `createTypedPaths`

**Import:** `import { createTypedPaths } from '@tailor-platform/app-shell'`
**Purpose:** Type-safe path builder generated from the route tree.
**API:** `createTypedPaths<TRoutes>()` returns a `paths.for(...)` helper.
**Used in patterns:** project-level. See `project-setup.md`.

### `RouteParams`, `PageComponent`, `PageMeta`, `AppShellPageProps`, `AppShellRegister`, `ContextData` (types)

Types for declaring page props (`appShellPageProps = { meta, guards, loader }`), reading typed route params, and registering route types globally. See `project-setup.md` for usage.

---

## Hooks

### `useToast`

**Import:** `import { useToast } from '@tailor-platform/app-shell'`
**Purpose:** Imperative toast feedback after mutations.
**API:** Returns the `sonner` `toast` function — `toast.success(message)`, `toast.error(message)`, `toast.loading(message)`, plus options for duration, action button, etc.
**Used in patterns:** `interaction/toast`. Called from any mutation handler.

### `useTheme`

**Import:** `import { useTheme } from '@tailor-platform/app-shell'`
**Purpose:** Read/write the active theme (light/dark/system).
**API:** Returns `ThemeProviderState`.
**Used in patterns:** any theme-toggle UI.

### `useAppShell`, `useAppShellConfig`, `useAppShellData`

**Import:** `import { useAppShell, useAppShellConfig, useAppShellData } from '@tailor-platform/app-shell'`
**Purpose:** Access AppShell context — the resolved `AppShellRegister` data, config, and runtime state.
**Used in patterns:** advanced — when a component needs to read app-wide config or registered resources.

### `usePageMeta`, `useOverrideBreadcrumb`

**Import:** `import { usePageMeta, useOverrideBreadcrumb } from '@tailor-platform/app-shell'`
**Purpose:** Read the current page's `meta` (resolved from `appShellPageProps.meta`) or override the breadcrumb title at runtime (e.g. show the order number once data loads).
**Used in patterns:** `detail/*` (dynamic breadcrumbs from loaded entity).

---

## i18n & resource definitions

### `defineI18nLabels`

**Import:** `import { defineI18nLabels } from '@tailor-platform/app-shell'`
**Purpose:** Declare i18n labels in a typed way. Returns `I18nLabels<Def, L>`.
**Used in patterns:** project-level for multi-locale apps.

### `defineModule`, `defineResource`

**Import:** `import { defineModule, defineResource } from '@tailor-platform/app-shell'`
**Purpose:** Register an app module / a resource (entity with CRUD pages). Wires routes, sidebar, and command palette automatically.
**API:** `defineModule(props: DefineModuleProps): Module`, `defineResource(props: DefineResourceProps): Resource`.
**Used in patterns:** project-level. See `project-setup.md`.

### `MappedItem`, `Module`, `Resource`, `ResourceComponentProps` (types)

Types returned/consumed by the define-\* helpers above.

---

## Style helpers

### `avatarVariants`, `badgeVariants`, `buttonVariants`

**Import:** `import { avatarVariants, badgeVariants, buttonVariants } from '@tailor-platform/app-shell'`
**Purpose:** CVA (`class-variance-authority`) variant functions backing `Avatar`, `Badge`, `Button`. Use when authoring a custom component that should match an AppShell variant inline.
**Used in patterns:** custom-component fallbacks (see `design-system.md` § "When AppShell doesn't have a component you need").

### `ErrorBoundaryComponent` (type)

**Import:** `import { type ErrorBoundaryComponent } from '@tailor-platform/app-shell'`
**Purpose:** Type for an error boundary component slot in routing.

---

## Keeping this file in sync

When `@tailor-platform/app-shell` publishes a new version:

1. Bump `package.json` in the scaffold templates (`templates/scaffold/app/*/frontend/`) to the new version.
2. Update the AppShell version header at the top of this file.
3. Diff exports between old and new:

```bash
 # Run in a scratch dir:
 mkdir -p /tmp/appshell-diff && cd /tmp/appshell-diff
 npm init -y >/dev/null && npm install --no-save --silent @tailor-platform/app-shell@<NEW_VERSION>
 node -e "console.log(Object.keys(require('@tailor-platform/app-shell')).sort().join('\n'))" \
   > new-exports.txt
 # Compare against the headings in this file:
 grep -E '^### ' \
   packages/erp-kit/skills/erp-kit-app-6-impl-frontend/references/components.md \
   | sed 's/^### //; s/ ,.*//' | sort > current-headings.txt
 diff current-headings.txt new-exports.txt
```

4. For each new export — add a section using the fixed shape above.
5. For each removed export — delete its section, then grep `references/patterns/` for the component name and update or retire the patterns that cited it.
6. For each changed export (new prop, behavior change) — update the section and add a one-line note under "Notes:".
7. Run `pnpm erp-kit update skills` to regenerate `.agents/skills/`.

The pattern-citation review check (`erp-kit-app-7-impl-review` → `design-parity.md`) catches drift indirectly: if a pattern lists a component that no longer exists, generated pages will fail the review.
