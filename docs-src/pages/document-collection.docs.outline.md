---
kind: prose
group: document-collection
title: Document Collection Page
slug: page/document-collection
name: Document Collection Page
category: page
description: The index screen for a document type — a table of records, filtered and sorted, from which one record is opened
requiredImports:
  [
    DataTable,
    Layout,
    Toolbar,
    Tabs,
    Menu,
    Button,
    useDataTable,
    useURLCollectionVariables,
    createColumnHelper,
  ]
tags: [list, collection, index, datatable, filter, bulk-action]
do:
  - The landing screen for an area of the app built around one document type — purchase orders, invoices, shipments
  - Someone needs to find one record among many, or scan the recent ones, and open it
  - The set is large or keeps changing, so it needs filtering, sorting and pagination rather than a static list
dont:
  - A table of records sitting inside another page — that is a part of that page, not a page of its own
  - Reference data edited in place from the list, such as sites, tax codes or roles — that is a master list
  - Reading or acting on one record — that is `page/document-detail`
---

# page/document-collection

This is the screen to show a listing of **multiple records**, typically all records, or all records matching a criteria. The primary element on-screen is a paginated table of records, serving as an overview and showing the most relevant (often most recent) records first. Appropriate filtering and search capabilities should be available for the user to easily and quickly find and access records matching a particular set of criteria, or open a specific individual record on its document-detail screen.

## When to Use

Use when:

- The landing page for an area of the application that revolves around a document-type
- Where the user should have access to an individual document, as a means of finding and accessing that document among the set
- There will be a substantial number of records, that either grows over time or the data for which changes regularly

When not to use:

- For a table of records shown as an element within another page
- To show all details about a record-set (this is meant as an overview)

## What the page answers

1. **What is the high level information about recent records?**
2. **What records match specific filter criteria — e.g. all records that have an 'in-transit' status; all overdue invoices; all records issued to supplier 'x'**

## High-level layout

```
Layout fill
  +------------------------------------------------------------+
  | Layout.Header                                              |
  |  breadcrumbs                                               |
  |  Title: Purchase Orders      Button: Create Purchase Order |
  +------------------------------------------------------------+
  | Layout.Column                                              |
  |  DataTable.Root                                            |
  |   Toolbar.Root                                             |
  |    Toolbar.Row                                             |
  |     DataTable.Filters  Download?  DataTable.ColumnSettings |
  |  DataTable.Table                                           |
  |  DataTable.Footer                                          |
  |    DataTable.Pagination      bulk-action bar              |
  +------------------------------------------------------------+
```

Parts marked `?` are only there when the use case needs them.

The Layout component should be given the `fill` prop, which sets styles so the browser scrolling occurs internal to the table row area, so title, filters, footer stay visible.

## Column selection

Placing `DataTable.ColumnSettings` in the toolbar shows a "Columns" button so the user can customize which columns are shown. Only the columns you define in `columns` can be shown; a field on the row with no column definition never appears in the menu.

Pass a stable, unique `tableId` to `useDataTable` so each user's column layout persists across visits (see [Column pinning, visibility & ordering](../components/data-table.md#column-pinning-visibility--ordering)). Maintain consistency in convention for the `tableId`s across document collection in the app.

However, the fields included as columns should be chosen on the following criteria:

- **Is this data relevant for an application-end user?** Exclude meta-data, tracking fields that are there mostly for auditing, or fields more relevant for a deeper dive only
- **Would the values of this field help distinguish records from each other?** Statuses, customer/supplier names, product titles
- **Would showing the value of a field help surface any potential issues to a user?** Totals, outstanding balances, total number of subrecords (e.g. Line Items of an Invoice, Variants of a product)

Typical fields worth showing are:

- Document Number (e.g. Purchase Order Number)
- Product Name
- Totals, e.g. costs, tax
- Document Status
- Related documents' composite status (e.g. for a Purchase Order, which may have multiple Goods Receipts, are all those Goods Receipts paid, partially paid, or are all unpaid)
- Supplier or customer names
- Key dates in the document's life-cycle

The columns to show are worth confirming with a decision-maker such as a Project Manager or Product Owner.

## Cell rendering and data-types

The DataTable `useDataTable` hook takes column definition information as the `columns` named parameter of the hook's configuration object argument (see [`useDataTable`](../components/data-table.md#usedatatable)).

Ensure you pass an appropriate `type` value to match the type of value the field is expected to contain. E.g. for a Total Cost column, ensure we provide `type: "money"`; Date fields should get `type: "date"`; Status fields should be shown in a `type: "badge"`, for best out-of-the-box rendering of these values.

