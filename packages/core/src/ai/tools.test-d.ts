import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod/v4";
import {
  defineAIChatTool,
  type AIGatewayChatRequest,
  type AILocalTool,
  type useAIChat,
} from "../index";

describe("local-only tool contract", () => {
  it("accepts only local tools in useAIChat", () => {
    type ConfiguredTool = NonNullable<Parameters<typeof useAIChat>[0]["tools"]>[string];

    expectTypeOf<ConfiguredTool>().toEqualTypeOf<AILocalTool>();
    expectTypeOf<ConfiguredTool["kind"]>().toEqualTypeOf<"local">();
  });

  it("accepts heterogeneous schemas without weakening schema or executor types", () => {
    const text = defineAIChatTool({
      schema: z.object({ value: z.string() }),
      execute: ({ value }) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value;
      },
    });
    const number = defineAIChatTool({
      schema: z.object({ value: z.number() }),
      execute: ({ value }) => value,
    });
    const tools = { text, number };
    const widerSchema = z.object({ value: z.union([z.string(), z.number()]) });

    expectTypeOf(tools).toMatchTypeOf<NonNullable<Parameters<typeof useAIChat>[0]["tools"]>>();
    expectTypeOf<{}>().not.toMatchTypeOf<AILocalTool["schema"]>();
    expectTypeOf(text).not.toMatchTypeOf<AILocalTool<typeof widerSchema>>();
  });

  it("accepts only function tools in AI Gateway requests", () => {
    type GatewayTool = NonNullable<AIGatewayChatRequest["tools"]>[number];

    expectTypeOf<GatewayTool["type"]>().toEqualTypeOf<"function">();
  });

  it("does not export provider tool helpers", () => {
    expectTypeOf<typeof import("../index")>().not.toHaveProperty("aiProviderTool");
  });
});
