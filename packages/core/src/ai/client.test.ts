import { describe, expect, it, vi } from "vitest";
import type { AuthClient } from "@tailor-platform/auth-public-client";
import {
  createAIGatewayClient,
  type AIGatewayChatRequest,
  type AIGatewayClient,
  type AIChatCompletionEvent,
} from "./client";

function createMockAuthClient(response: Response | Promise<Response>) {
  return {
    fetch: vi.fn().mockResolvedValue(response),
  } as unknown as AuthClient;
}

function createRequest(overrides?: Partial<AIGatewayChatRequest>): AIGatewayChatRequest {
  return {
    model: "gpt-5-mini",
    messages: [{ role: "user", content: "Hello" }],
    ...overrides,
  };
}

function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

async function collectEvents(client: AIGatewayClient, request: AIGatewayChatRequest) {
  const events: AIChatCompletionEvent[] = [];

  for await (const event of client.streamChatCompletion(request)) {
    events.push(event);
  }

  return events;
}

describe("createAIGatewayClient", () => {
  it("streams OpenAI-compatible events through authClient.fetch", async () => {
    const authClient = createMockAuthClient(
      new Response(
        createSSEStream([
          'data: {"choices":[{"delta":{"content":"Hel',
          'lo"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
          'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
          "data: [DONE]\n\n",
        ]),
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );
    const signal = new AbortController().signal;
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com",
      authClient,
    });

    const events = await collectEvents(client, createRequest({ signal }));

    expect(events).toEqual([
      { type: "text-delta", text: "Hello" },
      { type: "text-delta", text: " world" },
      { type: "done", finishReason: "stop" },
    ]);
    expect(authClient.fetch).toHaveBeenCalledWith(
      "https://gateway.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        signal,
        headers: expect.objectContaining({ Accept: "text/event-stream" }),
      }),
    );

    expect(
      JSON.parse((authClient.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body),
    ).toEqual({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: "Hello" }],
      stream: true,
    });
  });

  it("routes gemini models to json responses by default", async () => {
    const authClient = createMockAuthClient(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: [{ type: "text", text: "Grounded answer" }],
              },
              finish_reason: "stop",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com/base/",
      authClient,
    });

    const events = await collectEvents(client, createRequest({ model: "gemini-2.5-flash" }));

    expect(events).toEqual([
      { type: "text-delta", text: "Grounded answer" },
      { type: "done", finishReason: "stop" },
    ]);
    expect(authClient.fetch).toHaveBeenCalledWith(
      "https://gateway.example.com/base/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );

    expect(
      JSON.parse((authClient.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body),
    ).toEqual({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Hello" }],
      stream: false,
    });
  });

  it("respects explicit stream overrides for gemini models", async () => {
    const authClient = createMockAuthClient(
      new Response(
        createSSEStream([
          'data: {"choices":[{"delta":{"content":"Streamed"}}]}\n\n',
          'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
          "data: [DONE]\n\n",
        ]),
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      ),
    );
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com",
      authClient,
    });

    const events = await collectEvents(
      client,
      createRequest({ model: "gemini-2.5-flash", stream: true }),
    );

    expect(events).toEqual([
      { type: "text-delta", text: "Streamed" },
      { type: "done", finishReason: "stop" },
    ]);
    expect(authClient.fetch).toHaveBeenCalledWith(
      "https://gateway.example.com/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "text/event-stream" }),
      }),
    );

    expect(
      JSON.parse((authClient.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body),
    ).toEqual({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Hello" }],
      stream: true,
    });
  });

  it("emits done even when json responses do not include assistant text", async () => {
    const authClient = createMockAuthClient(
      new Response(
        JSON.stringify({ choices: [{ message: { content: [] }, finish_reason: "tool_calls" }] }),
        { status: 200 },
      ),
    );
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com",
      authClient,
    });

    await expect(
      collectEvents(client, createRequest({ model: "gemini-2.5-flash", stream: false })),
    ).resolves.toEqual([{ type: "done", finishReason: "tool_calls" }]);
  });

  it("throws on non-ok responses", async () => {
    const authClient = createMockAuthClient(
      new Response("nope", { status: 401, statusText: "Nope" }),
    );
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com",
      authClient,
    });

    await expect(collectEvents(client, createRequest())).rejects.toThrow(
      "AI Gateway streaming request failed (401 Nope): nope",
    );
  });

  it("throws when a streaming response body is missing", async () => {
    const authClient = createMockAuthClient(new Response(null, { status: 200 }));
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com",
      authClient,
    });

    await expect(collectEvents(client, createRequest())).rejects.toThrow(
      "AI Gateway streaming response did not include a body.",
    );
  });
});
