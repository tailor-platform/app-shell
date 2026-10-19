import { useMemo, useState } from "react";
import { ChevronsRight, Copy, Eraser, RefreshCw, Sparkles } from "lucide-react";
import {
  AIChat,
  Button,
  useAIChat,
  useAuth,
  useNavigate,
  type AIGatewayClient,
  type AIChatHeaderProps,
} from "@tailor-platform/app-shell";
import { aiClient } from "./ai-chat-client";
import { createAIChatTools } from "./ai-chat-tools";

type ChatProps = { header: AIChatHeaderProps; client: AIGatewayClient };

const Chat = ({ header, client }: ChatProps) => {
  const navigate = useNavigate();
  const tools = useMemo(() => createAIChatTools(navigate), [navigate]);
  const { messages, toolCalls, status, error, sendMessage, stop } = useAIChat({
    client,
    model: "gpt-4o-mini",
    tools,
  });

  const retryLastQuestion = () => {
    const lastUserTurn = [...messages].reverse().find((message) => message.role === "user");
    if (lastUserTurn) void sendMessage(lastUserTurn.content);
  };

  return (
    <AIChat status={status}>
      <AIChat.Header {...header} />
      <AIChat.Conversation>
        {error ? <p role="alert">{error.message}</p> : null}
        {messages.length === 0 ? (
          <AIChat.EmptyState
            icon={<Sparkles className="size-6 text-primary" aria-hidden />}
            title="Ask the assistant"
            description="Connected to AI Gateway (gpt-4o-mini). No order data or knowledge base is attached."
          >
            <AIChat.Suggestions>
              <AIChat.Suggestion suggestion="注文一覧を開いて" onSelect={sendMessage} />
            </AIChat.Suggestions>
          </AIChat.EmptyState>
        ) : (
          messages.map((message) => (
            <AIChat.Message key={message.id} from={message.role}>
              <AIChat.Response>{message.content}</AIChat.Response>
              {message.role === "assistant" && status === "ready" && message.content ? (
                <AIChat.Actions className="-ml-1.5">
                  <AIChat.Action
                    label="Copy"
                    onClick={() => void navigator.clipboard?.writeText(message.content)}
                  >
                    <Copy className="size-3.5" aria-hidden />
                  </AIChat.Action>
                  <AIChat.Action label="Retry" onClick={retryLastQuestion}>
                    <RefreshCw className="size-3.5" aria-hidden />
                  </AIChat.Action>
                </AIChat.Actions>
              ) : null}
            </AIChat.Message>
          ))
        )}
        {toolCalls.length > 0 ? (
          <AIChat.Message from="assistant">
            <ul aria-label="Tool calls" className="flex flex-col items-start gap-2">
              {toolCalls.map((call) => (
                <li key={call.id}>
                  <AIChat.ToolCall call={call} />
                </li>
              ))}
            </ul>
          </AIChat.Message>
        ) : null}
      </AIChat.Conversation>
      <AIChat.Composer
        onSubmit={(message) => sendMessage(message)}
        onStop={stop}
        placeholder="Ask about your orders…"
      />
    </AIChat>
  );
};

const GatewayChat = ({ header, client }: ChatProps) => {
  const { isReady, isAuthenticated, login, error } = useAuth();

  if (isAuthenticated) return <Chat header={header} client={client} />;

  return (
    <AIChat>
      <AIChat.Header {...header} />
      <AIChat.Conversation>
        <AIChat.EmptyState
          title="Sign in to chat"
          description="Sign in with the e2e workspace account to use the AI Gateway."
        >
          {error ? <p role="alert">{error}</p> : null}
          <Button disabled={!isReady} onClick={() => void login()}>
            {isReady ? "Sign in" : "Checking session…"}
          </Button>
        </AIChat.EmptyState>
      </AIChat.Conversation>
    </AIChat>
  );
};

export const AssistantChat = ({ onClose }: { onClose?: () => void }) => {
  const [conversationKey, setConversationKey] = useState(0);
  const header: AIChatHeaderProps = {
    title: "Assistant",
    icon: onClose ? (
      <AIChat.Action label="Close assistant" onClick={onClose}>
        <ChevronsRight className="size-3.5" aria-hidden />
      </AIChat.Action>
    ) : undefined,
    actions: aiClient ? (
      <AIChat.Action
        label="Clear conversation"
        onClick={() => setConversationKey((key) => key + 1)}
      >
        <Eraser className="size-3.5" aria-hidden />
      </AIChat.Action>
    ) : undefined,
  };

  return aiClient ? (
    <GatewayChat key={conversationKey} header={header} client={aiClient} />
  ) : (
    <AIChat>
      <AIChat.Header {...header} />
      <AIChat.Conversation>
        <AIChat.EmptyState
          title="AI Gateway not configured"
          description="Set VITE_TAILOR_APP_URL, VITE_TAILOR_CLIENT_ID, and VITE_TAILOR_AI_GATEWAY_URL to enable the assistant."
        />
      </AIChat.Conversation>
    </AIChat>
  );
};
