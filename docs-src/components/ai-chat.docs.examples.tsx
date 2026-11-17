import { AIChat } from "@tailor-platform/app-shell";

export function Message() {
  return (
    <AIChat.Message from="assistant">
      <AIChat.Response>Your purchase order is ready for review.</AIChat.Response>
    </AIChat.Message>
  );
}

export function Response() {
  return (
    <AIChat.Response>
      {
        "## Order summary\n\nThe order is **ready for review**.\n\n- Check the `quantity` for each line.\n- Confirm the delivery date.\n\n[Read the documentation](/components/ai-chat)."
      }
    </AIChat.Response>
  );
}

export function Reasoning() {
  return (
    <AIChat.Reasoning isStreaming={false} duration={3} defaultOpen>
      <AIChat.ReasoningTrigger />
      <AIChat.ReasoningContent>
        {
          "I will check the order totals, then compare the requested delivery date with the supplier's lead time."
        }
      </AIChat.ReasoningContent>
    </AIChat.Reasoning>
  );
}

export function ChainOfThought() {
  return (
    <AIChat.ChainOfThought defaultOpen>
      <AIChat.ChainOfThoughtHeader />
      <AIChat.ChainOfThoughtContent>
        <AIChat.ChainOfThoughtStep label="Searching the knowledge base" status="complete">
          <AIChat.ChainOfThoughtSearchResults>
            <AIChat.ChainOfThoughtSearchResult>12 hits</AIChat.ChainOfThoughtSearchResult>
          </AIChat.ChainOfThoughtSearchResults>
        </AIChat.ChainOfThoughtStep>
        <AIChat.ChainOfThoughtStep label="Drafting the answer" status="active" />
      </AIChat.ChainOfThoughtContent>
    </AIChat.ChainOfThought>
  );
}
