import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type { AuthClient } from "@tailor-platform/auth-public-client";

export interface AIChatSource {
  type: "url";
  url: string;
  title?: string;
}

export interface AIGatewayToolCall {
  id: string;
  name: string;
  argumentsText: string;
}

export type AIGatewayChatMessage =
  | {
      role: "system" | "user";
      content: string;
    }
  | {
      role: "assistant";
      content?: string;
      toolCalls?: AIGatewayToolCall[];
    }
  | {
      role: "tool";
      toolCallId: string;
      content: string;
    };

export interface AIGatewayFunctionTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface AIGatewayProviderTool {
  type: "provider";
  provider: "openai";
  name: "web_search";
  options?: unknown;
}

export type AIGatewayTool = AIGatewayFunctionTool | AIGatewayProviderTool;

export interface AIGatewayChatRequest {
  model: string;
  messages: AIGatewayChatMessage[];
  tools?: AIGatewayTool[];
  signal?: AbortSignal;
}

export type AIChatCompletionEvent =
  | {
      type: "text-delta";
      text: string;
    }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      argumentsText: string;
    }
  | {
      type: "done";
      finishReason?: string;
      sources?: AIChatSource[];
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
    // The SDK requires an apiKey option, but AppShell authenticates AI Gateway requests
    // through authClient.fetch(...), which injects the real Authorization / DPoP headers.
    // This placeholder value is never used for actual Tailor Platform authentication.
    apiKey: "tailor-platform-ai-gateway",
    // Browser usage is acceptable here because requests do not rely on a long-lived OpenAI API key.
    // The real auth path stays inside authClient.fetch(...), which obtains fresh auth headers per request
    // for Tailor Platform's AI Gateway instead of exposing provider credentials to the browser.
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
    // Tailor Platform's AI Gateway does not allow the OpenAI SDK's X-Stainless-* headers
    // in browser CORS preflight checks, so unset them here.
    defaultHeaders: {
      "X-Stainless-Lang": null,
      "X-Stainless-Package-Version": null,
      "X-Stainless-OS": null,
      "X-Stainless-Arch": null,
      "X-Stainless-Runtime": null,
      "X-Stainless-Runtime-Version": null,
      "X-Stainless-Retry-Count": null,
      "X-Stainless-Timeout": null,
    },
    fetch: (input, init) => config.authClient.fetch(input as RequestInfo | URL, init),
  });
}

function shouldUseJSONRoute(request: AIGatewayChatRequest): boolean {
  return request.model.startsWith("gemini-");
}

async function* streamOpenAICompatibleResponse(input: {
  client: OpenAI;
  request: AIGatewayChatRequest;
}): AsyncGenerator<AIChatCompletionEvent, void, unknown> {
  try {
    const stream = (await input.client.chat.completions.create(
      buildChatRequestBody(input.request, true),
      {
        signal: input.request.signal,
      },
    )) as AsyncIterable<ChatCompletionChunk>;

    let finishReason: string | undefined;
    let sources: AIChatSource[] | undefined;
    const toolCalls = new Map<number, Partial<AIGatewayToolCall>>();

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      const delta = extractStreamingText(choice);
      finishReason = extractFinishReason(choice?.finish_reason) ?? finishReason;
      sources = extractSources(choice) ?? sources;
      collectStreamingToolCalls(toolCalls, choice);

      if (delta) {
        yield { type: "text-delta", text: delta };
      }
    }

    for (const toolCall of finalizeStreamingToolCalls(toolCalls)) {
      yield {
        type: "tool-call",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        argumentsText: toolCall.argumentsText,
      };
    }

    yield createDoneEvent(finishReason, sources);
  } catch (error) {
    throw normalizeGatewayError(error, input.request.signal);
  }
}

async function* streamJSONResponse(input: {
  client: OpenAI;
  request: AIGatewayChatRequest;
}): AsyncGenerator<AIChatCompletionEvent, void, unknown> {
  try {
    const completion = (await input.client.chat.completions.create(
      buildChatRequestBody(input.request, false),
      {
        signal: input.request.signal,
      },
    )) as ChatCompletion;

    const choice = completion.choices[0];
    const text = extractFinalText(choice);

    if (text) {
      yield { type: "text-delta", text };
    }

    for (const toolCall of extractToolCalls(choice)) {
      yield {
        type: "tool-call",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        argumentsText: toolCall.argumentsText,
      };
    }

    yield createDoneEvent(extractFinishReason(choice?.finish_reason), extractSources(choice));
  } catch (error) {
    throw normalizeGatewayError(error, input.request.signal);
  }
}

