# AppShell Components

> **AppShell version:** `1.7.0` (matches `packages/erp-kit/templates/scaffold/app/*/frontend/package.json` pinned `@tailor-platform/app-shell` semver)
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
        <Tabs.Tab value="all">All</Tabs.Tab>
        <Tabs.Tab value="open">Open</Tabs.Tab>
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

### `Grid`

**Import:** `import { Grid } from '@tailor-platform/app-shell'`
**Purpose:** Presentational CSS-Grid container for laying tiles/cards into equal or custom columns with responsive reflow — the canonical wrapper for **metric / KPI strips** and card galleries. Purely layout; makes no data assumptions.
**API:** `GridProps` — `columns` (number | CSS track string like `"280px 1fr"` | responsive object `{ initial, sm, md, lg, xl }`), `gap` (spacing step, default `3`) plus `gapX` / `gapY`, `minChildWidth` (auto-fit: as many ≥Npx columns as fit, no breakpoints needed), `rows`, `flow`, `align`, `justify`. Sub-component **`Grid.Item`** for spanning/placement — `colSpan`, `rowSpan`, `colStart`, `colEnd` (all responsive). Root carries `data-slot="grid"`.
**Example — responsive KPI grid:**

```tsx
import { Grid, MetricCard } from "@tailor-platform/app-shell";

<Grid columns={{ initial: 1, md: 2, xl: 4 }} gap={4}>
  <MetricCard title="Net total" value="$1,500" trend={{ direction: "up", value: "+5%" }} />
  <MetricCard title="Open orders" value="42" />
  <MetricCard title="Overdue" value="7" />
  <MetricCard title="Suppliers" value="18" />
</Grid>;
```

**Used in patterns:** metric / KPI strips on `detail/*` and dashboards; any equal-column card layout.

**Notes:** Metric tiles and KPI cards **always** go in a `Grid` — never stacked one-per-row or in a single column. Use a responsive `columns` object (e.g. `{ initial: 1, md: 2, xl: 4 }`) so tiles reflow at smaller widths; reach for `minChildWidth` when the tile count is dynamic.

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

### `NavLink`

**Import:** `import { NavLink } from '@tailor-platform/app-shell'`
**Purpose:** `Link` that knows when it is active — for nav menus and tab bars.
**API:** `to`, plus `className` / `style` / `children` as render functions receiving `{ isActive, isPending }`.
**Used in patterns:** navigation shells.

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

**Notes:** Size the panel with `Sheet.Content`'s **`size`** prop (`"sm" | "md" | "lg" | "xl" | "full"`, default `"sm"`) — not a width utility. `astw:` rules → **`design-system.md`** §5.

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

### `Tabs`

**Import:** `import { Tabs } from '@tailor-platform/app-shell'`
**Purpose:** In-page tab navigation — split one record's sections (Overview / Line items / Activity) or bucket a list (All / Open / …) into switchable panels. Presentational; owns only the active-tab state.
**API:** Compound — `Tabs.Root` (`variant`: `default | line | capsule`; controlled `value` + `onValueChange`, or uncontrolled `defaultValue`), `Tabs.List`, `Tabs.Tab` (`value`), `Tabs.Panel` (`value`). Note: the sub-component is **`Tabs.Tab`**, not `Tabs.Trigger`.
**Example:**

```tsx
<Tabs.Root defaultValue="overview" variant="line">
  <Tabs.List>
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    <Tabs.Tab value="items">Line items</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">{/* … */}</Tabs.Panel>
  <Tabs.Panel value="items">{/* … */}</Tabs.Panel>
</Tabs.Root>
```

**Used in patterns:** `list-dense-scan` (bucket tabs composed **above** `DataTable.Root`, synced to `useCollectionVariables` — see the `DataTable` "Bucket tabs" note), `detail/*` (sectioned record content).

**Notes:** For lists, AppShell's own filtering surface is **toolbar chips** (`DataTable.Filters`), not tabs — reach for `Tabs` only when the business genuinely thinks in a small set of named buckets. Don't render a `Tab` per enum value where a filter chip belongs.

---

## Display

### `Badge`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/badge.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/badge.md)

**Import:** `import { Badge } from '@tailor-platform/app-shell'`
**Purpose:** Status labels and small categorical chips.
**API:** `BadgeProps` — `variant` (15 total):

