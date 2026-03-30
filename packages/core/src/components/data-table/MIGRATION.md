# DataTable Migration Design

Migrate DataTable components, hooks, and types from `tailor-data-viewer` into `@tailor-platform/app-shell` (`packages/core`).

Source repository: https://github.com/tailor-sandbox/tailor-data-viewer

## Scope

### In Scope

All components, hooks, and type definitions under `packages/data-viewer/src/component/`.

### Out of Scope

- `generator/metadata-generator.ts` — Depends on Tailor Platform SDK; kept as a separate package. Only the type interfaces (`TableMetadata`, etc.) are defined in app-shell.
- `styles/theme.css` — Not needed; app-shell's existing theme (CSS variables + Tailwind) is used instead.
- `component/data-table/column-selector.tsx` — Will be rebuilt separately. Migration path for existing users is intentionally deferred; not planned in this document.
- `component/data-table/csv-button.tsx` — Will be rebuilt separately. Migration path for existing users is intentionally deferred; not planned in this document.
- `component/data-table/search-filter-form.tsx` — Will be rebuilt separately. Migration path for existing users is intentionally deferred; not planned in this document.

## File Mapping

| Source (tailor-data-viewer)                       | Destination (packages/core/src/)               | Notes                                                                        |
| ------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `component/types.ts`                              | `components/data-table/types.ts`               | Remove imports from `generator/`; define `TableMetadata` etc. self-contained |
| `component/lib/utils.ts`                          | —                                              | Use existing `cn()` from `@/lib/utils`                                       |
| `component/table.tsx`                             | —                                              | Use existing `Table` component                                               |
| `component/collection/use-collection.ts`          | `hooks/use-collection-variables.ts`            | Usable standalone outside DataTable                                          |
| `component/collection/use-collection.test.ts`     | `hooks/use-collection-variables.test.ts`       |                                                                              |
| `component/collection/use-collection.typetest.ts` | `hooks/use-collection-variables.typetest.ts`   |                                                                              |
| `component/collection/collection-provider.tsx`    | `contexts/collection-control-context.tsx`      | Follow app-shell convention for Context Providers                            |
| `component/data-table/data-table.tsx`             | `components/data-table/data-table.tsx`         | Replace internal `Table.*` refs with app-shell Table                         |
| `component/data-table/data-table-context.tsx`     | `components/data-table/data-table-context.tsx` |                                                                              |
| `component/data-table/use-data-table.ts`          | `components/data-table/use-data-table.ts`      |                                                                              |
| `component/data-table/pagination.tsx`             | `components/data-table/pagination.tsx`         |                                                                              |
| `component/data-table/column-selector.tsx`        | —                                              | Out of scope; will be rebuilt separately                                     |
| `component/data-table/csv-button.tsx`             | —                                              | Out of scope; will be rebuilt separately                                     |
| `component/data-table/search-filter-form.tsx`     | —                                              | Out of scope; will be rebuilt separately                                     |
| `component/data-table/i18n.ts`                    | `components/data-table/i18n.ts`                |                                                                              |
| `component/field-helpers.ts`                      | `components/data-table/field-helpers.ts`       |                                                                              |
| `component/field-helpers.test.ts`                 | `components/data-table/field-helpers.test.ts`  |                                                                              |
| `component/table.test.tsx`                        | `components/data-table/data-table.test.tsx`    |                                                                              |
| `component/data-table/column-selector.test.tsx`   | —                                              | Out of scope; will be rebuilt separately                                     |
| `component/data-table/csv-button.test.tsx`        | —                                              | Out of scope; will be rebuilt separately                                     |
| `component/index.ts`                              | `components/data-table/index.ts`               | Public exports only                                                          |

## Target Directory Structure

