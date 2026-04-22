import { describe, it, expect } from "vitest";
import { appShellPlugin } from "./metadata-plugin";

/**
 * Minimal mock for TailorDBReadyContext.
 * We only need the fields that the plugin reads.
 */
function createMockContext(
  types: Record<
    string,
    {
      name: string;
      pluralForm: string;
      description?: string;
      fields: Record<
        string,
        {
          name: string;
          config: {
            type: string;
            required?: boolean;
            description?: string;
            array?: boolean;
            allowedValues?: { value: string }[];
            rawRelation?: {
              type: string;
              toward: { type: string; as?: string };
              backward?: string;
            };
          };
          relation?: {
            targetType: string;
            forwardName: string;
            backwardName: string;
            key: string;
            unique: boolean;
          };
        }
      >;
      forwardRelationships: Record<
        string,
        {
          name: string;
          targetType: string;
          targetField: string;
          sourceField: string;
          isArray: boolean;
          description: string;
        }
      >;
      backwardRelationships: Record<
        string,
        {
          name: string;
          targetType: string;
          targetField: string;
          sourceField: string;
          isArray: boolean;
          description: string;
        }
      >;
      settings: { pluralForm?: string };
      permissions: {};
    }
  >,
) {
  return {
    tailordb: [
      {
        namespace: "test",
        types,
        sourceInfo: new Map(),
        pluginAttachments: new Map(),
      },
    ],
    baseDir: "/tmp",
    configPath: "/tmp/tailor.config.ts",
    pluginConfig: {},
  };
}

