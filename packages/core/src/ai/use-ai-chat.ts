import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "./client";
import type { AIGatewayChatMessage, AIGatewayClient } from "./client";
import {
  runAssistantLoop,
  type AIChatAssistantTurnResult,
  type AssistantLoopEvent,
} from "./assistant-loop";
import type { AILocalTool, AIChatToolPart } from "./tools";
import type { AIGatewayToolCall } from "./client";

/** Ordered text and tool-owned display parts retained in the public conversation. */
export type AIChatMessagePart =
  | { id: string; type: "text"; text: string }
  | {
      id: string;
      type: "tool-call";
      toolCallId: string;
      name: string;
      parts: AIChatToolPart[];
    };

/** Public chat message shape exposed by `useAIChat()`. */
export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Ordered display parts. content remains the message's plain text for existing callers. */
  parts?: AIChatMessagePart[];
}

type ChatMessage = AIChatMessage & { parts: AIChatMessagePart[] };

export type AIChatStatus = "ready" | "submitted" | "streaming" | "error";

type ActiveToolCall = { id: string; name: string };

/** Active request handle stored in the ref for staleness checks + cancellation. */
interface ActiveHandle {
  readonly controller: AbortController;
  readonly ctx: ChatRequestContext;
}

/**
 * Encapsulates per-request mutable state: transcript staging + streaming turn buffer.
 *
 * Success commits the full transcript; interruption preserves completed tool
 * exchanges and visible text without retaining unanswered tool calls.
 */
class ChatRequestContext {
  transcript: AIGatewayChatMessage[];
  private turnMessageId: string | null = null;
  private toolTurnMessageId: string | null = null;
  private turnContent = "";

  constructor(initialTranscript: AIGatewayChatMessage[]) {
    this.transcript = [...initialTranscript];
  }

  /** Appends a text delta to the current turn buffer, lazily creating a message id. */
  appendDelta(delta: string): { messageId: string; content: string; isNew: boolean } {
    this.turnContent = `${this.turnContent}${delta}`;
    const isNew = !this.turnMessageId;
    if (isNew) {
      this.turnMessageId = crypto.randomUUID();
    }
    return { messageId: this.turnMessageId!, content: this.turnContent, isNew };
  }

  commitTurn(turn: AIChatAssistantTurnResult): void {
    if (turn.gatewayAssistantMessage.content || turn.toolCalls.length > 0) {
      this.transcript.push(turn.gatewayAssistantMessage);
    }
    this.toolTurnMessageId = this.turnMessageId;
    this.turnMessageId = null;
    this.turnContent = "";
  }

  appendToolPart(
    toolCall: AIGatewayToolCall,
    part: AIChatToolPart,
  ): {
    messageId: string;
    part: Extract<AIChatMessagePart, { type: "tool-call" }>;
  } {
    this.toolTurnMessageId ??= crypto.randomUUID();
    return {
      messageId: this.toolTurnMessageId,
      part: {
        id: `${this.toolTurnMessageId}:${toolCall.id}`,
        type: "tool-call",
        toolCallId: toolCall.id,
        name: toolCall.name,
        parts: [part],
      },
    };
  }

  commitToolResults(messages: Extract<AIGatewayChatMessage, { role: "tool" }>[]): void {
    this.transcript.push(...messages);
  }

  snapshotInterruptedTranscript(): AIGatewayChatMessage[] {
    const transcript = [...this.transcript];
    const last = transcript.at(-1);

    // Tool results arrive as a complete batch, so only the tail can be unanswered.
    if (last?.role === "assistant" && last.toolCalls?.length) {
      transcript.pop();
      if (last.content) {
        transcript.push({ role: "assistant", content: last.content });
      }
    }
    if (this.turnContent) {
      transcript.push({ role: "assistant", content: this.turnContent });
    }

    return transcript;
  }
}

/**
 * React hook for AI Gateway chat with optional local tools.
 *
 * Plain text stays available in content. Ordered parts also retain tool-emitted display data.
 * Requested tool names are transient; tool-call and tool-result protocol messages stay internal.
 */
