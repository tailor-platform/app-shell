import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "./client";
import type {
  AIGatewayChatMessage,
  AIGatewayClient,
  AIGatewayFunctionTool,
  AIGatewayProviderTool,
  AIGatewayTool,
  AIGatewayToolCall,
  AIChatSource,
} from "./client";
import type { AIChatConfiguredTool, AIChatToolContext, AILocalTool } from "./tools";

const MAX_TOOL_ROUNDS = 8;

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AIChatSource[];
}

export type AIChatStatus = "ready" | "submitted" | "streaming" | "error";

export function useAIChat(config: {
  client: AIGatewayClient;
  model: string;
  tools?: Record<string, AIChatConfiguredTool>;
}): {
  messages: AIChatMessage[];
  status: AIChatStatus;
  error?: Error;
  /**
   * Returns true when the message is sent and the stream finishes successfully.
   * Returns false when the call is ignored, aborted, or the request fails.
   */
  sendMessage: (message: string) => Promise<boolean>;
  stop: () => void;
} {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [status, setStatus] = useState<AIChatStatus>("ready");
  const [error, setError] = useState<Error | undefined>(undefined);
  const messagesRef = useRef<AIChatMessage[]>([]);
  const gatewayMessagesRef = useRef<AIGatewayChatMessage[]>([]);
  const activeRequestRef = useRef<symbol | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateMessages = useCallback((updater: (previous: AIChatMessage[]) => AIChatMessage[]) => {
    setMessages((previous) => {
      const next = updater(previous);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    const controller = abortControllerRef.current;

    if (!controller) {
      return;
    }

    activeRequestRef.current = null;
    abortControllerRef.current = null;
    controller.abort();
    setStatus("ready");
  }, []);

  useEffect(() => {
    return () => {
      activeRequestRef.current = null;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (activeRequestRef.current) {
        return false;
      }

      const text = message.trim();
      if (!text) {
        return false;
      }

      const userMessage: AIChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };

      const nextMessages = [...messagesRef.current, userMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setError(undefined);
      setStatus("submitted");
      gatewayMessagesRef.current = [...gatewayMessagesRef.current, toGatewayMessage(userMessage)];

      const controller = new AbortController();
      const requestId = Symbol();
      activeRequestRef.current = requestId;
      abortControllerRef.current = controller;
      const isActive = () => activeRequestRef.current === requestId;

      try {
        const { gatewayTools, localTools } = normalizeTools(config.tools);

        for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
          if (!isActive()) {
            return false;
          }

          const turnResult = await runAssistantTurn({
            client: config.client,
            model: config.model,
            messages: gatewayMessagesRef.current,
            tools: gatewayTools,
            signal: controller.signal,
            isActive,
            setStatus,
            updateMessages,
          });

          if (!isActive()) {
            return false;
          }

          if (turnResult.publicAssistantMessage) {
            gatewayMessagesRef.current = [
              ...gatewayMessagesRef.current,
              turnResult.gatewayAssistantMessage,
            ];
          } else if (turnResult.toolCalls.length > 0) {
            gatewayMessagesRef.current = [
              ...gatewayMessagesRef.current,
              turnResult.gatewayAssistantMessage,
            ];
          }

          if (turnResult.toolCalls.length === 0) {
            setStatus("ready");
            return true;
          }

          setStatus("submitted");
          const toolMessages = await executeToolCalls({
            toolCalls: turnResult.toolCalls,
            localTools,
            signal: controller.signal,
            visibleMessages: messagesRef.current,
          });

          if (!isActive()) {
            return false;
          }

          gatewayMessagesRef.current = [...gatewayMessagesRef.current, ...toolMessages];
        }

        throw new Error(`AI chat exceeded the maximum number of tool rounds (${MAX_TOOL_ROUNDS}).`);
      } catch (caughtError) {
        if (!isActive()) {
          return false;
        }

        if (isAbortError(caughtError)) {
          setStatus("ready");
          return false;
        }

        setError(toError(caughtError));
        setStatus("error");
        return false;
      } finally {
        if (activeRequestRef.current === requestId) {
          activeRequestRef.current = null;
        }

        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [config.client, config.model, config.tools, updateMessages],
  );

  return {
    messages,
    status,
    error,
    sendMessage,
    stop,
  };
}

async function runAssistantTurn(input: {
  client: AIGatewayClient;
  model: string;
  messages: AIGatewayChatMessage[];
  tools: AIGatewayTool[];
  signal: AbortSignal;
  isActive: () => boolean;
  setStatus: (status: AIChatStatus) => void;
  updateMessages: (updater: (previous: AIChatMessage[]) => AIChatMessage[]) => void;
}): Promise<{
  gatewayAssistantMessage: Extract<AIGatewayChatMessage, { role: "assistant" }>;
  publicAssistantMessage?: AIChatMessage;
  toolCalls: AIGatewayToolCall[];
}> {
  let assistantMessageId: string | null = null;
  let assistantContent = "";
  let assistantSources: AIChatSource[] | undefined;
  const toolCalls: AIGatewayToolCall[] = [];

  for await (const event of input.client.streamChatCompletion({
    model: input.model,
    messages: input.messages,
    ...(input.tools.length > 0 ? { tools: input.tools } : {}),
    signal: input.signal,
  })) {
    if (!input.isActive()) {
      break;
    }

    if (event.type === "text-delta") {
      assistantContent = `${assistantContent}${event.text}`;
      input.setStatus("streaming");

      if (!assistantMessageId) {
        assistantMessageId = crypto.randomUUID();
        input.updateMessages((previous) => [
          ...previous,
          {
            id: assistantMessageId!,
            role: "assistant",
            content: event.text,
          },
        ]);
        continue;
      }

      input.updateMessages((previous) =>
        previous.map((entry) =>
          entry.id === assistantMessageId ? { ...entry, content: assistantContent } : entry,
        ),
      );
      continue;
    }

    if (event.type === "tool-call") {
      toolCalls.push({
        id: event.toolCallId,
        name: event.toolName,
        argumentsText: event.argumentsText,
      });
      continue;
    }

    assistantSources = event.sources;
  }

  if (assistantMessageId && assistantSources?.length) {
    input.updateMessages((previous) =>
      previous.map((entry) =>
        entry.id === assistantMessageId ? { ...entry, sources: assistantSources } : entry,
      ),
    );
  }

  const gatewayAssistantMessage: Extract<AIGatewayChatMessage, { role: "assistant" }> = {
    role: "assistant",
    ...(assistantContent ? { content: assistantContent } : {}),
    ...(toolCalls.length > 0 ? { toolCalls } : {}),
  };

  return {
    gatewayAssistantMessage,
    ...(assistantMessageId
      ? {
          publicAssistantMessage: {
            id: assistantMessageId,
            role: "assistant",
            content: assistantContent,
            ...(assistantSources?.length ? { sources: assistantSources } : {}),
          },
        }
      : {}),
    toolCalls,
  };
}

function normalizeTools(tools: Record<string, AIChatConfiguredTool> | undefined): {
  gatewayTools: AIGatewayTool[];
  localTools: Map<string, AILocalTool>;
} {
  if (!tools) {
    return {
      gatewayTools: [],
      localTools: new Map(),
    };
  }

  const localTools = new Map<string, AILocalTool>();
  const gatewayTools = Object.entries(tools).map(([name, tool]) => {
    if (tool.kind === "local") {
      localTools.set(name, tool);
      return {
        type: "function",
        function: {
          name,
          ...(tool.description ? { description: tool.description } : {}),
          parameters: tool.schema["~standard"].jsonSchema.input({ target: "draft-07" }),
        },
      } satisfies AIGatewayFunctionTool;
    }

    return {
      type: "provider",
      provider: "openai",
      name: "web_search",
      ...(tool.options ? { options: tool.options } : {}),
    } satisfies AIGatewayProviderTool;
  });

  return {
    gatewayTools,
    localTools,
  };
}

async function executeToolCalls(input: {
  toolCalls: AIGatewayToolCall[];
  localTools: Map<string, AILocalTool>;
  signal: AbortSignal;
  visibleMessages: AIChatMessage[];
}): Promise<Extract<AIGatewayChatMessage, { role: "tool" }>[]> {
  const messages: Extract<AIGatewayChatMessage, { role: "tool" }>[] = [];

  for (const toolCall of input.toolCalls) {
    if (input.signal.aborted) {
      throw createAbortError();
    }

    messages.push(
      await executeToolCall({
        toolCall,
        localTools: input.localTools,
        context: {
          signal: input.signal,
          messages: input.visibleMessages,
        },
      }),
    );
  }

  return messages;
}

async function executeToolCall(input: {
  toolCall: AIGatewayToolCall;
  localTools: Map<string, AILocalTool>;
  context: AIChatToolContext;
}): Promise<Extract<AIGatewayChatMessage, { role: "tool" }>> {
  const tool = input.localTools.get(input.toolCall.name);

  if (!tool) {
    return {
      role: "tool",
      toolCallId: input.toolCall.id,
      content: JSON.stringify({ error: `Unknown tool: ${input.toolCall.name}` }),
    };
  }

  try {
    const rawArguments = parseToolArguments(input.toolCall.argumentsText);
    const result = await tool.schema["~standard"].validate(rawArguments);

    if (result.issues) {
      return {
        role: "tool",
        toolCallId: input.toolCall.id,
        content: JSON.stringify({ error: result.issues.map((issue) => issue.message).join("; ") }),
      };
    }

    const output = await tool.execute(result.value, input.context);
    return {
      role: "tool",
      toolCallId: input.toolCall.id,
      content: stringifyToolResult(output),
    };
  } catch (error) {
    return {
      role: "tool",
      toolCallId: input.toolCall.id,
      content: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    };
  }
}

function parseToolArguments(argumentsText: string): unknown {
  const text = argumentsText.trim();
  return text ? JSON.parse(text) : {};
}

function stringifyToolResult(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return "null";
  }

  return JSON.stringify(value);
}

function toGatewayMessage(message: AIChatMessage): { role: "user"; content: string } {
  return {
    role: "user",
    content: message.content,
  };
}

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
