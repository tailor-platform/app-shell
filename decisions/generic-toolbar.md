# Decision: generic `Toolbar` for action-bar layout

> Status: **Decided — introduce a generic `Toolbar` for layout and compose feature controls inside it. Implemented by PR #559.**
> Scope: toolbar layout, DataTable composition, and the migration direction for `DataTable.Toolbar`. This does not deprecate or remove `DataTable.Toolbar`.

## Context

`DataTable.Toolbar` combines two concerns:

- layout of a full-width action bar; and
- DataTable-specific controls and their placement.

That fixed composition does not serve other list presentations or the planned ActionBar use case. A second DataTable-specific layout API would duplicate the composition model: consumers would need to decide when to use the wrapper and when to use a general-purpose toolbar.

A generic toolbar also requires consumers to choose leading/trailing placement explicitly with `justify="between"`. That choice can be missed, producing inconsistent layouts, so the component needs a canonical DataTable scaffold in its documentation and examples.

## Decision

### A single generic layout primitive

Expose `Toolbar` as a layout component with four parts:

- `Toolbar.Root` stacks rows;
- `Toolbar.Row` is a horizontal action row and supports `justify="start" | "between"`;
- `Toolbar.Group` keeps related controls together; and
- `Toolbar.Separator` separates groups visually.

`Toolbar` does not own DataTable controls or any other feature-specific controls. It standardizes the layout details that otherwise drift between screens: padding, gaps, wrapping, borders, and row-level keyboard navigation.

### Feature controls compose directly

`DataTable.Filters` and `DataTable.ColumnSettings` are controls that can be placed in a generic toolbar alongside buttons, inputs, tabs, and controls from other features.

```tsx
<DataTable.Root value={table}>
  <Toolbar.Root>
    <Toolbar.Row justify="between" aria-label="Table controls">
      <Toolbar.Group>
        <DataTable.Filters />
      </Toolbar.Group>
      <Toolbar.Group>
        <DataTable.ColumnSettings />
      </Toolbar.Group>
    </Toolbar.Row>
  </Toolbar.Root>
  <DataTable.Table />
</DataTable.Root>
```

When a generic toolbar is a direct child of `DataTable.Root`, DataTable owns the outer frame while the toolbar supplies the divider below its rows.

### Keep the existing DataTable wrapper during migration

`DataTable.Toolbar` remains supported for its existing fixed layout. New custom layouts should use `Toolbar` directly. Deprecating `DataTable.Toolbar` is a separate compatibility and release decision, not part of this change.

## Consequences

- DataTable and non-DataTable screens use the same composition model for action-bar layout.
- `justify="between"` remains explicit rather than becoming a DataTable-only placement convention; the documentation and example page provide the canonical leading/trailing layout.
- AppShell buttons, inputs, selects, comboboxes, and tabs participate automatically in a toolbar row's Arrow/Home/End navigation. Composite controls retain their own directional-key behavior.
- There is no new `DataTable.Toolbar` layout API or named wrapper around the generic toolbar. Add one only if a stable, opinionated DataTable layout proves necessary across consumers.
