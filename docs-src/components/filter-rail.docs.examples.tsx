import {
  Button,
  DataTable,
  FilterRail,
  Text,
  useCollectionVariables,
  useDataTable,
  useFilterRailLayout,
  type FilterRailSection,
} from "@tailor-platform/app-shell";

export function BasicUsage() {
  type Product = { id: string; name: string; category: string; status: string };
  const { variables, control } = useCollectionVariables({});
  const sections: FilterRailSection<keyof Product & string>[] = [
    {
      id: "category",
      label: "Category",
      control: "checkbox",
      field: "category",
      truncate: 2,
      options: ["Packaging", "Storage", "Office"].map((value) => ({ value, label: value })),
    },
    {
      id: "status",
      label: "Status",
      control: "radio",
      field: "status",
      options: ["Draft", "Published"].map((value) => ({ value, label: value })),
    },
  ];
  const products: Product[] = [
    { id: "1", name: "Small carton", category: "Packaging", status: "Published" },
    { id: "2", name: "Storage box", category: "Storage", status: "Draft" },
    { id: "3", name: "Desk organizer", category: "Office", status: "Published" },
  ];
  const rows = products.filter((row) =>
    control.filters.every((filter) => {
      if (filter.field === "category")
        return Array.isArray(filter.value) && filter.value.includes(row.category);
      if (filter.field === "status") return row.status === filter.value;
      return false;
    }),
  );
  const table = useDataTable<Product>({
    columns: [
      { id: "name", label: "Product", type: "text" },
      { id: "status", label: "Status", type: "badge" },
    ],
    data: { rows },
    control,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 lg:flex-row">
        <FilterRail.Root control={control} sections={sections} className="lg:w-56 lg:shrink-0">
          <FilterRail.Header title="Product filters">
            <FilterRail.ClearAll>Clear product filters</FilterRail.ClearAll>
          </FilterRail.Header>
          <FilterRail.Sections />
        </FilterRail.Root>
        <div className="min-w-0 flex-1">
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        </div>
      </div>
      <Text.p role="status">Matching products: {rows.length}</Text.p>
      <pre className="overflow-x-auto text-sm">
        {JSON.stringify(variables.query ?? {}, null, 2)}
      </pre>
    </div>
  );
}

export function SectionControls() {
  const { variables, control } = useCollectionVariables({});
  const sections: FilterRailSection[] = [
    {
      id: "name",
      label: "Product name",
      control: "text",
      field: "name",
      operator: "contains",
      placeholder: "Search product names...",
    },
    {
      id: "available",
      label: "Availability",
      control: "boolean",
      field: "available",
      trueLabel: "In stock",
      falseLabel: "Out of stock",
    },
    {
      id: "price",
      label: "Price",
      control: "numberRange",
      field: "price",
      min: 0,
      step: 1,
      unit: "USD",
    },
    {
      id: "delivery",
      label: "Deliver on or after",
      control: "date",
      field: "delivery",
      operator: "gte",
    },
    {
      id: "ordered",
      label: "Order period",
      control: "dateRange",
      field: "ordered",
      presets: [{ label: "April 2026", from: "2026-04-01", to: "2026-04-30" }],
    },
    {
      id: "stock",
      label: "Custom stock filter",
      control: "custom",
      fields: ["stock"],
      render: ({ getFilter, setFilter }) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-pressed={getFilter("stock") !== undefined}
          onClick={() =>
            setFilter(
              "stock",
              getFilter("stock") ? null : { operator: "between", value: { min: 1, max: 20 } },
            )
          }
        >
          Low stock: 1–20
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Text.p>
        This playground shows generated query values; it does not fetch or filter records.
      </Text.p>
      <FilterRail.Root control={control} sections={sections} className="max-h-[36rem] max-w-sm">
        <FilterRail.Header title="Section controls">
          <FilterRail.ClearAll>Clear control filters</FilterRail.ClearAll>
        </FilterRail.Header>
        <FilterRail.Sections />
      </FilterRail.Root>
      <pre role="status" className="overflow-x-auto text-sm">
        {JSON.stringify(variables.query ?? {}, null, 2)}
      </pre>
    </div>
  );
}

export function LayoutAndResponsive() {
  const { variables, control } = useCollectionVariables({});
  const layout = useFilterRailLayout("docs:filter-rail:layout-example");
  const sections: FilterRailSection[] = [
    {
      id: "category",
      label: "Category",
      control: "checkbox",
      field: "category",
      options: ["Storage", "Office", "Packaging"].map((value) => ({ value, label: value })),
    },
    {
      id: "status",
      label: "Status",
      control: "radio",
      field: "status",
      options: ["Draft", "Published"].map((value) => ({ value, label: value })),
    },
    {
      id: "available",
      label: "Availability",
      control: "boolean",
      field: "available",
      defaultCollapsed: true,
    },
  ];

  return (
    <FilterRail.Provider control={control} sections={sections} layout={layout}>
      <div className="space-y-3">
        <Text.p>
          Use settings to hide, reorder, or sort sections. Narrow the browser below 1024px to open
          the same rail in a sheet.
        </Text.p>
        <FilterRail.Trigger>Open demo filters</FilterRail.Trigger>
        <FilterRail.Root className="max-w-sm">
          <FilterRail.Header title="Configurable filters">
            <FilterRail.ClearAll>Clear layout filters</FilterRail.ClearAll>
            <FilterRail.Settings />
          </FilterRail.Header>
          <FilterRail.Sections />
        </FilterRail.Root>
        <pre role="status" className="overflow-x-auto text-sm">
          {JSON.stringify({ layout: layout.value, query: variables.query ?? {} }, null, 2)}
        </pre>
      </div>
    </FilterRail.Provider>
  );
}
