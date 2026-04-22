# @tailor-platform/app-shell-sdk-plugin

Tailor Platform SDK plugin that generates `tableMetadata` from TailorDB type definitions for use with `@tailor-platform/app-shell`'s `DataTable` component.

## What it does

`tableMetadata` bridges your TailorDB schema to the DataTable. It tells `inferColumns` how to render and filter each field — for example, which fields get a date picker, which get an enum dropdown (and with what options), and which are numeric. Without it, you would need to declare all of this manually per column.

The metadata is generated at SDK code-gen time from your TailorDB type definitions, so it stays in sync with your schema automatically.

## Installation

```sh
pnpm add -D @tailor-platform/app-shell-sdk-plugin
```

## Setup

Register the plugin in `tailor.config.ts`:

```ts
import { definePlugins } from "@tailor-platform/sdk";
import { appShellPlugin } from "@tailor-platform/app-shell-sdk-plugin";

export const plugins = definePlugins(
  appShellPlugin({
    dataTable: {
      metadataOutputPath: "src/generated/app-shell-datatable.generated.ts",
    },
  }),
);
```

Then run `tailor-sdk generate` to produce the metadata file.

## Usage

Pass `tableMetadata` to `inferColumns` to get type-safe column definitions with filter editors automatically configured:

```ts
import { tableMetadata } from "@/generated/app-shell-datatable.generated";
import { createColumnHelper } from "@tailor-platform/app-shell";

const { column, inferColumns } = createColumnHelper<Order>();
const infer = inferColumns(tableMetadata.order);

const columns = [
  column(infer("title")),       // string column    → text filter
  column(infer("status")),      // enum column      → dropdown filter with generated values
  column(infer("createdAt")),   // datetime column  → date picker filter
];
```

For full `DataTable` usage, see [`@tailor-platform/app-shell`](../core/README.md).
