import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "./client";
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

      const controller = new AbortController();
      const requestId = Symbol();
      activeRequestRef.current = requestId;
      abortControllerRef.current = controller;
      let assistantMessageId: string | null = null;
      const isActive = () => activeRequestRef.current === requestId;

      try {
        for await (const event of config.client.streamChatCompletion({
          model: config.model,
          messages: nextMessages.map(toGatewayMessage),
          signal: controller.signal,
        })) {
          if (!isActive()) {
            return false;
          }

          if (event.type !== "text-delta" || !event.text) {
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
                content: event.text,
              },
            ]);
            continue;
          }

          updateMessages((previous) =>
            previous.map((entry) =>
              entry.id === assistantMessageId
                ? { ...entry, content: `${entry.content}${event.text}` }
                : entry,
            ),
          );
        }

        if (!isActive()) {
          return false;
        }

        setStatus("ready");
        return true;
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

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
