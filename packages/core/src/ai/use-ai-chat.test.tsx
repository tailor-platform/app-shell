import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { useAIChat } from "./use-ai-chat";
import type { AIGatewayChatRequest, AIGatewayClient } from "./client";
import { defineAIChatTool } from "./tools";

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

beforeEach(() => {
  let id = 0;
  vi.stubGlobal("crypto", {
    randomUUID: () => `id-${++id}`,
  });
});

describe("useAIChat", () => {
  it("returns the initial ready state", () => {
    const client = {
      streamChatCompletion: vi.fn(async function* () {
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    expect(result.current.messages).toEqual([]);
    expect(result.current.toolCalls).toEqual([]);
    expect(result.current.status).toBe("ready");
    expect(result.current.error).toBeUndefined();
  });

  it("appends user and assistant messages while streaming", async () => {
    let releaseFirstChunk!: () => void;
    const firstChunkGate = new Promise<void>((resolve) => {
      releaseFirstChunk = resolve;
    });
    let releaseSecondChunk!: () => void;
    const secondChunkGate = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve;
    });

    const client = {
      streamChatCompletion: vi.fn(async function* ({ signal }) {
        expect(signal).toBeInstanceOf(AbortSignal);
        await firstChunkGate;
        yield { type: "text-delta", text: "Hello" } as const;
        await secondChunkGate;
        yield { type: "text-delta", text: " world" } as const;
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    let sendPromise: Promise<boolean> | undefined;
    await act(async () => {
      sendPromise = result.current.sendMessage("Hi");
    });

    expect(result.current.status).toBe("submitted");
    expect(result.current.messages).toEqual([{ id: "id-1", role: "user", content: "Hi" }]);

    await act(async () => {
      releaseFirstChunk();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("streaming");
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "Hi" },
        { id: "id-2", role: "assistant", content: "Hello" },
      ]);
    });

    expect(client.streamChatCompletion).toHaveBeenCalledWith({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: "Hi" }],
      signal: expect.any(AbortSignal),
    });

    releaseSecondChunk();
    await act(async () => {
      await expect(sendPromise).resolves.toBe(true);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "Hi" },
        { id: "id-2", role: "assistant", content: "Hello world" },
      ]);
    });
  });

  it("keeps partial assistant text when stopped", async () => {
    let releaseSecondChunk!: () => void;
    const secondChunkGate = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve;
    });

    const client = {
      streamChatCompletion: vi.fn(async function* ({ signal }) {
        yield { type: "text-delta", text: "Partial" } as const;
        await secondChunkGate;
        if (signal?.aborted) {
          throw createAbortError();
        }
        yield { type: "text-delta", text: " later" } as const;
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    let sendPromise: Promise<boolean> | undefined;
    await act(async () => {
      sendPromise = result.current.sendMessage("Hi");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("streaming");
      expect(result.current.messages[1]?.content).toBe("Partial");
    });

    act(() => {
      result.current.stop();
    });
    releaseSecondChunk();

    await act(async () => {
      await expect(sendPromise).resolves.toBe(false);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.error).toBeUndefined();
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "Hi" },
        { id: "id-2", role: "assistant", content: "Partial" },
      ]);
    });
  });

  it("ignores stale chunks after stop and allows the next send", async () => {
    let releaseStoppedRequest!: () => void;
    const stoppedRequestGate = new Promise<void>((resolve) => {
      releaseStoppedRequest = resolve;
    });

    const client = {
      streamChatCompletion: vi.fn(async function* ({ messages }) {
        const text = messages.at(-1)?.content;

        if (text === "First") {
          yield { type: "text-delta", text: "Partial" } as const;
          await stoppedRequestGate;
          yield { type: "text-delta", text: " stale" } as const;
          yield { type: "done" } as const;
          return;
        }

        yield { type: "text-delta", text: "Fresh" } as const;
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    let firstSendPromise: Promise<boolean> | undefined;
    await act(async () => {
      firstSendPromise = result.current.sendMessage("First");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("streaming");
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "First" },
        { id: "id-2", role: "assistant", content: "Partial" },
      ]);
    });

    act(() => {
      result.current.stop();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    await act(async () => {
      await expect(result.current.sendMessage("Second")).resolves.toBe(true);
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "First" },
        { id: "id-2", role: "assistant", content: "Partial" },
        { id: "id-3", role: "user", content: "Second" },
        { id: "id-4", role: "assistant", content: "Fresh" },
      ]);
    });

    releaseStoppedRequest();
    await act(async () => {
      await expect(firstSendPromise).resolves.toBe(false);
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "First" },
        { id: "id-2", role: "assistant", content: "Partial" },
        { id: "id-3", role: "user", content: "Second" },
        { id: "id-4", role: "assistant", content: "Fresh" },
      ]);
    });
  });

  it("sets error state and recovers on the next successful send", async () => {
    let shouldFail = true;
    const client = {
      streamChatCompletion: vi.fn(async function* () {
        if (shouldFail) {
          throw new Error("boom");
        }
        yield { type: "text-delta", text: "Recovered" } as const;
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    await act(async () => {
      await expect(result.current.sendMessage("Hi")).resolves.toBe(false);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.error?.message).toBe("boom");
      expect(result.current.messages).toEqual([{ id: "id-1", role: "user", content: "Hi" }]);
    });

    shouldFail = false;

    await act(async () => {
      await expect(result.current.sendMessage("Retry")).resolves.toBe(true);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.error).toBeUndefined();
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "Hi" },
        { id: "id-2", role: "user", content: "Retry" },
        { id: "id-3", role: "assistant", content: "Recovered" },
      ]);
    });
  });

  it.each(["stop", "error"] as const)(
    "includes retained text and earlier tool history in the next request after %s",
    async (interruption) => {
      let releaseReply!: () => void;
      const replyGate = new Promise<void>((resolve) => {
        releaseReply = resolve;
      });
      const earlierToolCall = { id: "earlier-call", name: "lookup", argumentsText: "{}" };
      const earlierHistory = [
        { role: "user", content: "Earlier" },
        { role: "assistant", toolCalls: [earlierToolCall] },
        { role: "tool", toolCallId: "earlier-call", content: "found" },
        { role: "assistant", content: "Earlier answer" },
      ];
      const client = {
        streamChatCompletion: vi.fn(async function* ({ messages }) {
          const lastMessage = messages.at(-1);
          if (lastMessage?.content === "Earlier") {
            yield {
              type: "tool-call",
              toolCallId: earlierToolCall.id,
              toolName: earlierToolCall.name,
              argumentsText: "{}",
            } as const;
          } else if (lastMessage?.role === "tool") {
            yield { type: "text-delta", text: "Earlier answer" } as const;
          } else if (lastMessage?.content === "First") {
            yield { type: "text-delta", text: "Partial" } as const;
            await replyGate;
            if (interruption === "error") throw new Error("reply failed");
            yield { type: "text-delta", text: " stale" } as const;
          } else {
            expect(messages).toEqual([
              ...earlierHistory,
              { role: "user", content: "First" },
              { role: "assistant", content: "Partial" },
              { role: "user", content: "Continue" },
            ]);
            yield { type: "text-delta", text: "Fresh" } as const;
          }
          yield { type: "done" } as const;
        }),
      } satisfies AIGatewayClient;
      const lookup = defineAIChatTool({ schema: z.object({}), execute: () => "found" });
      const { result } = renderHook(() =>
        useAIChat({ client, model: "gpt-5-mini", tools: { lookup } }),
      );
      await act(async () => {
        await expect(result.current.sendMessage("Earlier")).resolves.toBe(true);
      });

      let interruptedSend!: Promise<boolean>;
      await act(async () => {
        interruptedSend = result.current.sendMessage("First");
      });
      expect(result.current.messages.at(-1)?.content).toBe("Partial");

      let nextSend!: Promise<boolean>;
      if (interruption === "stop") {
        act(() => {
          result.current.stop();
          nextSend = result.current.sendMessage("Continue");
        });
      } else {
        await act(async () => {
          releaseReply();
          await expect(interruptedSend).resolves.toBe(false);
        });
        act(() => {
          nextSend = result.current.sendMessage("Continue");
        });
      }
      await act(async () => {
        await expect(nextSend).resolves.toBe(true);
      });
      if (interruption === "stop") {
        await act(async () => {
          releaseReply();
          await expect(interruptedSend).resolves.toBe(false);
        });
      }
      expect(result.current.status).toBe("ready");
      expect(result.current.messages.at(-1)?.content).toBe("Fresh");
      expect(result.current.error).toBeUndefined();
    },
  );

  it("executes local tools and continues the conversation", async () => {
    const lookupCustomer = defineAIChatTool({
      description: "Look up a customer",
      schema: z.object({
        customerId: z.string(),
      }),
      async execute({ customerId }) {
        return { customerId, name: "Acme Corp" };
      },
    });

    const client = {
      streamChatCompletion: vi.fn(async function* ({ messages, tools }) {
        const lastMessage = messages.at(-1);

        if (lastMessage?.role === "user") {
          expect(tools).toEqual([
            {
              type: "function",
              function: {
                name: "lookupCustomer",
                description: "Look up a customer",
                parameters: {
                  $schema: "http://json-schema.org/draft-07/schema#",
                  type: "object",
                  properties: {
                    customerId: { type: "string" },
                  },
                  required: ["customerId"],
                },
              },
            },
          ]);

          yield {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "lookupCustomer",
            argumentsText: '{"customerId":"cust-1"}',
          } as const;
          yield { type: "done", finishReason: "tool_calls" } as const;
          return;
        }

        expect(messages).toEqual([
          { role: "user", content: "Find customer" },
          {
            role: "assistant",
            toolCalls: [
              {
                id: "call-1",
                name: "lookupCustomer",
                argumentsText: '{"customerId":"cust-1"}',
              },
            ],
          },
          {
            role: "tool",
            toolCallId: "call-1",
            content: '{"customerId":"cust-1","name":"Acme Corp"}',
          },
        ]);

        yield { type: "text-delta", text: "Customer: Acme Corp" } as const;
        yield { type: "done", finishReason: "stop" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() =>
      useAIChat({
        client,
        model: "gpt-5-mini",
        tools: {
          lookupCustomer,
        },
      }),
    );

    await act(async () => {
      await expect(result.current.sendMessage("Find customer")).resolves.toBe(true);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "Find customer" },
        { id: "id-2", role: "assistant", content: "Customer: Acme Corp" },
      ]);
      expect(result.current.toolCalls).toEqual([]);
    });

    expect(client.streamChatCompletion).toHaveBeenCalledTimes(2);
  });

  it("exposes calls only during the active flow across text and tool-only rounds", async () => {
    let releaseTool!: () => void;
    const toolGate = new Promise<void>((resolve) => {
      releaseTool = resolve;
    });
    let releaseReply!: () => void;
    const replyGate = new Promise<void>((resolve) => {
      releaseReply = resolve;
    });
    let releaseFinalReply!: () => void;
    const finalReplyGate = new Promise<void>((resolve) => {
      releaseFinalReply = resolve;
    });
    const echo = defineAIChatTool({
      schema: z.object({ value: z.string() }),
      async execute({ value }) {
        if (value === "first") await toolGate;
        return value;
      },
    });
    let round = 0;
    const client = {
      streamChatCompletion: vi.fn(async function* () {
        round += 1;
        if (round === 1) {
          yield { type: "text-delta", text: "Checking" } as const;
          for (const value of ["first", "second"]) {
            yield {
              type: "tool-call",
              toolCallId: value,
              toolName: "echo",
              argumentsText: JSON.stringify({ value }),
            } as const;
          }
        } else if (round === 2) {
          await replyGate;
          yield {
            type: "tool-call",
            toolCallId: "third",
            toolName: "echo",
            argumentsText: '{"value":"third"}',
          } as const;
        } else {
          await finalReplyGate;
          yield { type: "text-delta", text: "Done" } as const;
        }
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;
    const { result } = renderHook(() =>
      useAIChat({ client, model: "gpt-5-mini", tools: { echo } }),
    );

    let sendPromise: Promise<boolean> | undefined;
    await act(async () => {
      sendPromise = result.current.sendMessage("Check three values");
    });

    const firstCalls = [
      { id: "first", name: "echo" },
      { id: "second", name: "echo" },
    ];
    expect(result.current.status).toBe("submitted");
    expect(client.streamChatCompletion).toHaveBeenCalledTimes(1);
    expect(result.current.toolCalls).toEqual(firstCalls);
    expect(result.current.messages).toEqual([
      { id: "id-1", role: "user", content: "Check three values" },
      { id: "id-2", role: "assistant", content: "Checking" },
    ]);

    await act(async () => {
      await expect(result.current.sendMessage("Ignored")).resolves.toBe(false);
    });
    expect(result.current.toolCalls).toEqual(firstCalls);

    await act(async () => {
      releaseTool();
    });
    await waitFor(() => expect(client.streamChatCompletion).toHaveBeenCalledTimes(2));
    expect(result.current.status).toBe("submitted");
    expect(result.current.toolCalls).toEqual(firstCalls);

    await act(async () => {
      releaseReply();
    });
    await waitFor(() => expect(client.streamChatCompletion).toHaveBeenCalledTimes(3));
    expect(result.current.toolCalls).toEqual([...firstCalls, { id: "third", name: "echo" }]);
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.status).toBe("submitted");

    await act(async () => {
      releaseFinalReply();
      await expect(sendPromise).resolves.toBe(true);
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.toolCalls).toEqual([]);
    expect(result.current.messages).toEqual([
      { id: "id-1", role: "user", content: "Check three values" },
      { id: "id-2", role: "assistant", content: "Checking" },
      { id: "id-3", role: "assistant", content: "Done" },
    ]);
  });

  it.each([false, true])(
    "drops the unfinished tool batch on stop (has text: %s)",
    async (hasText) => {
      let releaseTool!: () => void;
      const toolGate = new Promise<void>((resolve) => {
        releaseTool = resolve;
      });
      const executePending = vi.fn(async () => {
        await toolGate;
        return "late result";
      });
      const completedCall = { id: "completed", name: "lookup", argumentsText: "{}" };
      const lookup = defineAIChatTool({ schema: z.object({}), execute: () => "found" });
      const pending = defineAIChatTool({ schema: z.object({}), execute: executePending });
      const client = {
        streamChatCompletion: vi.fn(async function* ({ messages }) {
          const lastMessage = messages.at(-1);
          if (lastMessage?.content === "First") {
            yield { type: "text-delta", text: "Checking" } as const;
            yield {
              type: "tool-call",
              toolCallId: completedCall.id,
              toolName: completedCall.name,
              argumentsText: "{}",
            } as const;
          } else if (lastMessage?.role === "tool") {
            if (hasText) yield { type: "text-delta", text: "Checking again" } as const;
            yield {
              type: "tool-call",
              toolCallId: "pending",
              toolName: "pending",
              argumentsText: "{}",
            } as const;
          } else {
            expect(messages).toEqual([
              { role: "user", content: "First" },
              { role: "assistant", content: "Checking", toolCalls: [completedCall] },
              { role: "tool", toolCallId: "completed", content: "found" },
              ...(hasText ? [{ role: "assistant", content: "Checking again" }] : []),
              { role: "user", content: "Continue" },
            ]);
            yield { type: "text-delta", text: "Fresh" } as const;
          }
          yield { type: "done" } as const;
        }),
      } satisfies AIGatewayClient;
      const { result } = renderHook(() =>
        useAIChat({ client, model: "gpt-5-mini", tools: { lookup, pending } }),
      );
      let interruptedSend!: Promise<boolean>;
      await act(async () => {
        interruptedSend = result.current.sendMessage("First");
      });
      expect(executePending).toHaveBeenCalledOnce();

      let nextSend!: Promise<boolean>;
      act(() => {
        result.current.stop();
        nextSend = result.current.sendMessage("Continue");
      });
      await act(async () => {
        await expect(nextSend).resolves.toBe(true);
        releaseTool();
        await expect(interruptedSend).resolves.toBe(false);
      });
      expect(result.current.messages.map(({ content }) => content)).toEqual([
        "First",
        "Checking",
        ...(hasText ? ["Checking again"] : []),
        "Continue",
        "Fresh",
      ]);
      expect(result.current.toolCalls).toEqual([]);
      expect(result.current.status).toBe("ready");
      expect(client.streamChatCompletion).toHaveBeenCalledTimes(3);
    },
  );

  it("clears calls on stop and ignores late events while the next flow is active", async () => {
    let releaseStoppedRequest!: () => void;
    const stoppedRequestGate = new Promise<void>((resolve) => {
      releaseStoppedRequest = resolve;
    });
    let releaseSecondReply!: () => void;
    const secondReplyGate = new Promise<void>((resolve) => {
      releaseSecondReply = resolve;
    });
    const lookup = defineAIChatTool({ schema: z.object({}), execute: () => "found" });
    const client = {
      streamChatCompletion: vi.fn(async function* ({ messages }: AIGatewayChatRequest) {
        const lastMessage = messages.at(-1);
        if (lastMessage?.role === "user") {
          expect(messages).toEqual(
            lastMessage.content === "First"
              ? [{ role: "user", content: "First" }]
              : [
                  { role: "user", content: "First" },
                  {
                    role: "assistant",
                    toolCalls: [{ id: "observed", name: "lookup", argumentsText: "{}" }],
                  },
                  { role: "tool", toolCallId: "observed", content: "found" },
                  { role: "user", content: "Second" },
                ],
          );
          yield {
            type: "tool-call",
            toolCallId: lastMessage.content === "First" ? "observed" : "fresh",
            toolName: "lookup",
            argumentsText: "{}",
          } as const;
        } else if (messages.findLast((message) => message.role === "user")?.content === "First") {
          await stoppedRequestGate;
          yield {
            type: "tool-call",
            toolCallId: "late",
            toolName: "lookup",
            argumentsText: "{}",
          } as const;
        } else {
          await secondReplyGate;
          yield { type: "text-delta", text: "Fresh" } as const;
        }
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;
    const { result } = renderHook(() =>
      useAIChat({ client, model: "gpt-5-mini", tools: { lookup } }),
    );

    let firstSendPromise: Promise<boolean> | undefined;
    await act(async () => {
      firstSendPromise = result.current.sendMessage("First");
    });
    expect(result.current.status).toBe("submitted");
    expect(result.current.toolCalls).toEqual([{ id: "observed", name: "lookup" }]);
    expect(result.current.messages).toEqual([{ id: "id-1", role: "user", content: "First" }]);

    act(() => result.current.stop());
    expect(result.current.status).toBe("ready");
    expect(result.current.toolCalls).toEqual([]);

    let secondSendPromise: Promise<boolean> | undefined;
    await act(async () => {
      secondSendPromise = result.current.sendMessage("Second");
    });
    expect(result.current.toolCalls).toEqual([{ id: "fresh", name: "lookup" }]);
    expect(result.current.messages).toEqual([
      { id: "id-1", role: "user", content: "First" },
      { id: "id-2", role: "user", content: "Second" },
    ]);

    await act(async () => {
      releaseStoppedRequest();
      await expect(firstSendPromise).resolves.toBe(false);
    });
    expect(result.current.toolCalls).toEqual([{ id: "fresh", name: "lookup" }]);
    expect(result.current.status).toBe("submitted");

    await act(async () => {
      releaseSecondReply();
      await expect(secondSendPromise).resolves.toBe(true);
    });
    expect(result.current.toolCalls).toEqual([]);
    expect(result.current.messages).toEqual([
      { id: "id-1", role: "user", content: "First" },
      { id: "id-2", role: "user", content: "Second" },
      { id: "id-3", role: "assistant", content: "Fresh" },
    ]);
    expect(result.current.status).toBe("ready");
    expect(result.current.error).toBeUndefined();
    expect(client.streamChatCompletion).toHaveBeenCalledTimes(4);
  });

  it("clears active calls but retains completed tool history after a reply error", async () => {
    let releaseFailure!: () => void;
    const failureGate = new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });
    const failingTool = defineAIChatTool({
      schema: z.object({}),
      async execute() {
        await failureGate;
        throw new Error("tool failed");
      },
    });
    const client = {
      streamChatCompletion: vi.fn(async function* ({ messages }) {
        if (messages.at(-1)?.content === "Retry") {
          expect(messages).toEqual([
            { role: "user", content: "Try the tool" },
            {
              role: "assistant",
              toolCalls: [{ id: "failed-call", name: "failingTool", argumentsText: "{}" }],
            },
            { role: "tool", toolCallId: "failed-call", content: '{"error":"tool failed"}' },
            { role: "user", content: "Retry" },
          ]);
          yield { type: "text-delta", text: "Recovered" } as const;
        } else if (messages.at(-1)?.role === "tool") {
          expect(messages.at(-1)?.content).toBe('{"error":"tool failed"}');
          throw new Error("reply failed");
        } else {
          yield {
            type: "tool-call",
            toolCallId: "failed-call",
            toolName: "failingTool",
            argumentsText: "{}",
          } as const;
        }
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;
    const { result } = renderHook(() =>
      useAIChat({ client, model: "gpt-5-mini", tools: { failingTool } }),
    );

    let sendPromise: Promise<boolean> | undefined;
    await act(async () => {
      sendPromise = result.current.sendMessage("Try the tool");
    });
    expect(result.current.toolCalls).toEqual([{ id: "failed-call", name: "failingTool" }]);
    expect(result.current.messages).toEqual([
      { id: "id-1", role: "user", content: "Try the tool" },
    ]);

    await act(async () => {
      releaseFailure();
      await expect(sendPromise).resolves.toBe(false);
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toBe("reply failed");
    expect(result.current.toolCalls).toEqual([]);
    expect(result.current.messages).toEqual([
      { id: "id-1", role: "user", content: "Try the tool" },
    ]);

    await act(async () => {
      await expect(result.current.sendMessage("Retry")).resolves.toBe(true);
    });
    expect(result.current.toolCalls).toEqual([]);
    expect(result.current.messages).toEqual([
      { id: "id-1", role: "user", content: "Try the tool" },
      { id: "id-2", role: "user", content: "Retry" },
      { id: "id-3", role: "assistant", content: "Recovered" },
    ]);
  });

  it.each([false, true])(
    "allows a final answer after eight tool batches but rejects a ninth batch (requests ninth: %s)",
    async (requestNinthBatch) => {
      const execute = vi.fn(({ value }: { value: string }) => ({ value }));
      const loop = defineAIChatTool({
        schema: z.object({ value: z.string() }),
        execute,
      });
      let callCount = 0;
      const client = {
        streamChatCompletion: vi.fn(async function* ({ messages }) {
          callCount += 1;
          if (callCount === 9) {
            expect(messages.at(-1)).toEqual({
              role: "tool",
              toolCallId: "call-8",
              content: '{"value":"again"}',
            });
            if (!requestNinthBatch) {
              yield { type: "text-delta", text: "Finished" } as const;
              yield { type: "done" } as const;
              return;
            }
          }
          yield {
            type: "tool-call",
            toolCallId: `call-${callCount}`,
            toolName: "loop",
            argumentsText: '{"value":"again"}',
          } as const;
          yield { type: "done", finishReason: "tool_calls" } as const;
        }),
      } satisfies AIGatewayClient;
      const { result } = renderHook(() =>
        useAIChat({ client, model: "gpt-5-mini", tools: { loop } }),
      );

      await act(async () => {
        await expect(result.current.sendMessage("Start looping")).resolves.toBe(!requestNinthBatch);
      });

      expect(client.streamChatCompletion).toHaveBeenCalledTimes(9);
      expect(execute).toHaveBeenCalledTimes(8);
      expect(result.current.toolCalls).toEqual([]);
      if (requestNinthBatch) {
        expect(result.current.status).toBe("error");
        expect(result.current.error?.message).toContain("maximum number of tool rounds");
      } else {
        expect(result.current.status).toBe("ready");
        expect(result.current.messages.at(-1)?.content).toBe("Finished");
      }
    },
  );

  it("ignores blank and concurrent sends", async () => {
    let releaseRequest!: () => void;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });

    const client = {
      streamChatCompletion: vi.fn(async function* () {
        await requestGate;
        yield { type: "text-delta", text: "Done" } as const;
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    await act(async () => {
      await expect(result.current.sendMessage("   ")).resolves.toBe(false);
    });

    expect(client.streamChatCompletion).not.toHaveBeenCalled();

    await act(async () => {
      void result.current.sendMessage("First");
    });

    await act(async () => {
      await expect(result.current.sendMessage("Second")).resolves.toBe(false);
    });

    expect(client.streamChatCompletion).toHaveBeenCalledTimes(1);

    releaseRequest();
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "First" },
        { id: "id-2", role: "assistant", content: "Done" },
      ]);
    });
  });
});
