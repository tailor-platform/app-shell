# @tailor-platform/app-shell-sdk-plugin

## 0.1.0

### Minor Changes

- 3f31e8a: Initial release of `@tailor-platform/app-shell-sdk-plugin`.

  A companion SDK plugin that generates `tableMetadata` from TailorDB type definitions for use with `@tailor-platform/app-shell`'s `DataTable` component and `createColumnHelper`.

  Register the plugin in `tailor.config.ts`:

  ```ts
  import { definePlugins } from "@tailor-platform/sdk";
  import { appShellPlugin } from "@tailor-platform/app-shell-sdk-plugin";

  export const plugins = definePlugins(
    appShellPlugin({
      dataTable: {
        metadataOutputPath: "src/generated/app-shell-datatable.generated.ts",
      },
    })
  );
  ```

  Then run `tailor-sdk generate` to produce the metadata file, and pass `tableMetadata` to `inferColumns`:

  ```ts
  import { tableMetadata } from "@/generated/app-shell-datatable.generated";
  import { createColumnHelper } from "@tailor-platform/app-shell";

  const { column, inferColumns } = createColumnHelper<Order>();
  const infer = inferColumns(tableMetadata.order);

  const columns = [
    column(infer("title")),     // string column    → text filter
    column(infer("status")),    // enum column       → dropdown filter with generated values
    column(infer("createdAt")), // datetime column   → date picker filter
  ];
  ```