```
packages/core/src/
  hooks/
    use-collection-variables.ts             # useCollectionVariables hook (standalone)
    use-collection-variables.test.ts
    use-collection-variables.typetest.ts
  contexts/
    collection-control-context.tsx         # CollectionControlProvider + useCollectionControl
  components/
    data-table/
      DESIGN.md                             # This file
      index.ts                              # Public exports
      types.ts                              # Type definitions (incl. TableMetadata)
      data-table.tsx                        # DataTable compound component
      data-table.test.tsx                   # DataTable tests
      data-table-context.tsx                # DataTableContext + useDataTableContext
      use-data-table.ts                     # useDataTable hook
      pagination.tsx                        # Pagination component
      field-helpers.ts                      # createColumnHelper, inferColumns
      field-helpers.test.ts
      i18n.ts                               # DataTable locale labels (via defineI18nLabels)
```

## API Reference

Source DataTable の完全な API 定義（型・コンポーネント・フック・ヘルパー）と移行時の変更点は **[API.md](./API.md)** を参照。

## Implementation Steps

### Phase 1: Types

1. Migrate `types.ts`
   - Remove imports from `generator/metadata-generator.ts`
   - Move `FieldType`, `FieldMetadata`, `TableMetadata`, `TableMetadataMap` into `types.ts`
   - Move metadata-dependent types (`BuildQueryVariables`, `TableMetadataFilter`, `MetadataFilter`, `TableFieldName`, `TableOrderableFieldName`, etc.) into `types.ts`
   - Keep runtime constants (`OPERATORS_BY_FILTER_TYPE`, `DEFAULT_OPERATOR_LABELS`, `fieldTypeToSortConfig`, `fieldTypeToFilterConfig`) as-is

### Phase 2: Hooks

2. Migrate `useCollectionVariables` hook
   - Update imports to use `@/lib/utils` for `cn`
   - Replace `../generator/metadata-generator` references with `./types`
3. Migrate `CollectionControlProvider` → `contexts/collection-control-context.tsx`
4. Migrate `useDataTable` hook
5. Migrate `DataTableContext`

### Phase 3: Components

Migrate each component **with app-shell conventions applied inline** (astw: prefix, data-slot, displayName — do not defer to a separate phase):

6. `DataTable` compound component
   - Map internal `Table.*` references to app-shell's Table:
     - `Table.Headers` → `Table.Header`
     - `Table.HeaderRow` → `Table.Row`
     - `Table.HeaderCell` → `Table.Head`
     - `Table.Body`, `Table.Row`, `Table.Cell` → unchanged (names match)
   - Use app-shell's `Table.Root` (drop `tableLayout` prop)
   - Replace raw `<button>` elements with app-shell `Button`
   - Replace inline SVG icons with `lucide-react` equivalents
   - Replace `<details>/<summary>` dropdowns with app-shell `Menu`
   - Replace raw `<input>` with app-shell `Input`
   - Replace raw `<select>` with app-shell `Select`
   - Apply `data-slot` naming: `data-table` (Root), `data-table-header` (Headers), `data-table-body` (Body), `data-table-row` (Row), `data-table-cell` (Cell), `data-table-provider` (Provider), `data-table-sort-indicator` (SortIndicator), `data-table-row-actions` (RowActionsMenu)
   - Hardcode wrapper styles (`astw:border astw:rounded-md astw:bg-card`) inside `DataTable.Root`
7. `Pagination`
8. `i18n.ts`
9. `field-helpers.ts` (`createColumnHelper`, `inferColumns`)

### Phase 4: Public API Exports

