import type { Column, DataTableFilterConfig } from "../types";

type FilterableColumn = Column<Record<string, unknown>> & {
  filter: DataTableFilterConfig;
};

export type { FilterableColumn };