- **Filled** (high emphasis): `default` (primary), `success`, `warning`, `error`, `neutral`, `info`
- **Subtle** (low emphasis, tinted): `subtle-success`, `subtle-warning`, `subtle-error`, `subtle-info`
- **Outline** (renders a status dot — for row/list statuses): `outline-success`, `outline-warning`, `outline-error`, `outline-info`, `outline-neutral`

Plus `badgeVariants` CVA for custom-styled siblings.
**Example:**

```tsx
// Primary / lifecycle status — filled semantic variant
<Badge variant="success">Confirmed</Badge>
// Secondary status (delivery, billing) — outline with status dot
<Badge variant="outline-warning">Partially received</Badge>
// Tag / label — subtle
<Badge variant="subtle-info">New</Badge>
```

**Used in patterns:** `list/*` (status column → `outline-*`), `detail/*` (header status).

**Notes:** Encode status by **semantic color** with a primary/secondary split: a record's **primary/lifecycle status** uses a **filled** semantic variant (one per row / one in a detail header); **secondary statuses** (delivery, billing) use **`outline-*`** (status dot); tags use **`subtle-*`**. Reserve **`default`** (brand) for non-status emphasis. Full rule: **`design-system.md`** → Composition & emphasis rules.

### `Table`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/table.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/table.md)

**Import:** `import { Table } from '@tailor-platform/app-shell'`
**Purpose:** Semantic data table with scrollable container.
**API:** Compound — `Table.Root`, `Table.Header`, `Table.Body`, `Table.Footer`, `Table.Row`, `Table.Head`, `Table.Cell`, `Table.Caption`. `Table.Root` accepts `containerClassName` for the outer wrapper, `className` for the inner `<table>`. `Table.Head` and `Table.Cell` accept **`align`** (`"left" | "center" | "right"`, default `"left"`) — prefer this over ad-hoc `className="astw:text-right"` and pair the same alignment on the head and its column's cells (right for numeric/money, center for compact status/icon columns).
**Example:**

```tsx
<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>Order</Table.Head>
      <Table.Head>Status</Table.Head>
      <Table.Head align="right">Total</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {orders.map((o) => (
      <Table.Row key={o.id}>
        <Table.Cell>{o.number}</Table.Cell>
        <Table.Cell>
          <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
        </Table.Cell>
        <Table.Cell align="right">{formatMoney(o.total)}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table.Root>
```

**Used in patterns:** `list-dense-scan` hand-built subsets / static tables (`DataTable` is preferred for wired lists).

**Notes:**

- **Inside a card?** Pass `containerClassName="astw:px-6"` on `Table.Root` for the horizontal inset, and either drop `Card.Content` (bare list form) or pass `Card.Content className="astw:px-0"` (header+content form). Skipping the `containerClassName` lands the first column flush against the card edge. See the `Card` entry for the two canonical forms and a DON'T example. Dense cell typography (**`text-sm`**, **`tabular-nums`** for figures, **`font-mono`** for identifiers) → **`design-system.md`** §4 Typography.
- **Whole row is clickable.** Use `<Table.Row onClick={() => navigate(detailPath)} className="astw:cursor-pointer">`. For keyboard and screen-reader users, also wrap the primary identifier cell content in `<Link>` (so the row is reachable via Tab; `Table.Row` is a `<tr>` and cannot itself be a Link — wrapping a `<tr>` in `<a>` is invalid HTML). **No per-row "View" / "Open" / "→" buttons.** Per-row `Menu` (overflow `…`) is the only allowed per-row action surface and is reserved for non-navigation actions like Archive, Duplicate.

### `DataTable`

> Full API: [https://github.com/tailor-platform/app-shell/blob/main/docs/components/data-table.md](https://github.com/tailor-platform/app-shell/blob/main/docs/components/data-table.md)

**Import:** compound namespace + helpers from `'@tailor-platform/app-shell'`, e.g. `DataTable`, `useDataTable`, `useCollectionVariables`, `createColumnHelper`, and types such as `Column`, `UseDataTableReturn`.

**Purpose:** Production list screens over GraphQL **connections**. Owns toolbar filter chips (**`DataTable.Filters`** from column `filter` configs), header sort, **`DataTable.Pagination`** (cursor-first; First/Last when `total` is provided), loading skeleton/error row, **`onClickRow`**, **`rowActions`** (kebab column), **`onSelectionChange`** (checkbox column), **expandable rows** (**`rowExpansion`** — a chevron column plus a full-width detail panel per row; `render` with optional `canExpand` / `getLabel`, and `expandedIds` + `onChange` for controlled mode), **column pinning** (`pin: "left" | "right"`) and built-in **column settings** (`<DataTable.Toolbar columnSettings>` — user show/hide + reorder + pin, persisted per-user via **`tableId`**).

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
  tableId: "purchase-orders", // persist user column layout to localStorage
  onClickRow: (row) => navigate(detailHref(row)),
  // onSelectionChange, rowActions, sort: …
});

