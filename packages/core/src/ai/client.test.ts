import { describe, expect, it, vi } from "vitest";
import type { AuthClient } from "@tailor-platform/auth-public-client";
import { createAIGatewayClient, type AIGatewayChatRequest, type AIGatewayClient } from "./client";

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

async function collectStream(client: AIGatewayClient, request: AIGatewayChatRequest) {
  const deltas: string[] = [];

  for await (const delta of client.chatCompletionStream(request)) {
    deltas.push(delta);
  }

  return deltas;
}

describe("createAIGatewayClient", () => {
  it("streams OpenAI-compatible text deltas through authClient.fetch", async () => {
    const authClient = createMockAuthClient(
      new Response(
        createSSEStream([
          'data: {"choices":[{"delta":{"content":"Hel',
          'lo"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
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

    const deltas = await collectStream(client, createRequest({ signal }));

    expect(deltas).toEqual(["Hello", " world"]);
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

  it("yields a single text chunk for gemini models", async () => {
    const authClient = createMockAuthClient(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: [{ type: "text", text: "Grounded answer" }],
              },
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

    const deltas = await collectStream(client, createRequest({ model: "gemini-2.5-flash" }));

    expect(deltas).toEqual(["Grounded answer"]);
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
    });
  });

  it("throws on non-ok responses", async () => {
    const authClient = createMockAuthClient(
      new Response("nope", { status: 401, statusText: "Nope" }),
    );
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com",
      authClient,
    });

    await expect(collectStream(client, createRequest())).rejects.toThrow(
      "AI Gateway streaming request failed (401 Nope): nope",
    );
  });

  it("throws when a streaming response body is missing", async () => {
    const authClient = createMockAuthClient(new Response(null, { status: 200 }));
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com",
      authClient,
    });

    await expect(collectStream(client, createRequest())).rejects.toThrow(
      "AI Gateway streaming response did not include a body.",
    );
  });

  it("throws when gemini responses do not include assistant text", async () => {
    const authClient = createMockAuthClient(
      new Response(JSON.stringify({ choices: [{ message: { content: [] } }] }), { status: 200 }),
    );
    const client = createAIGatewayClient({
      gatewayUri: "https://gateway.example.com",
      authClient,
    });

    await expect(
      collectStream(client, createRequest({ model: "gemini-2.5-flash" })),
    ).rejects.toThrow("AI Gateway Gemini response did not include assistant text.");
  });
});