Primary identifiers, E.g. Document Number, or Product SKU should show first, and be pinned-left via `pin: "left"`

## The row set

There may be situations where it is useful for the user to switch between different related datasets on the same page. Both/all of which need to make sense to be found on this page where it sits in the navigation structure.

Tabs here are only for genuinely different datasets, each with its own columns. They are not for preset views of the same records — "Open", "Overdue", "Paid" — which are filters on one table and belong in its toolbar (see [Preset filters](#preset-filters)).

```
Layout fill
  +------------------------------------------------------------+
  | Layout.Header                                              |
  |  (as above)                                                |
  +------------------------------------------------------------+
  | Layout.Column                                              |
  |  Tabs.Root variant="line"                                  |
  |   Tabs.List                                                |
  |    Tabs.Tab: Orders       Tabs.Tab: Order lines            |
  |   Tabs.Panel                                               |
  |    DataTable.Root                                          |
  |     (as above)                                             |
  +------------------------------------------------------------+
```

Each tab is its own [`Tabs.Panel`](../components/tabs.md) holding its own `DataTable.Root`, with its own query, columns and toolbar. The tabs sit above the table, inside the column, so the header and its create action stay the same whichever tab is active.

- **Keep the active tab in the URL**, e.g. `?tab=lines`, the same as the table's filters and sort, so a link or a refresh lands on the same table.
- **Only the active panel is mounted.** Leave `keepMounted` off. `useURLCollectionVariables` writes to fixed URL keys (`p`, `s`, `f.<field>:<op>`), so two mounted tables would read and write each other's state.
- **Switching tab clears the outgoing table's filter, sort and page params** in the same event that sets the tab, since a filter on one dataset rarely means anything on the other.

## Variants

The main variance in document collection pages across different record types will be in the table's Toolbar. How each varies will be informed by the type of document and its fields, and the needs that the user as someone making decisions based on or taking action on the data.

### Filtering, sorting and search

As a default recommendation, the toolbar should include `DataTable.ColumnSettings` and `DataTable.Filters`. Additional filtering and search options should be based on the end-user's workflows within the dataset, and the common needs to drill-down to effectively complete their workflow.

Default sort order is often a key date field, descending (most recent first). For records that are not a related to time, alphabetical on a key human-readable identifier such as Product Name is common

#### Preset filters

Where users repeatedly narrow the same records to a few named views — "Open", "Overdue", "Paid" — offer them as a capsule [`Tabs`](../components/tabs.md) control in the toolbar, straight after the filter button, not as tabs above the table. They are filters on this one table, so they sit with its other filters.

Each preset sets an ordinary filter through `control`, and "All" removes it. The preset then shows as a filter chip the user can see and edit, persists to the URL with the rest of the filters, and resets the page cursor, all without extra wiring. A field holds one filter, so picking a preset replaces any chip on that field.

```tsx
const statusFilter = control.filters.find((f) => f.field === "status");
const active =
  Array.isArray(statusFilter?.value) && statusFilter.value.length === 1
    ? String(statusFilter.value[0])
    : statusFilter
      ? null
      : "all";

<Toolbar.Group>
  <DataTable.Filters slot="add" />
  <Tabs.Root
    variant="capsule"
    size="sm"
    value={active}
    onValueChange={(key) =>
      key === "all" ? control.removeFilter("status") : control.addFilter("status", "in", [key])
    }
  >
    <Tabs.List aria-label="Invoice status">
      <Tabs.Tab value="all">All</Tabs.Tab>
      <Tabs.Tab value="overdue">Overdue</Tabs.Tab>
      <Tabs.Tab value="paid">Paid</Tabs.Tab>
    </Tabs.List>
  </Tabs.Root>
</Toolbar.Group>;
```

The active preset is read back from `control.filters`. If the user edits the chip into something no preset matches, show no preset as active rather than "All", which would claim the list is unfiltered.

Where a preset needs more than one filter chip can express, such as "Open" meaning sent or overdue across two fields, combine it with the query as an external predicate instead. See [Combining an external predicate](../components/data-table.md#combining-an-external-predicate).

#### Filter rail

The default is `DataTable.Filters` in the toolbar, which suits most collections. A [`FilterRail`](../components/filter-rail.md) instead shows the filterable fields beside the table, with their options visible up front. Don't choose it on your own: ask what the filtering requirement is, and explicitly whether a filter rail or standard filtering is wanted. Without a clear answer, use standard filtering.

When the rail is used, it is the page's only filter surface. Don't add `DataTable.Filters` or [preset filters](#preset-filters) alongside it, so every filter lives in one place.

```
Layout fill
  +------------------------------------------------------------+
  | Layout.Header                                              |
  |  (as above)                                                |
  +------------------+-----------------------------------------+
  | Layout.Column    | Layout.Column area="main"               |
  |  area="left"     |  DataTable.Root                         |
  |  FilterRail.Root |   Toolbar.Root                          |
  |   Header         |    Toolbar.Row                          |
  |    ClearAll      |     FilterRail.Trigger  ColumnSettings  |
  |    Settings      |  DataTable.Table                        |
  |   Sections       |  DataTable.Footer                       |
  +------------------+-----------------------------------------+
```

- The rail writes the same `control` from `useURLCollectionVariables` that the table reads, so its filters persist to the URL like any other.
- Include `FilterRail.ClearAll` and `FilterRail.Settings` in its header. Settings lets each user hide and reorder sections; pass `useFilterRailLayout` a stable key so their layout persists.
- Only small, fixed sets of values belong in checkbox or radio sections. Fields whose values keep growing, such as customers or suppliers, get a search. See [Choosing a control](../components/filter-rail.md#choosing-a-control).
- Below `lg` the rail becomes a sheet behind a **Filters** button. Wrap the page in `FilterRail.Provider` and place `FilterRail.Trigger` at the left of the table toolbar, where the filter button sits otherwise.

With [summary metric cards](#summary-metric-cards), the rail sits beside the table only, not the cards. `Layout` columns run the full height of the page, so lay this out inside a single column with Tailwind utilities. This is pending simplification once more primitive layout building blocks are available.

```tsx
<FilterRail.Provider control={control} sections={sections} layout={railLayout}>
  <Layout fill={isTabletUp}>
    <Layout.Header title="Invoices" />
    <Layout.Column>
      <Grid columns={{ initial: 1, md: 2, xl: 4 }} gap={4}>
        {/* MetricCards; turn fill off below md, as in Summary metric cards */}
      </Grid>
      <div className="flex min-h-0 flex-1 lg:gap-4">
        {/* Below lg the rail renders only its sheet, so this collapses to nothing. */}
        {/* 320px, the same as Layout.Column area="left": wide enough for a date range field. */}
        <div className="lg:w-80 lg:shrink-0 lg:overflow-y-auto">
          <FilterRail.Root>
            <FilterRail.Header>
              <FilterRail.ClearAll />
              <FilterRail.Settings />
            </FilterRail.Header>
            <FilterRail.Sections />
          </FilterRail.Root>
        </div>
        <DataTable.Root
          value={table}
          className={isTabletUp ? "min-w-0 flex-1" : "h-[calc(100svh-8rem)] min-w-0 flex-1"}
        >
          {/* Toolbar with FilterRail.Trigger at the left, as above */}
        </DataTable.Root>
      </div>
    </Layout.Column>
  </Layout>
</FilterRail.Provider>
```

### Row actions and bulk actions

Clicking anywhere on a row opens that record's document-detail page, via `onClickRow`, unless the business requirements say otherwise. Where an element inside a cell is clickable on its own, such as a link to a related record, give it enough padding that its hit area is comfortably larger than the text, so it can be hit without landing on the row instead.

Each row should also carry a per-row action menu, declared as [`rowActions`](../components/data-table.md#rowaction), which DataTable renders as a kebab-menu column. It should offer all, or nearly all, of the actions in that record's document-detail Actions panel, so the user can act on a record without opening it.

When the records have actions that make sense processing multiple records at a time, the DataTable should enable row selection, with these actions available via bulk action API.

Such actions might include: Updating document status, progressing the document through its lifecycle, workflow actions like reject or accept, marking as viewed.

Exports are the exception. Add one only when the use case needs people to download the data. Whether an example on this page shows a Download button says nothing about whether yours should have one; the examples show how to build it when it's wanted.

When someone wants to download a copy of the data, they'll commonly want the whole set they've filtered down to, without selecting anything. So exports sit in the toolbar as permanent buttons, and export every record matching the current filter and sort. When rows are selected, the same buttons export only that selection.

If the requirements only call for one format, use a single "Download XLS" button. Where several formats are available, use one "Download" button that opens a menu of the formats:

```tsx
<Toolbar.Group>
  <Menu.Root>
    <Menu.Trigger render={<Button variant="outline" />}>
      Download
      <ChevronDownIcon />
    </Menu.Trigger>
    <Menu.Content position={{ align: "end" }}>
      <Menu.Item onClick={() => download("pdf")}>PDF</Menu.Item>
      <Menu.Item onClick={() => download("csv")}>CSV</Menu.Item>
      <Menu.Item onClick={() => download("xlsx")}>XLS</Menu.Item>
    </Menu.Content>
  </Menu.Root>
</Toolbar.Group>
```

Here `download` sends the selected ids when there are any, and otherwise the current `variables.query` and `variables.order` from `useURLCollectionVariables`, so the backend exports the full filtered set rather than the loaded page.

Actions that change records, like cancelling or confirming orders or creating an invoice from them, never make sense across every record. They only run on a set the user has selected, so they belong in the bulk-action bar and not the toolbar.

Some actions will not be appropriate as bulk actions, though would still be available on the [individual document detail page](./document-detail.md). E.g. Creating sub-document, Amend/edit. These are inappropriate because the action requires further follow-up activity, per-document.

Bulk actions are built into DataTable — declare them as `rowSelection.actions` and `DataTable.Footer` renders the bar. See [Selection actions](../components/data-table.md#selection-actions) for the API, how many actions stay inline before collapsing into a menu, and how to confirm a destructive one.

### Summary metric cards

```
Layout fill
  +------------------------------------------------------------+
  | Layout.Header                                              |
  |  (as above)                                                |
  +------------------------------------------------------------+
  | Layout.Column                                              |
  |  Grid: MetricCard  MetricCard  MetricCard  MetricCard      |
  |  DataTable.Root                                            |
  |   (as above)                                               |
  +------------------------------------------------------------+
```

As the default landing page for the document-type's section of the app, there may be aggregate or performance data that is useful to show in conjunction with the collection table. These metrics should either be specified by business requirements, or be standard metrics in ERP software for this area of business.

Lay the cards out in a [`Grid`](../components/grid.md) that reflows as the screen narrows. How many cards there are, and so how many columns suit them, depends on the business case: it may be two or three, or nine. The examples here use four cards in `columns={{ initial: 1, md: 2, xl: 4 }}`, which gives one row on wide screens, two on tablets, and four stacked on phones.

Under `Layout fill`, the cards' height comes out of the table's. **Once the cards reflow past two rows, turn `fill` off** at that width. The page then scrolls normally, and the table takes roughly the viewport's height once scrolled to. For the four cards above that means below `md`; nine cards in the same grid would be three rows even at `xl`, so that page would not use `fill` at all.

```tsx
// No exported hook for this yet, so match the breakpoint directly. For these four
// cards, two rows or fewer means `md` and up.
const tabletQuery = window.matchMedia("(min-width: 768px)");
const useIsTabletUp = () =>
  useSyncExternalStore(
    (onChange) => {
      tabletQuery.addEventListener("change", onChange);
      return () => tabletQuery.removeEventListener("change", onChange);
    },
    () => tabletQuery.matches,
  );

const isTabletUp = useIsTabletUp();

<Layout fill={isTabletUp}>
  <Layout.Header title="Invoices" />
  <Layout.Column>
    <Grid columns={{ initial: 1, md: 2, xl: 4 }} gap={4}>
      {/* MetricCards */}
    </Grid>
    {/* 8rem allows for the shell header and page padding; adjust to your layout. */}
    <DataTable.Root value={table} className={isTabletUp ? undefined : "h-[calc(100svh-8rem)]"}>
      {/* … */}
    </DataTable.Root>
  </Layout.Column>
</Layout>;
```

The same applies to anything else stacked above the table: when it would leave the table too little height, bail out of `fill` at that width. This is pending a `Layout` option that does it for you.

## Data-fetching

Do not hand-roll `first` / `after`. The hook `useURLCollectionVariables` should be used to store the filter and sort variables in the URL for bookmark and sharing persistence. Compose `useURLCollectionVariables` with `useDataTable`, and pass the generated `tableMetadata` so the query and order variables are typed. The mechanics — what the hooks return, how `edges` / `pageInfo` / `total` map into the table, how filters and sort persist to the URL — are specified in [DataTable](../components/data-table.md) and [GraphQL conventions](../concepts/graphql.md), and are not repeated here.

Two of those behaviours shape this screen in particular.

Where the page adds custom filtering UI, beyond `DataTable.Filters`, this consumer-defined filtering should adhere to:

- Update the URL query-parameters to reflect the filtering, and on load, rehydrate from the values when present
- When filter values change, reset the pagination

See [Combining an external predicate](../components/data-table.md#combining-an-external-predicate).

With nothing selected, a toolbar export runs over every matching record, not just the visible page, so it takes the current filter and sort rather than the loaded rows. The set matching a filter is almost always larger than a page.

Reference data for filter dropdowns, such as a list of sites or suppliers, should be a separate query rather than joined into the list query.

## Empty, loading and error states

Empty, loading and error states have a natural interface through DataTable. The page should typically be able to load immediately, with the loading state and feedback occurring at the DataTable row level, and at the filtering level where record data is required to be fetched to build filter option values.

If you are adding `MetricCard`s above the DataTable, these should render immediately, with a [`Spinner`](../components/spinner.md) in place of each value while its data loads in the background. Whether each `MetricCard`'s data is fetched separately, or all `MetricCards`'s data fetched in one call is up to the implementation as to what is most appropriate, balancing simulataneous requests vs speed of loading for each number. The decision for this will be informed by the specific metrics to be shown and the nature of the data.

## Patterns for the parts

The page decides the frame; these build what sits in it.

| Need                                 | Pattern                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Creating a new document              | [`form/single-page`](../patterns/form-single-page.md) on its own route |
| A document with several field groups | [`form/sectioned`](../patterns/form-sectioned.md) on its own route     |
| Confirming a destructive bulk action | [`interaction/confirm`](../patterns/interaction-confirm.md)            |
| Reporting a bulk action's outcome    | [`interaction/toast`](../patterns/interaction-toast.md)                |

### Create new document

Commonly the app should provide a way to create a new document that the collection lists. This is done by way of a Button passed as an action to [`Layout.Header`](../components/layout.md#header). This Button should render a Link to the document's create page – not open a creation form in a modal.

The create page itself is a [single-page form](../patterns/form-single-page.md), or a [sectioned form](../patterns/form-sectioned.md) where the document has enough field groups to warrant it.

### Confirming and reporting bulk actions

A bulk action that is destructive or hard to reverse – cancelling, voiding, rejecting – should confirm first, via the [confirm pattern](../patterns/interaction-confirm.md). Say how many records are affected, since the user may have built the selection up across several pages.

Report the outcome with a [toast](../patterns/interaction-toast.md), and report what actually happened rather than what was asked for. A bulk call can succeed for some records and not others, so "Cancelled 12 of 15 orders" is more use than "Orders cancelled".

## Reference implementation

The column definitions are left out below, since nothing about them is specific to this page. See [Adding a typed column](../components/data-table.md#adding-a-typed-column) and [Combining `type` with `inferColumns`](../components/data-table.md#combining-type-with-infercolumns) in the DataTable docs.

<!-- example: document-collection -->

## Open questions

Should there ever be elements placed in a right-hand column on one of these pages? There may be reasons to, but it is currently not part of the advised pattern

Do we want to encourage/allow inline editing on pages such as these

## Constraints

- **Size the list query for the dataset it will grow into.** Joins, conditionals and aggregations in the query get slow as the dataset grows, and a development or UAT environment with sample data won't show it.
- **Fetching child records to total them in the table is sometimes the only option.** Tailor's built-in `<entities>` queries return a connection and no aggregates, so an at-a-glance figure that isn't stored on the document — received quantity across a purchase order's lines, say — can only be summed client-side. That is acceptable when the number of children per record is bounded. Where it isn't, store the figure on the document or add a custom resolver rather than fetching more.
- **A preset, tab or filter change resets the page cursor in the same event**, not in a following effect.

## Anti-patterns

- Inline-editable cells. Inline-editing is more appropriate for editing a single document's enumerable fields values.

- A per-row "View" or "Open" button. The whole row is clickable via `onClickRow`, and the primary identifier is a `type: "link"` column so the same navigation is reachable by keyboard and screen reader.

- Record-changing actions, such as Cancel or Confirm, as toolbar buttons. They need a selection, so they belong in the bulk-action bar.

- Promoting every schema field to a column in the table.

- A back/navigation control in the header — the breadcrumb owns that, same as `page/document-detail`.

- A bespoke table with its own pagination, rather than DataTable with `useURLCollectionVariables`.

- Hand-rolled `max-height` / `overflow` wrappers around the table to contain scrolling — `Layout fill` already does this. The filter rail layout above is an exception for now, pending layout building blocks for it.

- Tabs above the table for preset views of the same records. Those are [preset filters](#preset-filters) in the toolbar.

- A preset or tab that only changes local UI state while the query still returns the full set. It has to reach the query.

- Client-side filtering. A collection is paginated on the server, so the client only holds one page and filtering it hides matches on the other pages. It's only acceptable on a list small and bounded enough not to be paginated at all.

- Adding a query limit in place of pagination — if the limit is reachable, the list is wrong rather than slow.
