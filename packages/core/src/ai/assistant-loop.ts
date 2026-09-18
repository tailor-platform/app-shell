import type {
  AIGatewayChatMessage,
  AIGatewayClient,
  AIGatewayFunctionTool,
  AIGatewayProviderTool,
  AIGatewayTool,
  AIGatewayToolCall,
  AIChatSource,
} from "./client";
import type { AIChatMCPConnection, AIChatMCPServerConfig, AIChatMCPTool } from "./mcp";
import type { AIChatConfiguredTool } from "./tools";
import { deriveVisibleMessages, resolveToolCalls, type AIChatToolExecutor } from "./tool-execution";

const MAX_TOOL_ROUNDS = 8;

/**
 * Splits the public tools object into:
 * - normalized AI Gateway tool definitions sent over the wire
 * - local and MCP tool executors kept for in-process execution
 */
async function normalizeConfiguredTools(input: {
  tools: Record<string, AIChatConfiguredTool> | undefined;
  mcpServers: Record<string, AIChatMCPServerConfig> | undefined;
  signal: AbortSignal;
}): Promise<{
  gatewayTools: AIGatewayTool[];
  executors: Map<string, AIChatToolExecutor>;
  close: () => Promise<void>;
}> {
  const gatewayTools: AIGatewayTool[] = [];
  const executors = new Map<string, AIChatToolExecutor>();
  const connections: AIChatMCPConnection[] = [];

  try {
    for (const [name, tool] of Object.entries(input.tools ?? {})) {
      if (tool.kind === "local") {
        addFunctionTool({
          name,
          description: tool.description,
          parameters: tool.schema["~standard"].jsonSchema.input({ target: "draft-07" }),
          executor: { kind: "local", tool },
          gatewayTools,
          executors,
        });
        continue;
      }

      gatewayTools.push({
        type: "provider",
        provider: "openai",
        name: "web_search",
        ...(tool.options ? { options: tool.options } : {}),
      } satisfies AIGatewayProviderTool);
    }

    for (const [serverName, config] of Object.entries(input.mcpServers ?? {})) {
      if (config.allowedTools.length === 0) {
        throw new Error(`MCP server "${serverName}" must specify at least one allowed tool.`);
      }

      const connection = await config.server.connect({ signal: input.signal });
      connections.push(connection);
      const availableTools = await connection.listTools({ signal: input.signal });
      const selectedTools = selectMCPTools(serverName, config.allowedTools, availableTools);

      for (const tool of selectedTools) {
        addFunctionTool({
          name: `${serverName}__${tool.name}`,
          description: tool.description,
          parameters: tool.inputSchema,
          executor: { kind: "mcp", connection, name: tool.name },
          gatewayTools,
          executors,
        });
      }
    }
  } catch (error) {
    await closeConnections(connections);
    throw error;
  }

  return {
    gatewayTools,
    executors,
    close: () => closeConnections(connections),
  };
}

function addFunctionTool(input: {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
  executor: AIChatToolExecutor;
  gatewayTools: AIGatewayTool[];
  executors: Map<string, AIChatToolExecutor>;
}): void {
  if (input.executors.has(input.name)) {
    throw new Error(`Duplicate AI chat tool name: ${input.name}`);
  }

  input.executors.set(input.name, input.executor);
  input.gatewayTools.push({
    type: "function",
    function: {
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      parameters: input.parameters,
    },
  } satisfies AIGatewayFunctionTool);
}

function selectMCPTools(
  serverName: string,
  allowedTools: readonly string[],
  availableTools: AIChatMCPTool[],
): AIChatMCPTool[] {
  const availableByName = new Map(availableTools.map((tool) => [tool.name, tool]));

  return allowedTools.map((name) => {
    const tool = availableByName.get(name);
    if (!tool) {
      throw new Error(`MCP server "${serverName}" does not provide allowed tool "${name}".`);
    }
    return tool;
  });
}

async function closeConnections(connections: AIChatMCPConnection[]): Promise<void> {
  await Promise.allSettled(connections.map((connection) => connection.close()));
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
  mcpServers: Record<string, AIChatMCPServerConfig> | undefined;
  transcript: AIGatewayChatMessage[];
  signal: AbortSignal;
}): AsyncGenerator<AssistantLoopEvent> {
  const resolvedTools = await normalizeConfiguredTools({
    tools: input.tools,
    mcpServers: input.mcpServers,
    signal: input.signal,
  });
  const transcript = [...input.transcript];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const turn: AIChatAssistantTurnResult = yield* streamAssistantTurn({
        client: input.client,
        model: input.model,
        tools: resolvedTools.gatewayTools,
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
        tools: resolvedTools.executors,
        signal: input.signal,
        visibleMessages: deriveVisibleMessages(transcript),
      });

      transcript.push(...toolMessages);
      yield { type: "tool-results", messages: toolMessages };
    }

    throw new Error(`AI chat exceeded the maximum number of tool rounds (${MAX_TOOL_ROUNDS}).`);
  } finally {
    await resolvedTools.close();
  }
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