<DataTable.Root value={table}>
  <DataTable.Toolbar columnSettings>
    <DataTable.Filters />
  </DataTable.Toolbar>
  <DataTable.Table />
  <DataTable.Footer>
    <DataTable.Pagination pageSizeOptions={[10, 20, 50]} />
  </DataTable.Footer>
</DataTable.Root>;
```

**Row navigation:** whole row is clickable via **`onClickRow`** → `navigate(detailHref(row))`; wrap the primary identifier cell in `<Link>` for keyboard/SR access. Never add a per-row "View" / "Open" / "→" button. (A first-class row-interaction API is under design — see the row-interaction tracking issue.)

**Column pinning & settings:** set `pin: "left" | "right"` on a `Column` to freeze it during horizontal scroll — selection auto-pins left, row-actions auto-pins right (a `width` is optional but recommended for stable sizing). Pass **`columnSettings`** to **`DataTable.Toolbar`** to render the built-in "Columns" control (show/hide, reorder, re-pin) at the top-right; pass a stable, **unique** **`tableId`** to persist each user's layout to `localStorage` (a per-user preference — intentionally not in the URL like filters/sort).

**Column alignment:** each `Column` accepts **`align`** (`"left" | "right"`) applied to both header and body cell. Numeric `type` columns (`"number"`, `"money"`) default to `"right"` automatically so digits align on the decimal place — pass `align="left"` to opt out; everything else defaults to `"left"`.

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
**Example:** metric tiles are laid out in a `Grid` (never one-per-row):

```tsx
<Grid columns={{ initial: 1, md: 2, xl: 4 }} gap={4}>
  <MetricCard
    title="Net total"
    value="$1,500"
    trend={{ direction: "up", value: "+5%" }}
    description="vs last month"
    icon={<DollarSign />}
  />
  <MetricCard title="Open orders" value="42" />
  {/* …more tiles */}
