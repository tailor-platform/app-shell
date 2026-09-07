import { describe, expect, it } from "vitest";
import { aiProviderTool, aiToolSchema, defineAIChatTool } from "./tools";

describe("aiToolSchema", () => {
  it("validates nested objects and generates json schema", async () => {
    const schema = aiToolSchema.object({
      city: aiToolSchema.string({ description: "City name" }),
      unit: aiToolSchema.optional(aiToolSchema.enum(["c", "f"])),
      tags: aiToolSchema.array(aiToolSchema.string()),
    });

    await expect(
      schema["~standard"].validate({ city: "Tokyo", unit: "c", tags: ["capital"] }),
    ).resolves.toEqual({
      value: {
        city: "Tokyo",
        unit: "c",
        tags: ["capital"],
      },
    });

    await expect(
      schema["~standard"].validate({ city: "Tokyo", unit: "k", tags: [] }),
    ).resolves.toEqual({
      issues: [{ message: "Must be one of: c, f", path: ["unit"] }],
    });

    expect(schema["~standard"].jsonSchema.input({ target: "draft-07" })).toEqual({
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
        unit: { type: "string", enum: ["c", "f"] },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["city", "tags"],
      additionalProperties: false,
    });
  });
});

describe("AI chat tool helpers", () => {
  it("creates local and provider tool definitions", async () => {
    const lookupCustomer = defineAIChatTool({
      description: "Look up a customer",
      schema: aiToolSchema.object({
        customerId: aiToolSchema.string(),
      }),
      async execute({ customerId }) {
        return { customerId, name: "Acme" };
      },
    });

    const webSearch = aiProviderTool.openai.webSearch({ searchContextSize: "high" });

    expect(lookupCustomer.kind).toBe("local");
    await expect(
      lookupCustomer.execute(
        { customerId: "cust-1" },
        { signal: new AbortController().signal, messages: [] },
      ),
    ).resolves.toEqual({ customerId: "cust-1", name: "Acme" });

    expect(webSearch).toEqual({
      kind: "provider",
      provider: "openai",
      tool: "webSearch",
      options: { searchContextSize: "high" },
    });
  });
});
