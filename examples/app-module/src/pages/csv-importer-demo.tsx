import {
  defineResource,
  Layout,
  Button,
  CsvImporter,
  useCsvImporter,
  csv,
  type CellError,
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
      // Simulate server-side validation (uniqueness check on SKU)
      await new Promise((resolve) => setTimeout(resolve, 500));
      const errors: CellError[] = [];
      const seenSkus = new Map<string, number>();
      for (const row of rows) {
        const sku = row.data.sku;
        if (typeof sku === "string" && sku !== "") {
          const prevIndex = seenSkus.get(sku);
          if (prevIndex !== undefined) {
            errors.push({
              rowIndex: row.rowIndex,
              columnKey: "sku",
              level: "error",
              message: `Duplicate SKU "${sku}" (same as row ${prevIndex + 1})`,
            });
          } else {
            seenSkus.set(sku, row.rowIndex);
          }
        }
      }
      return errors;
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
