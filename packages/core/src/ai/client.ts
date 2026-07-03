import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
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

export function createAIGatewayClient(config: {
  gatewayUri: string;
  authClient: AuthClient;
}): AIGatewayClient {
  const client = createOpenAICompatibleClient(config);

  return {
    async *streamChatCompletion(request) {
      if (shouldUseJSONRoute(request)) {
        yield* streamJSONResponse({
          client,
          request,
        });
        return;
      }

      yield* streamOpenAICompatibleResponse({
        client,
        request,
      });
    },
  };
}

function createOpenAICompatibleClient(config: {
  gatewayUri: string;
  authClient: AuthClient;
}): OpenAI {
  return new OpenAI({
    baseURL: new URL("v1/", withTrailingSlash(config.gatewayUri)).toString(),
    apiKey: "tailor-platform-ai-gateway",
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
    fetch: (input, init) => config.authClient.fetch(stripStainlessHeaders(input, init)),
  });
}

function stripStainlessHeaders(input: RequestInfo | URL, init?: RequestInit): Request {
  const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
  const headers = new Headers(request.headers);

  headers.forEach((_, headerName) => {
    if (headerName.toLowerCase().startsWith("x-stainless-")) {
      headers.delete(headerName);
    }
  });

  return new Request(request, { headers });
}

function shouldUseJSONRoute(request: AIGatewayChatRequest): boolean {
  return request.model.startsWith("gemini-");
}

async function* streamOpenAICompatibleResponse(input: {
  client: OpenAI;
  request: AIGatewayChatRequest;
}): AsyncGenerator<AIChatCompletionEvent, void, unknown> {
  try {
    const stream = await input.client.chat.completions.create(
      {
        model: input.request.model,
        messages: input.request.messages.map(toOpenAIMessage),
        stream: true,
      },
      {
        signal: input.request.signal,
      },
    );

    let finishReason: string | undefined;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      const delta = extractStreamingText(choice);
      finishReason = extractFinishReason(choice?.finish_reason) ?? finishReason;

      if (delta) {
        yield { type: "text-delta", text: delta };
      }
    }

    yield createDoneEvent(finishReason);
  } catch (error) {
    throw normalizeGatewayError(error, input.request.signal);
  }
}

async function* streamJSONResponse(input: {
  client: OpenAI;
  request: AIGatewayChatRequest;
}): AsyncGenerator<AIChatCompletionEvent, void, unknown> {
  try {
    const completion = await input.client.chat.completions.create(
      {
        model: input.request.model,
        messages: input.request.messages.map(toOpenAIMessage),
        stream: false,
      },
      {
        signal: input.request.signal,
      },
    );

    const choice = completion.choices[0];
    const text = extractFinalText(choice);

    if (text) {
      yield { type: "text-delta", text };
    }

    yield createDoneEvent(extractFinishReason(choice?.finish_reason));
  } catch (error) {
    throw normalizeGatewayError(error, input.request.signal);
  }
}

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function toOpenAIMessage(message: AIGatewayChatMessage): ChatCompletionMessageParam {
  if (message.role === "assistant") {
    return message.content === undefined
      ? { role: "assistant" }
      : { role: "assistant", content: message.content };
  }

  return {
    role: message.role,
    content: message.content,
  };
}

function extractStreamingText(choice: ChatCompletionChunk["choices"][number] | undefined): string {
  return extractText(choice?.delta?.content);
}

function extractFinalText(choice: ChatCompletion["choices"][number] | undefined): string {
  return extractText(choice?.message?.content);
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

function normalizeGatewayError(error: unknown, signal?: AbortSignal): Error {
  if (signal?.aborted || isAbortError(error)) {
    return createAbortError();
  }

  return error instanceof Error ? error : new Error(String(error));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error
    ? error.name === "AbortError" || error.name === "APIUserAbortError"
    : false;
}

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}
