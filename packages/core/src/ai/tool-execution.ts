import type { AIGatewayChatMessage, AIGatewayToolCall } from "./client";
import type { AIChatMessage } from "./use-ai-chat";
import type { AIChatToolContext, AILocalTool } from "./tools";

/**
 * Executes requested local tools in call order and converts their outputs into
 * internal `role: "tool"` transcript messages for the next model round.
 */
export async function resolveToolCalls(input: {
  toolCalls: AIGatewayToolCall[];
  localTools: Map<string, AILocalTool>;
  signal: AbortSignal;
  visibleMessages: AIChatToolContext["messages"];
}): Promise<Extract<AIGatewayChatMessage, { role: "tool" }>[]> {
  const messages: Extract<AIGatewayChatMessage, { role: "tool" }>[] = [];

  for (const toolCall of input.toolCalls) {
    if (input.signal.aborted) {
      throw createAbortError();
    }

    messages.push(
      await resolveToolCall({
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

/**
 * Validates, executes, and stringifies one local tool call.
 *
 * Tool failures are converted into tool result payloads so the model can
 * recover in-band instead of failing the entire chat request.
 */
async function resolveToolCall(input: {
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

/**
 * Derives the user/assistant visible messages from the full transcript.
 * Used to provide conversation context to tool executors.
 */
export function deriveVisibleMessages(transcript: AIGatewayChatMessage[]): AIChatMessage[] {
  const result: AIChatMessage[] = [];

  for (const message of transcript) {
    if (message.role === "user") {
      // ponytail: ids are placeholders — tool executors only read content, not ids
      result.push({ id: "", role: "user", content: message.content });
    } else if (message.role === "assistant" && message.content) {
      result.push({ id: "", role: "assistant", content: message.content });
    }
  }

  return result;
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

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}