export function useAIChat(config: {
  client: AIGatewayClient;
  model: string;
  tools?: Record<string, AILocalTool>;
}): {
  messages: ChatMessage[];
  /** Requested tools in the active flow; cleared on completion, stop, or error. */
  toolCalls: ActiveToolCall[];
  status: AIChatStatus;
  error?: Error;
  /**
   * Returns true when the message is sent and the stream finishes successfully.
   * Returns false when the call is ignored, aborted, or the request fails.
   */
  sendMessage: (message: string) => Promise<boolean>;
  stop: () => void;
} {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<ActiveToolCall[]>([]);
  const [status, setStatus] = useState<AIChatStatus>("ready");
  const [error, setError] = useState<Error | undefined>(undefined);
  const transcriptRef = useRef<AIGatewayChatMessage[]>([]);
  const activeRef = useRef<ActiveHandle | null>(null);

  const updateMessages = useCallback((updater: (previous: ChatMessage[]) => ChatMessage[]) => {
    setMessages((previous) => updater(previous));
  }, []);

  const stop = useCallback(() => {
    const active = activeRef.current;
    if (!active) return;

    transcriptRef.current = active.ctx.snapshotInterruptedTranscript();
    activeRef.current = null;
    active.controller.abort();
    setToolCalls([]);
    setStatus("ready");
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current?.controller.abort();
      activeRef.current = null;
    };
  }, []);

  const sendMessage = useCallback(
    async (message: string): Promise<boolean> => {
      if (activeRef.current) return false;

      const text = message.trim();
      if (!text) return false;

      const userId = crypto.randomUUID();
      const userMessage: ChatMessage = {
        id: userId,
        role: "user",
        content: text,
        parts: [{ id: `${userId}:text`, type: "text", text }],
      };

      updateMessages((previous) => [...previous, userMessage]);
      setToolCalls([]);
      setError(undefined);
      setStatus("submitted");

      const ctx = new ChatRequestContext([
        ...transcriptRef.current,
        { role: "user", content: text },
      ]);
      const controller = new AbortController();
      const handle: ActiveHandle = { controller, ctx };
      activeRef.current = handle;

      try {
        for await (const event of runAssistantLoop({
          client: config.client,
          model: config.model,
          tools: config.tools,
          transcript: ctx.transcript,
          signal: controller.signal,
          onToolPart(toolCall, displayPart) {
            if (activeRef.current !== handle || controller.signal.aborted) return;
            const { messageId, part } = ctx.appendToolPart(toolCall, displayPart);
            updateMessages((previous) => {
              if (!previous.some((entry) => entry.id === messageId)) {
                return [
                  ...previous,
                  { id: messageId, role: "assistant", content: "", parts: [part] },
                ];
              }
              return previous.map((entry) => {
                if (entry.id !== messageId) return entry;
                const existing = entry.parts.some((item) => item.id === part.id);
                return {
                  ...entry,
                  parts: existing
                    ? entry.parts.map((item) =>
                        item.id === part.id && item.type === "tool-call"
                          ? { ...item, parts: [...item.parts, displayPart] }
                          : item,
                      )
                    : [...entry.parts, part],
                };
              });
            });
          },
        })) {
          if (activeRef.current !== handle) break;
          applyEvent(event, ctx, updateMessages, setStatus, setToolCalls);
        }

        if (activeRef.current !== handle) return false;

        // Commit staged transcript to persistent history
        transcriptRef.current = ctx.transcript;
        activeRef.current = null;
        setToolCalls([]);
        setStatus("ready");
        return true;
      } catch (caughtError) {
        if (activeRef.current !== handle) return false;
        transcriptRef.current = ctx.snapshotInterruptedTranscript();
        activeRef.current = null;
        setToolCalls([]);

        if (isAbortError(caughtError)) {
          setStatus("ready");
          return false;
        }

        setError(toError(caughtError));
        setStatus("error");
        return false;
      }
    },
    [config.client, config.model, config.tools, updateMessages],
  );

  return { messages, toolCalls, status, error, sendMessage, stop };
}

/** Single dispatch point: loop events → React state updates + context mutations. */
function applyEvent(
  event: AssistantLoopEvent,
  ctx: ChatRequestContext,
  updateMessages: (updater: (previous: ChatMessage[]) => ChatMessage[]) => void,
  setStatus: (status: AIChatStatus) => void,
  setToolCalls: (updater: (previous: ActiveToolCall[]) => ActiveToolCall[]) => void,
): void {
  switch (event.type) {
    case "text-delta": {
      const { messageId, content, isNew } = ctx.appendDelta(event.delta);
      setStatus("streaming");

      if (isNew) {
        updateMessages((previous) => [
          ...previous,
          {
            id: messageId,
            role: "assistant",
            content,
            parts: [{ id: `${messageId}:text`, type: "text", text: content }],
          },
        ]);
      } else {
        updateMessages((previous) =>
          previous.map((entry) =>
            entry.id === messageId
              ? {
                  ...entry,
                  content,
                  parts: entry.parts.map((part) =>
                    part.type === "text" ? { ...part, text: content } : part,
                  ),
                }
              : entry,
          ),
        );
      }
      break;
    }

    case "turn-end": {
      if (event.turn.toolCalls.length > 0) {
        const calls = event.turn.toolCalls.map(({ id, name }) => ({ id, name }));
        setToolCalls((previous) => [...previous, ...calls]);
      }
      ctx.commitTurn(event.turn);
      break;
    }

    case "tool-resolution-start": {
      setStatus("submitted");
      break;
    }

    case "tool-results": {
      ctx.commitToolResults(event.messages);
      break;
    }

    case "complete": {
      break;
    }
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
