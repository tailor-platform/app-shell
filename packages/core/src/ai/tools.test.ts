import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import { aiProviderTool, defineAIChatTool } from "./tools";

describe("AI chat tool helpers", () => {
  it("accepts Zod schemas for local tool definitions", async () => {
    const lookupCustomer = defineAIChatTool({
      description: "Look up a customer",
      schema: z.object({
        customerId: z.string(),
        includeInactive: z.boolean().optional(),
      }),
      async execute({ customerId, includeInactive }) {
        return { customerId, includeInactive, name: "Acme" };
      },
    });

    expect(await lookupCustomer.schema["~standard"].validate({ customerId: "cust-1" })).toEqual({
      value: { customerId: "cust-1" },
    });
    expect(lookupCustomer.schema["~standard"].jsonSchema.input({ target: "draft-07" })).toEqual({
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        customerId: { type: "string" },
        includeInactive: { type: "boolean" },
      },
      required: ["customerId"],
    });

    await expect(
      lookupCustomer.execute(
        { customerId: "cust-1" },
        { signal: new AbortController().signal, messages: [] },
      ),
    ).resolves.toEqual({ customerId: "cust-1", includeInactive: undefined, name: "Acme" });
  });

  it("creates provider tool definitions", () => {
    expect(aiProviderTool.openai.webSearch({ searchContextSize: "high" })).toEqual({
      kind: "provider",
      provider: "openai",
      tool: "webSearch",
      options: { searchContextSize: "high" },
    });
  });
});
