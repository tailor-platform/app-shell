import type { AuthClient } from "@tailor-platform/auth-public-client";

export interface AIGatewayChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIGatewayChatRequest {
  model: string;
  messages: AIGatewayChatMessage[];
  stream?: boolean;
  signal?: AbortSignal;
}

export interface AIGatewayClient {
  /**
   * Honor request.signal when possible so callers can stop work early.
   */
  chatCompletionStream(request: AIGatewayChatRequest): AsyncIterable<string>;
}

interface OpenAIStreamChunk {
  choices?: Array<{
    delta?: {
      content?: unknown;
    };
  }>;
}

interface OpenAIFinalResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

export function createAIGatewayClient(config: {
  gatewayUri: string;
  authClient: AuthClient;
}): AIGatewayClient {
  const endpoint = new URL("v1/chat/completions", withTrailingSlash(config.gatewayUri)).toString();

  return {
    async *chatCompletionStream(request) {
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
}): AsyncGenerator<string, void, unknown> {
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

  for await (const event of iterateSSEDataEvents(response.body, input.request.signal)) {
    if (event === "[DONE]") {
      return;
    }

    const payload = parseJSON<OpenAIStreamChunk>(event, "AI Gateway SSE event");
    const delta = extractText(payload.choices?.[0]?.delta?.content);

    if (delta) {
      yield delta;
    }
  }
}

async function* streamJSONResponse(input: {
  endpoint: string;
  authClient: AuthClient;
  request: AIGatewayChatRequest;
}): AsyncGenerator<string, void, unknown> {
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
  const text = extractText(payload.choices?.[0]?.message?.content);

  if (!text) {
    throw new Error("AI Gateway JSON response did not include assistant text.");
  }

  yield text;
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