10. Create `components/data-table/index.ts` exporting:
    - `DataTable` (compound namespace)
    - `useDataTable`, `useDataTableContext`
    - `useCollectionVariables`, `CollectionControlProvider`, `useCollectionControl`
    - `createColumnHelper`
    - `Pagination`
    - Runtime constants: `OPERATORS_BY_FILTER_TYPE`, `DEFAULT_OPERATOR_LABELS`, `fieldTypeToSortConfig`, `fieldTypeToFilterConfig`
    - Exported types (public API):
      - Core: `Column`, `ColumnOptions`, `ColumnDefinition`, `SortConfig`, `FilterConfig`, `SortState`, `Filter`, `FilterOperator`, `SelectOption`, `PageInfo`, `RowAction`, `RowOperations`
      - Collection: `CollectionVariables`, `CollectionControl`, `CollectionResult`, `NodeType`, `QueryVariables`, `PaginationVariables`, `UseCollectionOptions`, `UseCollectionReturn`
      - DataTable: `UseDataTableOptions`, `UseDataTableReturn`
      - Metadata (consumed by `@tailor-platform/app-shell-sdk-plugins`): `FieldType`, `FieldMetadata`, `TableMetadata`, `TableMetadataMap`, `BuildQueryVariables`, `TableMetadataFilter`, `MetadataFilter`, `TableFieldName`, `TableOrderableFieldName`, `OrderableFieldName`, `FieldName`, `MatchingTableName`, `MetadataFieldOptions`, `MetadataFieldsOptions`
      - i18n: `DataTableLocale`
      - Pagination: `PaginationProps`
    - Internal types (NOT exported): `DataTableContextValue`, `OperatorForFilterType`, `OperatorForField`, `FieldTypeToFilterConfigType`, `SearchFilterLabels`, `SearchFilterFormProps`, `ColumnSelectorProps`, `CsvButtonProps`
11. Add re-exports from `data-table/index.ts` in `packages/core/src/index.ts`

### Phase 5: Tests