function buildChatRequestBody(
  request: AIGatewayChatRequest,
  stream: boolean,
): Parameters<OpenAI["chat"]["completions"]["create"]>[0] {
  return {
    model: request.model,
    messages: request.messages.map(toOpenAIMessage),
    ...(request.tools?.length ? { tools: request.tools } : {}),
    stream,
  } as Parameters<OpenAI["chat"]["completions"]["create"]>[0];
}

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function toOpenAIMessage(message: AIGatewayChatMessage): ChatCompletionMessageParam {
  if (message.role === "assistant") {
    return {
      role: "assistant",
      ...(message.content !== undefined ? { content: message.content } : { content: null }),
      ...(message.toolCalls?.length
        ? {
            tool_calls: message.toolCalls.map((toolCall) => ({
              id: toolCall.id,
              type: "function",
              function: {
                name: toolCall.name,
                arguments: toolCall.argumentsText,
              },
            })),
          }
        : {}),
    } as ChatCompletionMessageParam;
  }

  if (message.role === "tool") {
    return {
      role: "tool",
      tool_call_id: message.toolCallId,
      content: message.content,
    } as ChatCompletionMessageParam;
  }

  return {
    role: message.role,
    content: message.content,
  };
}

function collectStreamingToolCalls(
  toolCalls: Map<number, Partial<AIGatewayToolCall>>,
  choice: ChatCompletionChunk["choices"][number] | undefined,
): void {
  for (const toolCallDelta of choice?.delta?.tool_calls ?? []) {
    const existing = toolCalls.get(toolCallDelta.index) ?? { argumentsText: "" };

    if (toolCallDelta.id) {
      existing.id = toolCallDelta.id;
    }

    if (toolCallDelta.function?.name) {
      existing.name = toolCallDelta.function.name;
    }

    if (toolCallDelta.function?.arguments) {
      existing.argumentsText = `${existing.argumentsText ?? ""}${toolCallDelta.function.arguments}`;
    }

    toolCalls.set(toolCallDelta.index, existing);
  }
}

function finalizeStreamingToolCalls(
  toolCalls: Map<number, Partial<AIGatewayToolCall>>,
): AIGatewayToolCall[] {
  return [...toolCalls.entries()]
    .toSorted(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([, toolCall]) => ({
      id: toolCall.id ?? crypto.randomUUID(),
      name: toolCall.name ?? "",
      argumentsText: toolCall.argumentsText ?? "",
    }))
    .filter((toolCall) => toolCall.name.length > 0);
}

function extractToolCalls(
  choice: ChatCompletion["choices"][number] | undefined,
): AIGatewayToolCall[] {
  return (choice?.message?.tool_calls ?? [])
    .filter((toolCall) => toolCall.type === "function")
    .map((toolCall) => ({
      id: toolCall.id ?? crypto.randomUUID(),
      name: toolCall.function.name,
      argumentsText: toolCall.function.arguments,
    }))
    .filter((toolCall) => toolCall.name.length > 0);
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

function extractSources(value: unknown): AIChatSource[] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if ("message" in value) {
    return extractSources((value as { message?: unknown }).message);
  }

  if ("delta" in value) {
    return extractSources((value as { delta?: unknown }).delta);
  }

  if (!("sources" in value) || !Array.isArray(value.sources)) {
    return undefined;
  }

  const sources = value.sources
    .map((source) => {
      if (!source || typeof source !== "object") {
        return null;
      }

      if ((source as { type?: unknown }).type !== "url") {
        return null;
      }

      const url = (source as { url?: unknown }).url;
      if (typeof url !== "string" || url.length === 0) {
        return null;
      }

      const title = (source as { title?: unknown }).title;
      return {
        type: "url" as const,
        url,
        ...(typeof title === "string" && title.length > 0 ? { title } : {}),
      };
    })
    .filter((source) => source !== null);

  return sources.length > 0 ? sources : undefined;
}

function extractFinishReason(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function createDoneEvent(finishReason?: string, sources?: AIChatSource[]): AIChatCompletionEvent {
  return {
    type: "done",
    ...(finishReason ? { finishReason } : {}),
    ...(sources?.length ? { sources } : {}),
  };
}

function normalizeGatewayError(error: unknown, signal?: AbortSignal): Error {
  if (signal?.aborted || isAbortError(error)) {
    return createAbortError();
  }

  return error instanceof Error ? error : new Error(String(error));
}

export function isAbortError(error: unknown): boolean {
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