</Grid>
```

**Used in patterns:** KPI tiles, dashboards, **`detail/*`** metric strips where specs call for them.

**Notes:** Always wrap metric tiles in **`Grid`** (see the `Grid` entry) — a column of single-width `MetricCard`s stacked one-per-row is an anti-pattern.

### `DocumentProgressCard`

**Import:** `import { DocumentProgressCard } from '@tailor-platform/app-shell'`
**Purpose:** Presentational card for a document's lifecycle / fulfilment state — an optional headline percentage, a stacked progress bar, and a status legend. Domain-agnostic and view-only: pass an arbitrary set of `segments` (e.g. shipped / returned / pending) plus an explicit `percent`; derive both in the consumer.
**API:** `DocumentProgressCardProps` — `segments` (required; array of `{ label, value, color }`), `percent?` (0–100, headline shown top-right), `title?`, `legend?` (defaults to `segments`; supply only when the legend should differ from the bar, e.g. overlapping buckets), `total?` (bar denominator; defaults to the sum of segment values — a larger value leaves an unfilled remainder), `className?`. Segment `color`: `indigo | pink | green | amber | red | blue | neutral`.
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

**Used in patterns:** `detail/*` — fulfilment / lifecycle summary cards (e.g. a purchase-order receipt progress) in the main column or right rail.

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

### `Alert`

**Import:** `import { Alert } from '@tailor-platform/app-shell'`
**Purpose:** Inline, in-page banner for a persistent status message — a form/record error, a warning, or a success/info notice attached to a section. (Transient notifications use `useToast`; blocking confirmations use `Dialog` — see `interaction/confirm`.)
**API:** Compound — `Alert.Root` (`variant`: `neutral | success | warning | error | info`, default `neutral`; a matching icon is rendered automatically; optional `action?: ReactNode`, `dismissible?: boolean`, `onDismiss?: () => void`), `Alert.Title`, `Alert.Description`.
**Example:**

```tsx
<Alert.Root variant="error">
  <Alert.Title>Couldn't load line items</Alert.Title>
  <Alert.Description>Check your connection and try again.</Alert.Description>
</Alert.Root>
```

**Used in patterns:** any data-backed screen's **error** state (inline error + retry) and record-level warnings — the error affordance the composition rules require (**`design-system.md`** → Composition & emphasis rules → States).

**Notes:** Encode severity by `variant` (semantic color), same discipline as `Badge` — don't use `error` for a routine notice. Pair a retry/next-step control via `action` rather than a separate stray button.

---

## Forms

> **Which form stack?** AppShell's `Form` / `Field` / `Fieldset` wrap Base UI primitives and are the
> default — they need no extra dependency. They own **accessibility wiring and visual state only**
> (`htmlFor`, `aria-describedby`, `data-invalid` / `data-dirty` / `data-touched`); they do **not** own
> your values. React Hook Form is **optional** and consumer-installed — reach for it only when a form
> genuinely needs cross-field validation, field arrays, or a Zod resolver. The two compose; they are
> not alternatives. `react-hook-form` stopped being a runtime dependency in 1.4.0; it is a dev-only
> dependency of the package today, used to test the RHF integration contracts — if you use it,
> install it in your own app.

### `Form`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/form.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/form.md)

**Import:** `import { Form } from '@tailor-platform/app-shell'`
**Purpose:** Form root that wraps Base UI's form primitive. Provides shared validation context for
child `Field.Root`s, consolidated error display, and server-error routing by field `name`.
**API:** `FormProps` — `onFormSubmit`, `onSubmit`, `errors`, `actionsRef`, `validationMode`,
`noValidate`, `id`. Generic over `FormValues`.
**Actions outside the form:** give the `Form` an `id` and point a detached submit button at it with
the native `form` attribute. This is how a page-header Save reaches a body form (1.13.0+):

```tsx
<Layout.Header
  title="Create product"
  actions={[<Button key="save" type="submit" form="product-form">Save</Button>]}
/>
<Form id="product-form" onFormSubmit={save}>…</Form>
```

**Submit:** use `onFormSubmit(values)` — it receives parsed form values and is the default. Use the
low-level `onSubmit` **only** when handing the native event to React Hook Form's `handleSubmit`.
**Never** hand-roll `<form onSubmit={e => new FormData(e.currentTarget)}>` — that skips validation
and error routing.
**Server errors:** pass `errors={{ fieldName: "message" }}`; they route to the matching
`Field.Error` and clear when the user edits that field.
**Example:** see `form/single-page.md`.
**Used in patterns:** all `form/*`.

### `Field`

**Import:** `import { Field } from '@tailor-platform/app-shell'`
**Purpose:** Single form field with label + control + error message wiring.
**API:** Compound — `Field.Root`, `Field.Label`, `Field.Control`, `Field.Description`, `Field.Error`,
`Field.Validity`. `Field.Root` establishes a context boundary; every Base UI-backed AppShell control
placed inside it inherits label association, `aria-describedby`, `disabled`, and invalid state
automatically.
**`Field.Control` is already a styled input** — write `<Field.Control />`, not
`<Field.Control render={<Input />} />`. `Input` and `Field.Control` share the same base classes, so
the `render` form just double-wraps. Reach for `Input` directly when you need a control outside a
`Field.Root`, or when the value is React-controlled.
**RHF interop (optional):** `Field.Root` accepts `isTouched`, `isDirty`, `invalid`, and `error`,
matching RHF's `fieldState` shape — so `<Field.Root {...fieldState}>` works with no adapter.
**Used in patterns:** all `form/*`.

### How values reach your submit handler

There are three separate mechanisms. Picking the wrong mental model is the most common
form mistake, so be explicit about which one a screen uses.

**1. `Form` + `Field.Root` → `onFormSubmit` (the default).** `onFormSubmit` does **not** read
`FormData`; it collects values from the `Field.Root`s registered inside the `Form`, keyed by each
field's `name`. Every AppShell control works this way once wrapped in a `Field.Root name="…"` —
including `Select`, `Combobox`, and `Autocomplete`. They need **no `name` of their own and no React
state**:

```tsx
<Form onFormSubmit={(values) => save(values)}>
  <Field.Root name="category">
    <Field.Label>Category</Field.Label>
    <Select items={CATEGORIES} placeholder="Select category" />
  </Field.Root>
</Form>
```

**2. Native submission** — a plain `<form>`, `new FormData(form)`, or a server action. This reads the
DOM, so each control needs its own `name`. `Select`, `Combobox`, and `Autocomplete` gained `name`
(plus `form`, `required`, `inputRef`) in 1.13.0; before that they contributed nothing to a native
payload.

**3. React Hook Form** — optional, consumer-installed. RHF owns the values; drive the control with
`value` / `onValueChange` from a `Controller` and spread `fieldState` onto `Field.Root`. Warranted
for cross-field validation, field arrays, or a Zod resolver — not for ordinary CRUD forms.

#### Object items

Under mechanism 1, a non-string item is serialised into the submitted value:

| Item shape                             | Value in `onFormSubmit`              |
| -------------------------------------- | ------------------------------------ |
| `string`                               | the string                           |
| `{ value, label }`                     | `value`, automatically               |
| any other object                       | **JSON string** — usually not wanted |
| any other object + `itemToStringValue` | whatever that function returns       |

So for arbitrary objects, pass `itemToStringValue` to choose the submitted key. It is distinct from
`mapItem`, which controls what the user sees:

```tsx
<Combobox
  items={warehouses}
  mapItem={(w) => ({ label: w.name, key: String(w.id) })}
  itemToStringValue={(w) => String(w.id)}
/>
```

Multi-select submits an array.

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

### `Textarea`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/textarea.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/textarea.md)

**Import:** `import { Textarea } from '@tailor-platform/app-shell'`
**Purpose:** Multi-line text input. Maps to spec field types: `text`, long-form `string`. Use instead of `Input` whenever the value is prose (notes, descriptions, replies, reasons).
**API:** `TextareaProps` — Base UI's field control (`value`, `defaultValue`, `onChange`, `onValueChange`, `disabled`, `required`, `readOnly`, `name`, aria-\*) rendered as a `<textarea>`, plus `rows`. `cols` / `wrap` are not accepted — the control is `w-full`, so neither can take effect.
**Sizing:** no fixed height — `rows` sets the visible line count and the user can drag it taller. `min-h-16` is a hard floor, so `rows` only takes effect from 3 up. Width is the parent's job: the control is `w-full`, and `cols` is not accepted because it could never win against that. Do **not** reach for `Input` and a height override; `Input` is locked to `h-9`, and an `astw:h-*` override from a consuming app resolves to nothing unless that exact utility was compiled into the package CSS.
**Field integration:** drops straight into `Field.Root` for label/description/error wiring exactly like `Input` and `Checkbox` — no bespoke `error` prop.
**Example:**

```tsx
<Field.Root name="reason">
  <Field.Label>Reason</Field.Label>
  <Textarea rows={4} placeholder="Why is this being rejected?" />
</Field.Root>
```

**Used in patterns:** `form/composer`, `form/*` (long-text fields).

### `Checkbox`

**Import:** `import { Checkbox } from '@tailor-platform/app-shell'`
**Purpose:** Boolean form control. Maps to spec field type: `boolean`. Also used for row selection and filter toggles.
**API:** `CheckboxProps` — extends Base UI `Checkbox.Root` (`checked`/`defaultChecked`, `onCheckedChange`, `indeterminate`, `disabled`, `required`, `name`, `inputRef`) and adds an inline `label`. Integrates with `Field` for invalid/disabled/label state exactly like `Input`/`Select` — no bespoke `error` prop.
**Accessible name:** the inline `label` prop (enclosing) or a sibling `Field.Label`; for a bare box (e.g. a table row-select cell) pass `aria-label`.
**Used in patterns:** `form/*` (boolean fields), `list/*` (row selection), DataTable filter/column controls.

### `Select`

**Import:** `import { Select } from '@tailor-platform/app-shell'`
**Purpose:** Dropdown for fixed enumerations.
**API:** Compound. Sync version (small option lists). For async/typeahead, see `Combobox` and `Autocomplete`. Type: `SelectAsyncFetcher<T>` for the async variant.
**Accessible name:** inside a `Form` the field label provides it automatically. When used **standalone** (outside a `Form`), pass `aria-label` (or `aria-labelledby` / `id`) — these now forward to the underlying combobox element, so it isn't left named only by its current value. Same applies to `Combobox` and `Autocomplete`.
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

## AI

### `AIChat`

> Full API: [https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/ai-chat.md](https://raw.githubusercontent.com/tailor-platform/app-shell/refs/heads/main/docs/components/ai-chat.md)

**Import:** `import { AIChat } from '@tailor-platform/app-shell'`
**Purpose:** Building blocks for an LLM assistant UI — a streaming conversation view over a composer, plus reasoning, tool-call, and citation parts. The root places three regions in a fixed order, `Layout`-style: `AIChat.Header` (optional) over `AIChat.Conversation` over `AIChat.Composer` (optional). Each region carries its own props; the root carries `status`.
**API:** Root (`status`) + regions — `AIChat.Header` (`title`, `icon`, `actions`), `AIChat.Conversation` (`autoScroll`, transcript as children), `AIChat.Composer` (`onSubmit`, `onStop`, `value`/`defaultValue`/`onValueChange`, `placeholder`, `disabled`, `submitOnEnter`, `attachments`/`accept`/`multiple`, `actions`) — + transcript parts: `AIChat.Message`, `.Response`, `.EmptyState`, `.Suggestions`/`.Suggestion`, `.Actions`/`.Action`, `.Reasoning`/`.ReasoningTrigger`/`.ReasoningContent`, `.ChainOfThought*`, `.Tool*`, `.Sources*`, `.History`.
**Composer:** Body is `Textarea` over one action row per `form/composer`'s layout. Enter submits (IME-safe), Shift+Enter newlines, and `status` from `useAIChat()` drives the busy/Stop state.
**Header:** a 48px strip (graphic + `text-sm font-semibold` title + right action slot) closed by a full-width rule; renders only when `title` or `actions` is set.
**Renders no chrome:** no border or background of its own — wrap in `Card`, `Sheet`, or a `Layout.Column`, with `overflow-hidden` so the header rule stays inside rounded corners.
**Used in patterns:** none yet — a component, not a catalogue pattern (platform-planning#1748).

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

### `useMatch`, `useResolvedPath`, `useNavigation`

**Import:** `import { useMatch, useResolvedPath, useNavigation } from '@tailor-platform/app-shell'`
**Purpose:** `useMatch` tests a pattern against the current location (active states); `useResolvedPath` resolves a relative path; `useNavigation` exposes the in-flight navigation for pending UI.
**Used in patterns:** navigation shells, list→detail transitions.

### `useBlocker`, `useBeforeUnload`

**Import:** `import { useBlocker, useBeforeUnload } from '@tailor-platform/app-shell'`
**Purpose:** Guard navigation away from unsaved work — `useBlocker` for in-app navigation, `useBeforeUnload` for closing or reloading the tab.
**Used in patterns:** form-heavy screens.

### Types

**Import:** `import type { Location, NavigateFunction, NavigateOptions, To, Params, PathMatch, LinkProps, NavLinkProps, Navigation, Blocker, BlockerFunction } from '@tailor-platform/app-shell'`
**Purpose:** The React Router types that go with the hooks above, so app code never imports types from `react-router` either.

### Not exported

`createBrowserRouter`, `RouterProvider`, `MemoryRouter`, `Routes`, `Route` — AppShell builds the router; a second one nested inside it breaks navigation. `useLoaderData`, `Form`, `useSubmit`, `useFetcher`, `useActionData` — AppShell does not wire up React Router's data layer. Load data in the page component or the app's data layer.

### Testing

**Import:** `import { AppShell, TestRouter } from '@tailor-platform/app-shell/testing'`
**Purpose:** Test routing without a `react-router` dependency. `AppShell` from this entry also accepts `memory` / `initialEntries`, for mounting a page at a fixed URL; `TestRouter` gives a single component router context, and takes `path` when that component reads the route (`useParams` is `{}` without it).

### `createTypedPaths`

**Import:** `import { createTypedPaths } from '@tailor-platform/app-shell'`
**Purpose:** Type-safe path builder generated from the route tree.
**API:** `createTypedPaths<TRoutes>()` returns a `paths.for(...)` helper.
**Used in patterns:** project-level. See `project-setup.md`.

### `RouteParams`, `PageComponent`, `PageMeta`, `AppShellPageProps`, `AppShellRegister`, `ContextData` (types)

Types for declaring page props (`appShellPageProps = { meta, guards }`), reading typed route params, and registering route types globally. See `project-setup.md` for usage.

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
