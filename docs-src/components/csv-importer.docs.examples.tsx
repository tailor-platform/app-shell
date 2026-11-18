import { useState } from "react";
import { Button, CsvImporter, csv, useCsvImporter } from "@tailor-platform/app-shell";

export function ProductImport() {
  const [summary, setSummary] = useState("");
  const { open, props } = useCsvImporter({
    schema: {
      columns: [
        {
          key: "name",
          label: "Name",
          required: true,
          aliases: ["product_name"],
          schema: csv.string({ min: 1 }),
        },
        {
          key: "price",
          label: "Price",
          schema: csv.number({ min: 0 }),
        },
        {
          key: "active",
          label: "Active",
          schema: csv.boolean(),
        },
      ],
    },
    onImport: (event) => {
      setSummary(JSON.stringify(event.summary, null, 2));
    },
  });

  return (
    <div className="flex flex-col items-start gap-4">
      <Button onClick={open}>Import CSV</Button>
      <CsvImporter {...props} />
      <output className="whitespace-pre-wrap">{summary || "No CSV imported yet."}</output>
    </div>
  );
}
