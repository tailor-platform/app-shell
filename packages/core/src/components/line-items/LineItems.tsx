import {
  LineItemsAddRow,
  LineItemsBulkActions,
  LineItemsFullscreenToggle,
  LineItemsSaveActions,
  LineItemsSearch,
  LineItemsSearchToggle,
} from "./line-items-parts";
import { LineItemsRoot } from "./line-items-root";
import { LineItemsTable } from "./line-items-table";

/**
 * Compound line-items API. Pair with the `useLineItems` hook:
 *
 * ```tsx
 * const lineItems = useLineItems<POLine>({ fields, data: initialLines });
 * return (
 *   <LineItems.Root value={lineItems}>
 *     <LineItems.Search />
 *     <LineItems.BulkActions>{({ bulkRemove }) => <Button onClick={bulkRemove}>Delete</Button>}</LineItems.BulkActions>
 *     <LineItems.Table maxBodyHeight={1000} />
 *     <LineItems.AddRow>{...}</LineItems.AddRow>
 *     <LineItems.SaveActions onSave={handleSave} />
 *   </LineItems.Root>
 * );
 * ```
 *
 * Spreadsheet behaviors (range select, fill-drag, TSV copy/paste, keyboard nav)
 * are always-on inside `<LineItems.Table>`. There is no top-level `<LineItems />`
 * component — the namespace exports each compound part.
 */
export const LineItems = {
  Root: LineItemsRoot,
  Table: LineItemsTable,
  Search: LineItemsSearch,
  SearchToggle: LineItemsSearchToggle,
  BulkActions: LineItemsBulkActions,
  AddRow: LineItemsAddRow,
  FullscreenToggle: LineItemsFullscreenToggle,
  SaveActions: LineItemsSaveActions,
};
