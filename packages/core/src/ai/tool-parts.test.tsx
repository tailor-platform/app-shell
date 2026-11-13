import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { defineGenerativeUI } from "../components/generative-ui";
import type { AIGatewayClient } from "./client";
import { defineAIChatTool } from "./tools";
import { useAIChat } from "./use-ai-chat";

beforeEach(() => {
  let id = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `id-${++id}` });
});
afterEach(cleanup);

const ui = defineGenerativeUI({
  cards: {
    Summary: {
      schema: z.strictObject({ title: z.string() }),
      component: ({ data }) => <h3>{data.title}</h3>,
    },
  },
});
const document = { cards: [{ type: "Summary", data: { title: "Order summary" } }] };

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe("tool-owned display parts", () => {
  it.each([false, true])(
    "nests generated UI under its tool call and continues (with text: %s)",
    async (withText) => {
      const client = {
        streamChatCompletion: vi.fn(async function* ({ messages, tools }) {
          if (messages.at(-1)?.role === "user") {
            expect(tools?.[0]?.function.name).toBe("ui_render");
            if (withText) yield { type: "text-delta", text: "Summary follows." } as const;
            yield {
              type: "tool-call",
              toolCallId: "render-1",
              toolName: "ui_render",
              argumentsText: JSON.stringify(document),
            } as const;
          } else {
            expect(messages.at(-1)).toEqual({
              role: "tool",
              toolCallId: "render-1",
              content: '{"ok":true,"shown":1}',
            });
            yield { type: "text-delta", text: "Done." } as const;
          }
          yield { type: "done" } as const;
        }),
      } satisfies AIGatewayClient;
      const { result } = renderHook(() =>
        useAIChat({ client, model: "test", tools: { ui_render: ui.tool } }),
      );
      await act(async () => {
        expect(await result.current.sendMessage("Show summary")).toBe(true);
      });
      expect(result.current.status).toBe("ready");
      expect(result.current.toolCalls).toEqual([]);
      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[1]).toEqual({
        id: "id-2",
        role: "assistant",
        content: withText ? "Summary follows." : "",
        parts: [
          ...(withText ? [{ id: "id-2:text", type: "text", text: "Summary follows." }] : []),
          {
            id: "id-2:render-1",
            type: "tool-call",
            toolCallId: "render-1",
            name: "ui_render",
            parts: [{ type: "generative-ui", data: document }],
          },
        ],
      });
      expect(result.current.messages[2]?.parts).toEqual([
        { id: "id-3:text", type: "text", text: "Done." },
      ]);
      expect(JSON.parse(JSON.stringify(result.current.messages))).toEqual(result.current.messages);
    },
  );

  it("uses the same mechanism for arbitrary display types and groups repeated emissions", async () => {
    const tool = defineAIChatTool({
      schema: z.object({}),
      execute(_args, { emit }) {
        emit?.({ type: "progress", data: { percent: 10 } });
        emit?.({ type: "download", data: { fileId: "file-1" } });
        return "finished";
      },
    });
    const client = {
      async *streamChatCompletion({ messages }) {
        if (messages.at(-1)?.role === "user") {
          yield {
            type: "tool-call",
            toolCallId: "work-1",
            toolName: "work",
            argumentsText: "{}",
          } as const;
        }
        yield { type: "done" } as const;
      },
    } satisfies AIGatewayClient;
    const { result } = renderHook(() =>
      useAIChat({ client, model: "test", tools: { work: tool } }),
    );
    await act(async () => {
      await result.current.sendMessage("Work");
    });
    expect(result.current.messages[1]?.parts).toEqual([
      {
        id: "id-2:work-1",
        type: "tool-call",
        toolCallId: "work-1",
        name: "work",
        parts: [
          { type: "progress", data: { percent: 10 } },
          { type: "download", data: { fileId: "file-1" } },
        ],
      },
    ]);
  });

  it("keeps different emitting tool calls ordered in the same assistant turn", async () => {
    const client = {
      async *streamChatCompletion({ messages }) {
        if (messages.at(-1)?.role === "user") {
          for (const id of ["render-1", "render-2"]) {
            yield {
              type: "tool-call",
              toolCallId: id,
              toolName: "ui_render",
              argumentsText: JSON.stringify(document),
            } as const;
          }
        }
        yield { type: "done" } as const;
      },
    } satisfies AIGatewayClient;
    const { result } = renderHook(() =>
      useAIChat({ client, model: "test", tools: { ui_render: ui.tool } }),
    );
    await act(async () => {
      await result.current.sendMessage("Show both");
    });
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]?.parts.map((part) => part.id)).toEqual([
      "id-2:render-1",
      "id-2:render-2",
    ]);
  });

  it("returns validation errors to the model without publishing invalid documents", async () => {
    const client = {
      streamChatCompletion: vi.fn(async function* ({ messages }) {
        if (messages.at(-1)?.role === "user") {
          yield {
            type: "tool-call",
            toolCallId: "invalid",
            toolName: "ui_render",
            argumentsText: '{"cards":[{"type":"Unknown","data":{}}]}',
          } as const;
        } else {
          expect(JSON.parse(messages.at(-1)?.content ?? "")).toEqual({
            error: "Unknown card type: Unknown",
          });
          yield { type: "text-delta", text: "Could not display." } as const;
        }
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;
    const { result } = renderHook(() =>
      useAIChat({ client, model: "test", tools: { ui_render: ui.tool } }),
    );
    await act(async () => {
      await result.current.sendMessage("Show");
    });
    expect(result.current.messages).toHaveLength(2);
    expect(
      result.current.messages
        .flatMap((message) => message.parts)
        .every((part) => part.type === "text"),
    ).toBe(true);
  });

  it.each(["stop", "unmount", "settled"] as const)(
    "ignores late emissions after %s",
    async (ending) => {
      const pending = gate();
      let emitLater!: () => void;
      const work = defineAIChatTool({
        schema: z.object({}),
        async execute(_args, { emit }) {
          emit?.({ type: "notice", data: "Before" });
          emitLater = () => emit?.({ type: "notice", data: "Late" });
          if (ending !== "settled") await pending.promise;
          return "finished";
        },
      });
      const client = {
        async *streamChatCompletion({ messages }) {
          if (messages.at(-1)?.role === "user") {
            yield {
              type: "tool-call",
              toolCallId: "work-1",
              toolName: "work",
              argumentsText: "{}",
            } as const;
          }
          yield { type: "done" } as const;
        },
      } satisfies AIGatewayClient;
      const { result, unmount } = renderHook(() =>
        useAIChat({ client, model: "test", tools: { work } }),
      );
      let send!: Promise<boolean>;
      await act(async () => {
        send = result.current.sendMessage("Work");
      });
      await waitFor(() => expect(result.current.messages).toHaveLength(2));
      const before = result.current.messages;
      if (ending === "stop") act(() => result.current.stop());
      if (ending === "unmount") unmount();
      await act(async () => {
        emitLater();
        pending.release();
        await send;
      });
      expect(result.current.messages).toEqual(before);
      const part = result.current.messages[1]?.parts[0];
      expect(part?.type === "tool-call" && part.parts).toEqual([
        { type: "notice", data: "Before" },
      ]);
    },
  );

  it("does not publish a document whose async validation finishes after Stop", async () => {
    const pending = gate();
    const schema = z.string();
    vi.spyOn(schema["~standard"], "validate").mockImplementation(async (raw) => {
      await pending.promise;
      return { value: raw as string };
    });
    const slowUI = defineGenerativeUI({
      cards: { Slow: { schema, component: ({ data }) => <h3>{data}</h3> } },
    });
    const client = {
      async *streamChatCompletion() {
        yield {
          type: "tool-call",
          toolCallId: "slow",
          toolName: "ui_render",
          argumentsText: '{"cards":[{"type":"Slow","data":"Old"}]}',
        } as const;
        yield { type: "done" } as const;
      },
    } satisfies AIGatewayClient;
    const { result } = renderHook(() =>
      useAIChat({ client, model: "test", tools: { ui_render: slowUI.tool } }),
    );
    let send!: Promise<boolean>;
    await act(async () => {
      send = result.current.sendMessage("Show");
    });
    act(() => result.current.stop());
    await act(async () => {
      pending.release();
      expect(await send).toBe(false);
    });
    expect(result.current.messages).toHaveLength(1);
  });
});
