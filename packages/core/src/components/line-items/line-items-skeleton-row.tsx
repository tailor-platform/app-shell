/**
 * Internal skeleton row for `LineItems.Table` — renders a `<tr>` with one
 * `<td>` per column whose width is constrained by the table's `<colgroup>`.
 * Each cell hosts a `bg-muted` bar with `animate-pulse`. Bar widths are
 * deterministically varied per column index so a stack of skeleton rows feels
 * less mechanical than identical bars.
 */
export function LineItemsSkeletonRow({
  colCount,
  rowHeight,
  rowIndex,
}: {
  colCount: number;
  rowHeight: number;
  /** 0-indexed row position; used to vary the deterministic bar widths so
      stacked skeleton rows don't all align identically. */
  rowIndex: number;
}) {
  return (
    <tr aria-hidden data-slot="line-items-skeleton-row" style={{ height: rowHeight }}>
      {Array.from({ length: colCount }, (_, i) => {
        // Pseudo-random but stable: vary bar width by (row, col) so the
        // skeleton doesn't look like a perfectly aligned grid.
        const variance = ((rowIndex * 13 + i * 17) % 40) - 20; // -20..+19
        const widthPct = 55 + variance; // 35%..74%
        return (
          <td
            key={i}
            style={{ height: rowHeight, padding: 0 }}
            className="astw:border-b astw:border-border astw:px-2 astw:align-middle"
          >
            <div
              className="astw:h-3 astw:rounded astw:bg-muted astw:animate-pulse"
              style={{ width: `${widthPct}%` }}
            />
          </td>
        );
      })}
    </tr>
  );
}
LineItemsSkeletonRow.displayName = "LineItems.SkeletonRow";
