import type { AuthClient } from "@tailor-platform/auth-public-client";

export type AIGatewayChatMessage =
  | {
      role: "system" | "user";
      content: string;
    }
  | {
      role: "assistant";
      content?: string;
    };

export interface AIGatewayChatRequest {
  model: string;
  messages: AIGatewayChatMessage[];
  stream?: boolean;
  signal?: AbortSignal;
}

export type AIChatCompletionEvent =
  | {
      type: "text-delta";
      text: string;
    }
  | {
      type: "done";
      finishReason?: string;
    };

export interface AIGatewayClient {
  /**
   * Honor request.signal when possible so callers can stop work early.
   */
  streamChatCompletion(request: AIGatewayChatRequest): AsyncIterable<AIChatCompletionEvent>;
}

interface OpenAIStreamChunk {
  choices?: Array<{
    delta?: {
      content?: unknown;
    };
    finish_reason?: unknown;
  }>;
}

interface OpenAIFinalResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
    finish_reason?: unknown;
  }>;
}

export function createAIGatewayClient(config: {
  gatewayUri: string;
  authClient: AuthClient;
}): AIGatewayClient {
  const endpoint = new URL("v1/chat/completions", withTrailingSlash(config.gatewayUri)).toString();

  return {
    async *streamChatCompletion(request) {
      if (request.stream === false) {
        yield* streamJSONResponse({
          endpoint,
          authClient: config.authClient,
          request,
        });
        return;
      }

      yield* streamOpenAICompatibleResponse({
        endpoint,
        authClient: config.authClient,
        request,
      });
    },
  };
}

async function* streamOpenAICompatibleResponse(input: {
  endpoint: string;
  authClient: AuthClient;
  request: AIGatewayChatRequest;
}): AsyncGenerator<AIChatCompletionEvent, void, unknown> {
  const response = await input.authClient.fetch(input.endpoint, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.request.model,
      messages: input.request.messages,
      stream: true,
    }),
    signal: input.request.signal,
  });

  await assertOK(response, "AI Gateway streaming request");

  if (!response.body) {
    throw new Error("AI Gateway streaming response did not include a body.");
  }

  let finishReason: string | undefined;

  for await (const event of iterateSSEDataEvents(response.body, input.request.signal)) {
    if (event === "[DONE]") {
      yield createDoneEvent(finishReason);
      return;
    }

    const payload = parseJSON<OpenAIStreamChunk>(event, "AI Gateway SSE event");
    const choice = payload.choices?.[0];
    const delta = extractText(choice?.delta?.content);
    finishReason = extractFinishReason(choice?.finish_reason) ?? finishReason;

    if (delta) {
      yield { type: "text-delta", text: delta };
    }
  }

  yield createDoneEvent(finishReason);
}

async function* streamJSONResponse(input: {
  endpoint: string;
  authClient: AuthClient;
  request: AIGatewayChatRequest;
}): AsyncGenerator<AIChatCompletionEvent, void, unknown> {
  const response = await input.authClient.fetch(input.endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.request.model,
      messages: input.request.messages,
      stream: false,
    }),
    signal: input.request.signal,
  });

  await assertOK(response, "AI Gateway JSON request");

  const payload = parseJSON<OpenAIFinalResponse>(await response.text(), "AI Gateway JSON response");
  const choice = payload.choices?.[0];
  const text = extractText(choice?.message?.content);

  if (text) {
    yield { type: "text-delta", text };
  }

  yield createDoneEvent(extractFinishReason(choice?.finish_reason));
}

async function assertOK(response: Response, context: string): Promise<void> {
  if (response.ok) {
    return;
  }

  let body = "";

  try {
    body = (await response.text()).trim();
  } catch {
    // Ignore body read failures and fall back to status-only message.
  }

  if (body.length > 300) {
    body = `${body.slice(0, 300)}…`;
  }

  const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  throw new Error(
    body ? `${context} failed (${status}): ${body}` : `${context} failed (${status}).`,
  );
}

async function* iterateSSEDataEvents(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];

  const flushLine = (line: string): string | null => {
    if (line === "") {
      if (dataLines.length === 0) {
        return null;
      }

      const event = dataLines.join("\n");
      dataLines = [];
      return event;
    }

    if (line.startsWith(":")) {
      return null;
    }

    if (!line.startsWith("data:")) {
      return null;
    }

    dataLines.push(line.slice(5).replace(/^ /, ""));
    return null;
  };

  try {
    while (true) {
      if (signal?.aborted) {
        throw createAbortError();
      }

      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) {
          line = line.slice(0, -1);
        }

        const event = flushLine(line);
        if (event !== null) {
          yield event;
        }

        newlineIndex = buffer.indexOf("\n");
      }
    }

    buffer += decoder.decode();

    if (buffer.length > 0) {
      const event = flushLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
      if (event !== null) {
        yield event;
      }
    }

    if (dataLines.length > 0) {
      yield dataLines.join("\n");
    }
  } finally {
    reader.releaseLock();
  }
}

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function extractText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (part && typeof part === "object" && "text" in part) {
        const text = part.text;
        return typeof text === "string" ? text : "";
      }

      return "";
    })
    .join("");
}

function extractFinishReason(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function createDoneEvent(finishReason?: string): AIChatCompletionEvent {
  return finishReason ? { type: "done", finishReason } : { type: "done" };
}

function parseJSON<T>(value: string, context: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(
      `${context} was not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}