describe("appShellPlugin", () => {
  it("returns a plugin with correct id and description", () => {
    const plugin = appShellPlugin();
    expect(plugin.id).toBe("app-shell-metadata");
    expect(plugin.description).toContain("AppShell");
  });

  it("generates metadata for simple types", () => {
    const plugin = appShellPlugin({ dataTable: { metadataOutputPath: "out.ts" } });
    const context = createMockContext({
      Order: {
        name: "Order",
        pluralForm: "Orders",
        description: "Purchase orders",
        fields: {
          id: {
            name: "id",
            config: { type: "uuid", required: true },
          },
          title: {
            name: "title",
            config: {
              type: "string",
              required: true,
              description: "Order title",
            },
          },
          amount: {
            name: "amount",
            config: { type: "float", required: false },
          },
          isActive: {
            name: "isActive",
            config: { type: "boolean", required: false },
          },
        },
        forwardRelationships: {},
        backwardRelationships: {},
        settings: {},
        permissions: {},
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = plugin.onTailorDBReady!(context as any);
    expect(result).toEqual({
      files: [
        {
          path: "out.ts",
          content: expect.stringContaining("export const tableMetadata"),
        },
      ],
    });

    const content = (result as { files: { content: string }[] }).files[0].content;
    expect(content).toContain('"order"');
    expect(content).toContain('"orders"');
    expect(content).toContain('"Purchase orders"');
    expect(content).toContain('"Order title"');

    // Parse the generated metadata
    const metadataMatch = content.match(/export const tableMetadata = ({[\s\S]*?}) as const;/);
    expect(metadataMatch).not.toBeNull();
    const metadata = JSON.parse(metadataMatch![1]);

    expect(metadata.order).toBeDefined();
    expect(metadata.order.name).toBe("order");
    expect(metadata.order.pluralForm).toBe("orders");
    expect(metadata.order.description).toBe("Purchase orders");
    expect(metadata.order.fields).toHaveLength(4);

    const titleField = metadata.order.fields.find((f: { name: string }) => f.name === "title");
    expect(titleField).toEqual({
      name: "title",
      type: "string",
      required: true,
      description: "Order title",
    });

    const amountField = metadata.order.fields.find((f: { name: string }) => f.name === "amount");
    expect(amountField).toEqual({
      name: "amount",
      type: "number",
      required: false,
    });
  });

  it("maps field types correctly", () => {
    const plugin = appShellPlugin();
    const context = createMockContext({
      TestType: {
        name: "TestType",
        pluralForm: "TestTypes",
        fields: {
          intField: {
            name: "intField",
            config: { type: "integer", required: false },
          },
          floatField: {
            name: "floatField",
            config: { type: "float", required: false },
          },
          decimalField: {
            name: "decimalField",
            config: { type: "decimal", required: false },
          },
          dateField: {
            name: "dateField",
            config: { type: "date", required: false },
          },
          dtField: {
            name: "dtField",
            config: { type: "datetime", required: false },
          },
          arrayField: {
            name: "arrayField",
            config: { type: "string", required: false, array: true },
          },
        },
        forwardRelationships: {},
        backwardRelationships: {},
        settings: {},
        permissions: {},
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = plugin.onTailorDBReady!(context as any);
    const content = (result as { files: { content: string }[] }).files[0].content;
    const metadata = JSON.parse(
      content.match(/export const tableMetadata = ({[\s\S]*?}) as const;/)![1],
    );
    const fields = metadata.testType.fields;

    expect(fields.find((f: { name: string }) => f.name === "intField").type).toBe("number");
    expect(fields.find((f: { name: string }) => f.name === "floatField").type).toBe("number");
    expect(fields.find((f: { name: string }) => f.name === "decimalField").type).toBe("number");
    expect(fields.find((f: { name: string }) => f.name === "dateField").type).toBe("date");
    expect(fields.find((f: { name: string }) => f.name === "dtField").type).toBe("datetime");

    const arrayField = fields.find((f: { name: string }) => f.name === "arrayField");
    expect(arrayField.type).toBe("array");
    expect(arrayField.arrayItemType).toBe("string");
  });

  it("handles enum fields", () => {
    const plugin = appShellPlugin();
    const context = createMockContext({
      Item: {
        name: "Item",
        pluralForm: "Items",
        fields: {
          status: {
            name: "status",
            config: {
              type: "enum",
              required: true,
              allowedValues: [{ value: "DRAFT" }, { value: "ACTIVE" }, { value: "ARCHIVED" }],
            },
          },
        },
        forwardRelationships: {},
        backwardRelationships: {},
        settings: {},
        permissions: {},
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = plugin.onTailorDBReady!(context as any);
    const content = (result as { files: { content: string }[] }).files[0].content;
    const metadata = JSON.parse(
      content.match(/export const tableMetadata = ({[\s\S]*?}) as const;/)![1],
    );

    const statusField = metadata.item.fields[0];
    expect(statusField.type).toBe("enum");
    expect(statusField.enumValues).toEqual(["DRAFT", "ACTIVE", "ARCHIVED"]);
  });

  it("handles manyToOne relationships", () => {
    const plugin = appShellPlugin();
    const context = createMockContext({
      OrderItem: {
        name: "OrderItem",
        pluralForm: "OrderItems",
        fields: {
          id: {
            name: "id",
            config: { type: "uuid", required: true },
          },
          orderId: {
            name: "orderId",
            config: {
              type: "uuid",
              required: true,
              rawRelation: {
                type: "n-1",
                toward: { type: "Order", as: "order" },
                backward: "orderItems",
              },
            },
          },
        },
        forwardRelationships: {
          order: {
            name: "order",
            targetType: "Order",
            targetField: "id",
            sourceField: "orderId",
            isArray: false,
            description: "",
          },
        },
        backwardRelationships: {},
        settings: {},
        permissions: {},
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = plugin.onTailorDBReady!(context as any);
    const content = (result as { files: { content: string }[] }).files[0].content;
    const metadata = JSON.parse(
      content.match(/export const tableMetadata = ({[\s\S]*?}) as const;/)![1],
    );

    // Field-level relation
    const orderIdField = metadata.orderItem.fields.find(
      (f: { name: string }) => f.name === "orderId",
    );
    expect(orderIdField.relation).toEqual({
      fieldName: "order",
      targetTable: "order",
    });

    // Table-level relation
    expect(metadata.orderItem.relations).toHaveLength(1);
    expect(metadata.orderItem.relations[0]).toEqual({
      fieldName: "order",
      targetTable: "order",
      relationType: "manyToOne",
      foreignKeyField: "orderId",
    });
  });

  it("handles oneToOne relationships", () => {
    const plugin = appShellPlugin();
    const context = createMockContext({
      User: {
        name: "User",
        pluralForm: "Users",
        fields: {
          id: {
            name: "id",
            config: { type: "uuid", required: true },
          },
          profileId: {
            name: "profileId",
            config: {
              type: "uuid",
              required: true,
              rawRelation: {
                type: "1-1",
                toward: { type: "Profile" },
              },
            },
          },
        },
        forwardRelationships: {
          profile: {
            name: "profile",
            targetType: "Profile",
            targetField: "id",
            sourceField: "profileId",
            isArray: false,
            description: "",
          },
        },
        backwardRelationships: {},
        settings: {},
        permissions: {},
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = plugin.onTailorDBReady!(context as any);
    const content = (result as { files: { content: string }[] }).files[0].content;
    const metadata = JSON.parse(
      content.match(/export const tableMetadata = ({[\s\S]*?}) as const;/)![1],
    );

    expect(metadata.user.relations[0].relationType).toBe("oneToOne");
    expect(metadata.user.relations[0].foreignKeyField).toBe("profileId");
  });

  it("handles backward (oneToMany) relationships", () => {
    const plugin = appShellPlugin();
    const context = createMockContext({
      Order: {
        name: "Order",
        pluralForm: "Orders",
        fields: {
          id: {
            name: "id",
            config: { type: "uuid", required: true },
          },
        },
        forwardRelationships: {},
        backwardRelationships: {
          orderItems: {
            name: "orderItems",
            targetType: "OrderItem",
            targetField: "orderId",
            sourceField: "orderId",
            isArray: true,
            description: "",
          },
        },
        settings: {},
        permissions: {},
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = plugin.onTailorDBReady!(context as any);
    const content = (result as { files: { content: string }[] }).files[0].content;
    const metadata = JSON.parse(
      content.match(/export const tableMetadata = ({[\s\S]*?}) as const;/)![1],
    );

    expect(metadata.order.relations).toHaveLength(1);
    expect(metadata.order.relations[0]).toEqual({
      fieldName: "orderItems",
      targetTable: "orderItem",
      relationType: "oneToMany",
      foreignKeyField: "orderId",
    });
  });

  it("generates tableNames export", () => {
    const plugin = appShellPlugin();
    const context = createMockContext({
      Order: {
        name: "Order",
        pluralForm: "Orders",
        fields: {},
        forwardRelationships: {},
        backwardRelationships: {},
        settings: {},
        permissions: {},
      },
      Product: {
        name: "Product",
        pluralForm: "Products",
        fields: {},
        forwardRelationships: {},
        backwardRelationships: {},
        settings: {},
        permissions: {},
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = plugin.onTailorDBReady!(context as any);
    const content = (result as { files: { content: string }[] }).files[0].content;

    expect(content).toContain("export const tableNames");
    expect(content).toContain('"order"');
    expect(content).toContain('"product"');
    expect(content).toContain("export type TableName");
  });

  it("uses default metadataOutputPath", () => {
    const plugin = appShellPlugin();
    const context = createMockContext({
      Foo: {
        name: "Foo",
        pluralForm: "Foos",
        fields: {},
        forwardRelationships: {},
        backwardRelationships: {},
        settings: {},
        permissions: {},
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = plugin.onTailorDBReady!(context as any);
    expect((result as { files: { path: string }[] }).files[0].path).toBe(
      "app-shell-datatable.generated.ts",
    );
  });

  it("handles multiple namespaces", () => {
    const plugin = appShellPlugin();
    const context = {
      tailordb: [
        {
          namespace: "ns1",
          types: {
            Order: {
              name: "Order",
              pluralForm: "Orders",
              fields: {
                id: {
                  name: "id",
                  config: { type: "uuid", required: true },
                },
              },
              forwardRelationships: {},
              backwardRelationships: {},
              settings: {},
              permissions: {},
            },
          },
          sourceInfo: new Map(),
          pluginAttachments: new Map(),
        },
        {
          namespace: "ns2",
          types: {
            Product: {
              name: "Product",
              pluralForm: "Products",
              fields: {
                id: {
                  name: "id",
                  config: { type: "uuid", required: true },
                },
              },
              forwardRelationships: {},
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
      pluginConfig: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = plugin.onTailorDBReady!(context as any);
    const content = (result as { files: { content: string }[] }).files[0].content;
    const metadata = JSON.parse(
      content.match(/export const tableMetadata = ({[\s\S]*?}) as const;/)![1],
    );

    expect(Object.keys(metadata)).toEqual(["order", "product"]);
  });

  it("omits relations array when no relations exist", () => {
    const plugin = appShellPlugin();
    const context = createMockContext({
      Simple: {
        name: "Simple",
        pluralForm: "Simples",
        fields: {
          name: {
            name: "name",
            config: { type: "string", required: true },
          },
        },
        forwardRelationships: {},
        backwardRelationships: {},
        settings: {},
        permissions: {},
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = plugin.onTailorDBReady!(context as any);
    const content = (result as { files: { content: string }[] }).files[0].content;
    const metadata = JSON.parse(
      content.match(/export const tableMetadata = ({[\s\S]*?}) as const;/)![1],
    );

    expect(metadata.simple.relations).toBeUndefined();
  });
});
