import {
  defineResource,
  Layout,
  Button,
  CsvImporter,
  useCsvImporter,
} from "@tailor-platform/app-shell";

const CsvImporterDemoPage = () => {
  const { open, props } = useCsvImporter({
    schema: {
      columns: [
        {
          key: "name",
          label: "Product Name",
          description: "The name of the product",
          required: true,
          aliases: ["product_name", "productName", "Product"],
        },
        {
          key: "sku",
          label: "SKU",
          description: "Stock keeping unit",
          required: true,
          aliases: ["product_sku", "item_code"],
        },
        {
          key: "price",
          label: "Price",
          description: "Unit price (number)",
          required: true,
          aliases: ["unit_price", "unitPrice"],
          transform: (raw) => {
            const n = Number(raw);
            if (Number.isNaN(n)) throw new Error(`"${raw}" is not a valid number`);
            return n;
          },
          rules: [
            {
              validate: (value) =>
                typeof value === "number" && value > 0
                  ? undefined
                  : "Price must be a positive number",
            },
          ],
        },
        {
          key: "quantity",
          label: "Quantity",
          description: "Stock quantity (integer)",
          aliases: ["qty", "stock"],
          transform: (raw) => {
            const n = Number(raw);
            if (Number.isNaN(n) || !Number.isInteger(n))
              throw new Error(`"${raw}" is not a valid integer`);
            return n;
          },
          rules: [
            {
              validate: (value) =>
                typeof value === "number" && value >= 0
                  ? undefined
                  : "Quantity must be a non-negative integer",
            },
          ],
        },
        {
          key: "category",
          label: "Category",
          description: "Product category",
          aliases: ["product_category", "type"],
        },
      ],
    },
    onImport: async (event) => {
      // Simulate async import
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert(
        `Imported ${event.summary.totalRows} rows (${event.summary.validRows} valid, ${event.summary.correctedRows} corrected, ${event.summary.warningRows} warnings)`,
      );
    },
  });

  return (
    <Layout>
      <Layout.Header title="CSV Importer Demo" />
      <Layout.Column>
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "0.75rem",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
            color: "var(--card-foreground)",
          }}
        >
          <h3 style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>CSV Importer</h3>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--muted-foreground)",
              marginBottom: "1rem",
            }}
          >
            A multi-step CSV import wizard: upload a file, map columns to a schema, review &amp; fix
            validation issues, then import. Uses <code>useCsvImporter</code> hook for state
            management.
          </p>
          <Button onClick={open}>Import CSV</Button>
        </div>
        <CsvImporter {...props} />
      </Layout.Column>
    </Layout>
  );
};

export const csvImporterDemoResource = defineResource({
  path: "csv-importer-demo",
  meta: {
    title: "CSV Importer Demo",
  },
  component: CsvImporterDemoPage,
});
