import { describe, expect, it } from "vitest";
import {
  definePlugins,
  type TailorDBReadyContext as SdkV2TailorDBReadyContext,
} from "@tailor-platform/sdk";
import { appShellPlugin, type AppShellPluginOptions } from "./plugin";

describe("appShellPlugin sdk v2 compatibility", () => {
  it("registers with definePlugins and handles tailordb.tables", () => {
    const [registeredPlugin] = definePlugins(
      appShellPlugin({
        dataTable: { metadataOutputPath: "out.ts" },
      }) as Parameters<typeof definePlugins>[0],
    );

    const context = {
      tailordb: [
        {
          namespace: "test",
          tables: {
            Order: {
              name: "Order",
              pluralForm: "Orders",
              description: "Purchase orders",
              fields: {
                id: {
                  name: "id",
                  config: { type: "uuid", required: true },
                },
                customerId: {
                  name: "customerId",
                  config: {
                    type: "uuid",
                    required: true,
                    rawRelation: {
                      type: "manyToOne",
                      toward: { table: "Customer", as: "customer" },
                    },
                  },
                },
              },
              forwardRelationships: {
                customer: {
                  name: "customer",
                  targetType: "Customer",
                  targetField: "id",
                  sourceField: "customerId",
                  isArray: false,
                  description: "",
                },
              },
              backwardRelationships: {},
              settings: {},
              permissions: {},
            },
          },
          sourceInfo: new Map(),
          pluginAttachments: new Map(),
        },
      ],
      baseDir: "/tmp",
      configPath: "/tmp/tailor.config.ts",
      pluginConfig: {
        dataTable: { metadataOutputPath: "out.ts" },
      },
    } satisfies SdkV2TailorDBReadyContext<AppShellPluginOptions>;

    const result = registeredPlugin.onTailorDBReady?.(context);
    expect(result).toEqual({
      files: [
        {
          path: "out.ts",
          content: expect.stringContaining('"order"'),
        },
      ],
    });

    const content = (result as { files: { content: string }[] }).files[0].content;
    expect(content).toContain('"customer"');
    expect(content).toContain('"relations"');
  });
});
