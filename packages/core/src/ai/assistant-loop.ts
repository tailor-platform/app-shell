import type {
  AIGatewayChatMessage,
  AIGatewayClient,
  AIGatewayFunctionTool,
  AIGatewayProviderTool,
  AIGatewayTool,
  AIGatewayToolCall,
  AIChatSource,
} from "./client";
import type { AIChatConfiguredTool, AILocalTool } from "./tools";
import { deriveVisibleMessages, resolveToolCalls } from "./tool-execution";

const MAX_TOOL_ROUNDS = 8;

/**
 * Splits the public tools object into:
 * - normalized AI Gateway tool definitions sent over the wire
 * - local tool executors kept for in-process validation and execution
 */
function normalizeConfiguredTools(tools: Record<string, AIChatConfiguredTool> | undefined): {
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

export interface AIChatAssistantTurnResult {
  gatewayAssistantMessage: Extract<AIGatewayChatMessage, { role: "assistant" }>;
  toolCalls: AIGatewayToolCall[];
}

export type AssistantLoopEvent =
  | { type: "text-delta"; delta: string }
  | { type: "sources"; sources: AIChatSource[] }
  | { type: "turn-end"; turn: AIChatAssistantTurnResult }
  | { type: "tool-resolution-start" }
  | {
      type: "tool-results";
      messages: Extract<AIGatewayChatMessage, { role: "tool" }>[];
    }
  | { type: "complete" };

/**
 * Pure async generator that runs the multi-turn assistant loop.
 * Yields events for the consumer to translate into state changes.
 * Manages transcript internally — the caller only provides the initial transcript.
 */
export async function* runAssistantLoop(input: {
  client: AIGatewayClient;
  model: string;
  tools: Record<string, AIChatConfiguredTool> | undefined;
  transcript: AIGatewayChatMessage[];
  signal: AbortSignal;
}): AsyncGenerator<AssistantLoopEvent> {
  const { gatewayTools, localTools } = normalizeConfiguredTools(input.tools);
  const transcript = [...input.transcript];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const turn: AIChatAssistantTurnResult = yield* streamAssistantTurn({
      client: input.client,
      model: input.model,
      tools: gatewayTools,
      transcript,
      signal: input.signal,
    });

    if (turn.gatewayAssistantMessage.content || turn.toolCalls.length > 0) {
      transcript.push(turn.gatewayAssistantMessage);
    }

    yield { type: "turn-end", turn };

    if (turn.toolCalls.length === 0) {
      yield { type: "complete" };
      return;
    }

    yield { type: "tool-resolution-start" };

    const toolMessages = await resolveToolCalls({
      toolCalls: turn.toolCalls,
      localTools,
      signal: input.signal,
      visibleMessages: deriveVisibleMessages(transcript),
    });

    transcript.push(...toolMessages);
    yield { type: "tool-results", messages: toolMessages };
  }

  throw new Error(`AI chat exceeded the maximum number of tool rounds (${MAX_TOOL_ROUNDS}).`);
}

/**
 * Streams one assistant turn from the AI Gateway.
 * Yields text-delta and sources events as they arrive.
 * Returns the collected turn result (content + tool calls) via generator return.
 */
async function* streamAssistantTurn(input: {
  client: AIGatewayClient;
  model: string;
  tools: AIGatewayTool[];
  transcript: AIGatewayChatMessage[];
  signal: AbortSignal;
}): AsyncGenerator<AssistantLoopEvent, AIChatAssistantTurnResult> {
  let content = "";
  const toolCalls: AIGatewayToolCall[] = [];

  for await (const event of input.client.streamChatCompletion({
    model: input.model,
    messages: input.transcript,
    ...(input.tools.length > 0 ? { tools: input.tools } : {}),
    signal: input.signal,
  })) {
    if (event.type === "text-delta") {
      content = `${content}${event.text}`;
      yield { type: "text-delta", delta: event.text };
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

    if (event.sources?.length) {
      yield { type: "sources", sources: event.sources };
    }
  }

  return {
    gatewayAssistantMessage: {
      role: "assistant",
      ...(content ? { content } : {}),
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
    },
    toolCalls,
  };
}