12. Create test utility: a `renderWithAppShell` wrapper (or similar) that provides `AppShellProvider` context (including locale config) for `renderHook` / `render` calls. Place in a shared test-utils file (e.g., `packages/core/src/test-utils.tsx`).
13. Migrate and fix existing tests
    - Update import paths
    - Update snapshots for `astw:`-prefixed classes and replaced UI elements
    - Use `happy-dom` environment (app-shell's vitest config). If specific DOM APIs are missing (e.g., `IntersectionObserver`, `ResizeObserver`), add minimal polyfills/mocks in the test setup rather than switching to jsdom.
    - Use `renderWithAppShell` wrapper for all tests that exercise hooks calling `useT()` / `useAppShellConfig()`
14. Verify all tests pass

### Phase 6: Cleanup

15. Remove `@tanstack/react-table` from `packages/core/package.json` dependencies (unused — the source does not use it and no other code in `packages/core/src/` imports it)
16. Run `pnpm install` to update lockfile

### Phase 7: Documentation & Previewer

17. Create `docs/components/data-table.md` documenting DataTable, Pagination, useDataTable, useCollectionVariables, createColumnHelper with usage examples
18. Add DataTable examples to `packages/previewer` for visual testing

### Phase 8: Quality Check

19. `pnpm type-check` — no type errors
20. `pnpm lint` — no lint errors
21. `pnpm test` — all tests pass
22. `pnpm fmt` — consistent formatting

## Design Decisions

| Topic                                     | Decision                                                                                               | Rationale                                                                                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`generator/` handling**                 | Separate package `@tailor-platform/app-shell-sdk-plugins`                                              | Depends on Tailor SDK; out of scope for app-shell. Added as a new monorepo package                                                                                                                              |
| **Metadata types**                        | Defined as interfaces in `types.ts`                                                                    | Generator conforms to the same types; avoids circular imports                                                                                                                                                   |
| **i18n integration**                      | Integrated with app-shell's `defineI18nLabels`                                                         | Resolved via `useT()` from `AppShellConfig.locale`. The `locale` prop is removed. Standalone usage outside AppShell is not needed                                                                               |
| **Existing Table relationship**           | DataTable uses app-shell's `Table` internally                                                          | Avoids duplication and maintains theme consistency                                                                                                                                                              |
| **Directory structure**                   | `components/data-table/` directory (Pattern C)                                                         | Too many files for flat placement                                                                                                                                                                               |
| **`useCollectionVariables` placement**    | Separated into `hooks/use-collection-variables.ts`                                                     | Intended for standalone use outside DataTable (e.g., kanban)                                                                                                                                                    |
| **Internal UI elements**                  | Replace raw HTML with app-shell components (`Button`, `Input`, `Select`, `Menu`, `lucide-react` icons) | Maintains theme, accessibility, and style consistency                                                                                                                                                           |
| **`@tanstack/react-table`**               | Remove from `package.json`                                                                             | The source does not use it. No code in `packages/core/src/` imports it. Removing it in Phase 6 reduces bundle size and avoids confusion                                                                         |
| **Styling adaptation timing**             | Applied inline during component migration (Phase 3), not as a separate phase                           | Avoids touching each file twice                                                                                                                                                                                 |
| **`CollectionControlProvider` placement** | `contexts/collection-control-context.tsx`                                                              | Follows the existing app-shell convention where all Context Providers live in `contexts/` (e.g., `auth-context.tsx`, `theme-context.tsx`). Discoverability > co-location for providers                          |
| **Component pattern**                     | Pattern C (Multi-File Directory) — evaluate Pattern D after migration                                  | Source uses `DataTable.Provider` + compound sub-components; there is no dominant "simple props" usage pattern today. Pattern D (Standalone + Parts) may be introduced later if a pre-assembled API is warranted |
| **`data-slot` naming**                    | Prefix all slots with `data-table-` (e.g., `data-table-header`, `data-table-body`, `data-table-row`)   | Avoids collision with existing `Table` slots (`table-header`, `table-body`, etc.) and provides a consistent CSS targeting surface                                                                               |
| **`DataTable.Root` wrapper styles**       | Hardcoded inside `DataTable.Root`: `astw:border astw:rounded-md astw:bg-card`                          | Source includes these styles on the root; app-shell's `Table.Root` does not. Hardcoding keeps the DataTable visually consistent without requiring consumers to add wrapper styles                               |
| **Test environment**                      | `happy-dom` (non-negotiable). Missing DOM APIs are polyfilled/mocked in test setup                     | Aligns with app-shell's existing vitest config. Switching to jsdom is not an option                                                                                                                             |
| **Test utilities**                        | Shared `renderWithAppShell` wrapper providing `AppShellProvider` context                               | Required because `useT()` depends on `useAppShellConfig()`. Avoids duplicating provider setup across every test file                                                                                            |

## Table Sub-component Name Mapping

| data-viewer (`Table.*`) | app-shell (`Table.*`) |
| ----------------------- | --------------------- |
| `Table.Root`            | `Table.Root`          |
| `Table.Headers`         | `Table.Header`        |
| `Table.HeaderRow`       | `Table.Row`           |
| `Table.HeaderCell`      | `Table.Head`          |
| `Table.Body`            | `Table.Body`          |
| `Table.Row`             | `Table.Row`           |
| `Table.Cell`            | `Table.Cell`          |

### Style Differences to Address

- **`Table.Root` wrapping**: Source includes `border`, `rounded-md`, `bg-card` on root; app-shell's `Table.Root` only provides overflow wrapper. These styles are hardcoded inside `DataTable.Root` (consumers can override via `className`).
- **`tableLayout`**: Source defaults to `table-fixed`. App-shell's Table does not set this. DataTable should apply `astw:table-fixed` via `className` on `Table.Root` if needed.

## Dependencies

No additional packages required (`cn`, `clsx`, `tailwind-merge`, `lucide-react` are all existing dependencies).

`@tanstack/react-table` will be **removed** from `packages/core/package.json` in Phase 6 (currently listed but unused).

## Generator Package Relationship

After migration, `@tailor-platform/app-shell` exports the `TableMetadata` interface. The `@tailor-platform/app-shell-sdk-plugins` package (at `packages/sdk-plugins` in the monorepo) contains the generator and produces metadata conforming to this type.
