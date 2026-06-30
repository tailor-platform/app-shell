import { useCallback, useEffect, useRef, useState } from "react";
import type { AIGatewayChatMessage, AIGatewayClient } from "./client";

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type AIChatStatus = "ready" | "submitted" | "streaming" | "error";

export function useAIChat(config: { client: AIGatewayClient; model: string }): {
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateMessages = useCallback((updater: (previous: AIChatMessage[]) => AIChatMessage[]) => {
    setMessages((previous) => {
      const next = updater(previous);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (abortControllerRef.current) {
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

      const controller = new AbortController();
      abortControllerRef.current = controller;
      let assistantMessageId: string | null = null;

      try {
        for await (const delta of config.client.chatCompletionStream({
          model: config.model,
          messages: nextMessages.map(toGatewayMessage),
          signal: controller.signal,
        })) {
          if (!delta) {
            continue;
          }

          setStatus("streaming");

          if (!assistantMessageId) {
            assistantMessageId = crypto.randomUUID();
            updateMessages((previous) => [
              ...previous,
              {
                id: assistantMessageId!,
                role: "assistant",
                content: delta,
              },
            ]);
            continue;
          }

          updateMessages((previous) =>
            previous.map((entry) =>
              entry.id === assistantMessageId
                ? { ...entry, content: `${entry.content}${delta}` }
                : entry,
            ),
          );
        }

        setStatus("ready");
        return true;
      } catch (caughtError) {
        if (isAbortError(caughtError)) {
          setStatus("ready");
          return false;
        }

        setError(toError(caughtError));
        setStatus("error");
        return false;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [config.client, config.model, updateMessages],
  );

  return {
    messages,
    status,
    error,
    sendMessage,
    stop,
  };
}

function toGatewayMessage(message: AIChatMessage): AIGatewayChatMessage {
  return {
    role: message.role,
    content: message.content,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
