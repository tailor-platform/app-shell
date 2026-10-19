import { defineAIChatTool } from "@tailor-platform/app-shell";
import { z } from "zod/v4";

export const tools = {
  add: defineAIChatTool({
    description: "Add two numbers and return their sum. Use this tool for addition requests.",
    schema: z.object({ a: z.number(), b: z.number() }),
    execute: ({ a, b }) => ({ sum: a + b }),
  }),
};
