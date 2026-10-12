import { cn } from "@/lib/utils";

export type LineItemsSkeletonRowProps = {
  /** Seeds the per-cell bar width so stacked rows do not align into columns. */
  rowIndex: number;
  columnCount: number;
  rowHeight: number;
};

/** One placeholder row shown while an initial fetch is in flight. */
export function LineItemsSkeletonRow({
  rowIndex,
  columnCount,
  rowHeight,
}: LineItemsSkeletonRowProps) {
  return (
    <tr
      data-slot="line-items-skeleton-row"
      aria-hidden="true"
      style={{ height: rowHeight }}
      className="astw:border-b astw:border-border"
    >
      {Array.from({ length: columnCount }, (_, col) => (
        <td key={col} className="astw:px-2">
          <span
            className={cn("astw:block astw:h-3 astw:animate-pulse astw:rounded astw:bg-muted")}
            style={{ width: `${45 + ((rowIndex * 13 + col * 17) % 40)}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

LineItemsSkeletonRow.displayName = "LineItems.SkeletonRow";
