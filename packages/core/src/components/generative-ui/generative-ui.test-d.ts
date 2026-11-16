import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod/v4";
import {
  defineGenerativeUI,
  generativeUICards,
  type AILocalTool,
  type AIChatMessage,
  type AIChatToolContext,
  type AIChatMessagePart,
  type useAIChat,
} from "../../index";

describe("Generative UI consumer types", () => {
  it("preserves text-only message/context construction while the hook guarantees parts", () => {
    const message: AIChatMessage = { id: "old", role: "user", content: "Hello" };
    const context: AIChatToolContext = {
      signal: new AbortController().signal,
      messages: [message],
    };
    expectTypeOf(context).toMatchTypeOf<AIChatToolContext>();
    type ReturnedMessage = ReturnType<typeof useAIChat>["messages"][number];
    expectTypeOf<ReturnedMessage["parts"]>().toEqualTypeOf<AIChatMessagePart[]>();
  });
  it("infers each heterogeneous component from its schema's output", () => {
    const ui = defineGenerativeUI({
      cards: {
        Report: generativeUICards.report,
        Summary: {
          schema: z.object({ title: z.string() }),
          component: ({ data }) => {
            expectTypeOf(data).toEqualTypeOf<{ title: string }>();
            return null;
          },
        },
        Count: {
          schema: z.string().transform((value) => value.length),
          component: ({ data }) => {
            expectTypeOf(data).toEqualTypeOf<number>();
            return null;
          },
        },
      },
    });
    expectTypeOf(ui.tool).toMatchTypeOf<AILocalTool>();
    expectTypeOf({ ui_render: ui.tool }).toMatchTypeOf<
      NonNullable<Parameters<typeof useAIChat>[0]["tools"]>
    >();
  });

  it("does not weaken a component's props to accept mismatched schema output", () => {
    defineGenerativeUI({
      cards: {
        Invalid: {
          schema: z.string(),
          // @ts-expect-error Component data must match the schema's validated output.
          component: (_props: { data: number }) => null,
        },
      },
    });
  });
});
