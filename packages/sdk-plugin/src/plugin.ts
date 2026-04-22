import type { Plugin, TailorDBReadyContext } from "@tailor-platform/sdk";
import type {
  FieldType,
  FieldMetadata,
  TableMetadata,
} from "@tailor-platform/app-shell";

/**
 * Options for the AppShell plugin.
 */
export interface AppShellPluginOptions {
  dataTable?: {
    /**
     * Output file path for generated DataTable metadata (relative to project root).
     * @default "app-shell-datatable.generated.ts"
     */
    metadataOutputPath?: string;
  };
}

/**
 * Map TailorDB field type to AppShell FieldType.
 */
function mapFieldType(
  tailorType: string,
  isArray?: boolean,
): { type: FieldType; arrayItemType?: FieldType } {
  const typeMap: Record<string, FieldType> = {
    string: "string",
    integer: "number",
    float: "number",
    decimal: "number",
    boolean: "boolean",
    uuid: "uuid",
    datetime: "datetime",
    date: "date",
    time: "time",
    enum: "enum",
    nested: "nested",
    file: "file",
  };

  const mappedType = typeMap[tailorType] ?? "string";

  if (isArray) {
    return { type: "array", arrayItemType: mappedType };
  }

  return { type: mappedType };
}

/**
 * Convert PascalCase to camelCase.
 */
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Creates a Tailor Platform SDK plugin that generates table metadata
 * for AppShell's `inferColumns()` and `createColumnHelper()`.
 *
 * Register with `definePlugins()` in your `tailor.config.ts`:
 *
 * ```ts
 * import { definePlugins } from "@tailor-platform/sdk";
 * import { appShellPlugin } from "@tailor-platform/app-shell-sdk-plugin";
 *
 * export const plugins = definePlugins(
 *   appShellPlugin({
 *     dataTable: {
 *       metadataOutputPath: "src/generated/app-shell-datatable.generated.ts",
 *     },
 *   }),
 * );
 * ```
 *
 * Then run `tailor-sdk generate` to produce the metadata file.
 */
export function appShellPlugin(
  options: AppShellPluginOptions = {},
): Plugin<void, AppShellPluginOptions> {
  const { metadataOutputPath = "app-shell-datatable.generated.ts" } =
    options.dataTable ?? {};

  return {
    id: "app-shell-metadata",
    description:
      "Generates table metadata for AppShell DataTable (inferColumns, createColumnHelper)",
    pluginConfig: options,

    onTailorDBReady(context: TailorDBReadyContext<AppShellPluginOptions>) {
      const metadataMap: Record<string, TableMetadata> = {};

      for (const ns of context.tailordb) {
        for (const [_typeName, type] of Object.entries(ns.types)) {
          const fields: FieldMetadata[] = [];
          const relations: TableMetadata["relations"] extends
            | readonly (infer R)[]
            | undefined
            ? R[]
            : never = [];

          // Process fields
          for (const [fieldName, field] of Object.entries(type.fields)) {
            const config = field.config;
            const { type: fieldType, arrayItemType } = mapFieldType(
              config.type,
              config.array,
            );

            // Extract relation info from rawRelation
            let fieldRelation: FieldMetadata["relation"] | undefined;
            if (config.rawRelation) {
              const raw = config.rawRelation;
              const isForeignKey =
                raw.type === "manyToOne" ||
                raw.type === "n-1" ||
                raw.type === "N-1" ||
                raw.type === "oneToOne" ||
                raw.type === "1-1";

              if (isForeignKey && raw.toward) {
                const targetTableName = toCamelCase(raw.toward.type);
                const relationFieldName =
                  raw.toward.as ?? toCamelCase(raw.toward.type);
                fieldRelation = {
                  fieldName: relationFieldName,
                  targetTable: targetTableName,
                };
              }
            }

            // Enum values
            const enumValues =
              config.allowedValues && config.allowedValues.length > 0
                ? config.allowedValues.map((v) =>
                    typeof v === "string" ? v : v.value,
                  )
                : undefined;

            const fieldMetadata: FieldMetadata = {
              name: fieldName,
              type: fieldType,
              required: config.required ?? false,
              ...(config.description && { description: config.description }),
              ...(enumValues && { enumValues }),
              ...(arrayItemType && { arrayItemType }),
              ...(fieldRelation && { relation: fieldRelation }),
            };

            fields.push(fieldMetadata);
          }

          // Process forward relationships (manyToOne / oneToOne)
          for (const [relName, rel] of Object.entries(
            type.forwardRelationships ?? {},
          )) {
            const fkField = type.fields[rel.sourceField];
            const isOneToOne =
              fkField?.config.rawRelation?.type === "1-1" ||
              fkField?.config.rawRelation?.type === "oneToOne";

            relations.push({
              fieldName: relName,
              targetTable: toCamelCase(rel.targetType),
              relationType: isOneToOne ? "oneToOne" : "manyToOne",
              foreignKeyField: rel.sourceField,
            });
          }

          // Process backward relationships (oneToMany)
          for (const [relName, rel] of Object.entries(
            type.backwardRelationships ?? {},
          )) {
            relations.push({
              fieldName: relName,
              targetTable: toCamelCase(rel.targetType),
              relationType: "oneToMany",
              foreignKeyField: rel.sourceField,
            });
          }

          const camelName = toCamelCase(type.name);
          metadataMap[camelName] = {
            name: camelName,
            pluralForm: toCamelCase(type.pluralForm),
            ...(type.description && { description: type.description }),
            fields,
            ...(relations.length > 0 && { relations }),
          };
        }
      }

      const content = [
        "// This file is auto-generated by app-shell-metadata plugin",
        "// Do not edit manually",
        "",
        `export const tableMetadata = ${JSON.stringify(metadataMap, null, 2)} as const;`,
        "",
        `export const tableNames = ${JSON.stringify(Object.keys(metadataMap), null, 2)} as const;`,
        "",
        `export type TableName = (typeof tableNames)[number];`,
        "",
      ].join("\n");

      return {
        files: [{ path: metadataOutputPath, content }],
      };
    },
  };
}
