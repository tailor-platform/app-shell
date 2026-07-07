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

function getRequestCall(authClient: AuthClient): [RequestInfo | URL, RequestInit | undefined] {
  const fetch = authClient.fetch as ReturnType<typeof vi.fn>;
  const call = fetch.mock.calls[0];

  if (!call) {
    throw new Error("Expected authClient.fetch to be called.");
  }

  return call as [RequestInfo | URL, RequestInit | undefined];
}

function getRequestURL(input: RequestInfo | URL): string {
  if (input instanceof Request) {
    return input.url;
  }

  return String(input);
}

async function readRequestBody(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): Promise<string | undefined> {
  if (typeof init?.body === "string") {
    return init.body;
  }

  if (input instanceof Request) {
    return input.clone().text();
  }

  return undefined;
}

function getRequestHeaders(input: RequestInfo | URL, init: RequestInit | undefined): Headers {
  if (init?.headers) {
    return new Headers(init.headers);
  }

  if (input instanceof Request) {
    return input.headers;
  }

  return new Headers();
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

    const [input, init] = getRequestCall(authClient);
    expect(getRequestURL(input)).toBe("https://gateway.example.com/v1/chat/completions");
    expect(init?.method ?? (input instanceof Request ? input.method : undefined)).toBe("POST");
    expect(init?.signal ?? (input instanceof Request ? input.signal : undefined)).toBeInstanceOf(
      AbortSignal,
    );
    const headers = getRequestHeaders(input, init);
    headers.forEach((_value, key) => {
      expect(key.startsWith("x-stainless-")).toBe(false);
    });
    expect(JSON.parse(String(await readRequestBody(input, init)))).toEqual({
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

    const [input, init] = getRequestCall(authClient);
    expect(getRequestURL(input)).toBe("https://gateway.example.com/base/v1/chat/completions");
    expect(JSON.parse(String(await readRequestBody(input, init)))).toEqual({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Hello" }],
      stream: false,
    });
  });

  it("emits done even when json responses do not include assistant text", async () => {
    const authClient = createMockAuthClient(
      new Response(
        JSON.stringify({ choices: [{ message: { content: [] }, finish_reason: "tool_calls" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com",
      authClient,
    });

    await expect(
      collectEvents(client, createRequest({ model: "gemini-2.5-flash" })),
    ).resolves.toEqual([{ type: "done", finishReason: "tool_calls" }]);
  });

  it("throws on non-ok responses", async () => {
    const authClient = createMockAuthClient(
      new Response(JSON.stringify({ error: { message: "nope" } }), {
        status: 401,
        statusText: "Nope",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com",
      authClient,
    });

    await expect(collectEvents(client, createRequest())).rejects.toMatchObject({
      message: expect.stringMatching(/401.*nope/i),
    });
  });
});
