import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/input";
import { Text } from "@/components/text";
import { cn } from "@/lib/utils";
import { useLineItemsContext } from "./line-items-context";
import { useLineItemsT } from "./i18n";

export type LineItemsSearchProps = {
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
};

/** Incremental in-memory search, sharing the Root's presentation state. */
export function LineItemsSearch({
  className,
  placeholder,
  "aria-label": label,
}: LineItemsSearchProps) {
  const value = useLineItemsContext<Record<string, unknown>>("LineItems.Search");
  const t = useLineItemsT();
  return (
    <div
      data-slot="line-items-search"
      className={cn("astw:relative astw:min-w-0 astw:w-64 astw:max-w-full", className)}
    >
      <SearchIcon
        aria-hidden="true"
        className="astw:pointer-events-none astw:absolute astw:top-1/2 astw:left-2 astw:size-3.5 astw:-translate-y-1/2 astw:text-muted-foreground"
      />
      <Input
        type="text"
        value={value.searchQuery}
        onChange={(event) => value.setSearchQuery(event.target.value)}
        placeholder={placeholder ?? t("searchPlaceholder")}
        aria-label={label ?? t("search")}
        className="astw:h-7 astw:pl-7 astw:text-body-md"
      />
      <Text variant="body-sm" render={<output aria-live="polite" />} className="astw:sr-only">
        {t("searchResults", { count: value.lines.length, total: value.allLines.length })}
      </Text>
    </div>
  );
}
LineItemsSearch.displayName = "LineItems.Search";
