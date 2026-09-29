import {
  Layout,
  Button,
  CsvExporter,
  CsvImporter,
  useCsvExporter,
  useCsvImporter,
  csv,
  type CsvCellIssue,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";

type Product = {
  name: string;
  sku: string;
  price: number;
  quantity: number;
  category: string;
};

const PRODUCTS: Product[] = [
  { name: "Office chair", sku: "CHAIR-001", price: 249, quantity: 18, category: "Furniture" },
  { name: "Desk lamp", sku: "LAMP-002", price: 79, quantity: 42, category: "Lighting" },
  { name: "Monitor arm", sku: "ARM-003", price: 129, quantity: 9, category: "Accessories" },
];

const CsvFeaturesDemoPage = () => {
  const { open: openImporter, props: importerProps } = useCsvImporter({
    schema: {
      columns: [
        {
          key: "name",
          label: "Product Name",
          description: "The name of the product",
          required: true,
          aliases: ["product_name", "productName", "Product"],
          schema: csv.string({ min: 1 }),
        },
        {
          key: "sku",
          label: "SKU",
          description: "Stock keeping unit",
          required: true,
          aliases: ["product_sku", "item_code"],
          schema: csv.string({ min: 1 }),
        },
        {
          key: "price",
          label: "Price",
          description: "Unit price (number)",
          required: true,
          aliases: ["unit_price", "unitPrice"],
          schema: csv.number({ min: 0 }),
        },
        {
          key: "quantity",
          label: "Quantity",
          description: "Stock quantity (integer)",
          aliases: ["qty", "stock"],
          schema: csv.number({ integer: true, min: 0 }),
        },
        {
          key: "category",
          label: "Category",
          description: "Product category",
          aliases: ["product_category", "type"],
        },
      ],
    },
    onValidate: async (rows) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const errors: CsvCellIssue[] = [];
      const seenSkus = new Map<string, number>();
      for (const row of rows) {
        const sku = row.data.sku;
        if (typeof sku !== "string" || sku === "") continue;
        const previousRow = seenSkus.get(sku);
        if (previousRow === undefined) {
          seenSkus.set(sku, row.rowIndex);
        } else {
          errors.push({
            rowIndex: row.rowIndex,
            columnKey: "sku",
            level: "error",
            message: `Duplicate SKU "${sku}" (same as row ${previousRow + 1})`,
          });
        }
      }
      return errors;
    },
    onImport: async (event) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      alert(`Imported ${event.summary.totalRows} products`);
      console.log(await event.buildRows());
    },
  });

  const { open: openExporter, props: exporterProps } = useCsvExporter({
    defaultFilename: "products.csv",
    columns: [
      { header: "Product Name", value: (product: Product) => product.name },
      { header: "SKU", value: (product: Product) => product.sku },
      { header: "Price", value: (product: Product) => product.price },
      { header: "Quantity", value: (product: Product) => product.quantity },
      { header: "Category", value: (product: Product) => product.category },
    ],
    fetcher: async ({ first, after }) => {
      const start = after == null ? 0 : Number(after) + 1;
      const rows = PRODUCTS.slice(start, start + first);
      const end = start + rows.length;
      return {
        edges: rows.map((node) => ({ node })),
        pageInfo: {
          hasNextPage: end < PRODUCTS.length,
          endCursor: rows.length > 0 ? String(end - 1) : null,
        },
        total: PRODUCTS.length,
      };
    },
  });

  return (
    <Layout>
      <Layout.Header title="CSV Features" />
      <Layout.Column>
        <div className="mb-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
          Import products through a guided validation flow, or download the same data through a
          client-side cursor export.
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">CSV Import</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload, map columns, review validation issues, and import products.
            </p>
            <Button className="mt-4" onClick={openImporter}>
              Import CSV
            </Button>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">CSV Export</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a filename, then download every product with progress and cancellation.
            </p>
            <Button className="mt-4" onClick={openExporter}>
              Export CSV
            </Button>
          </section>
        </div>

        <CsvImporter {...importerProps} />
        <CsvExporter {...exporterProps} />
      </Layout.Column>
    </Layout>
  );
};

CsvFeaturesDemoPage.appShellPageProps = {
  meta: {
    title: "CSV Features",
  },
} satisfies AppShellPageProps;

export default CsvFeaturesDemoPage;
