---
title: AIChat
description: Building blocks for an LLM assistant UI — a streaming conversation view over a composer, plus reasoning, tool-call, and citation parts
---

# AIChat

`AIChat` owns the frame for an assistant UI: an optional header strip over a scrollable, auto-following conversation view, over a fixed composer. It takes the transcript itself as `children`, so you compose each turn from the attached parts — `AIChat.Message`, `AIChat.Response`, `AIChat.Reasoning`, `AIChat.Tool`, `AIChat.Sources`, and more — against your own [`useAIChat()`](../api/use-ai-chat.md) state.

It renders no border or background of its own. Wrap it in [`Card`](./card.md), [`Sheet`](./sheet.md), or a `Layout.Column` for the surrounding surface.

[Live preview in the UI Catalogue →](https://ui.tailor.tech/patterns/ai-chat)

## Import

```tsx
import { AIChat, useAIChat, createAIGatewayClient } from "@tailor-platform/app-shell";
import type { AIChatAttachment } from "@tailor-platform/app-shell";
```

## Basic usage

```tsx
function Assistant() {
  const client = useMemo(() => createAIGatewayClient({ gatewayUri, authClient }), [authClient]);
  const { messages, status, sendMessage, stop } = useAIChat({ client, model: "gpt-5" });

  return (
    // `overflow-hidden` keeps the header rule inside the card's rounded corners.
    <Card.Root className="astw:flex astw:h-full astw:flex-col astw:overflow-hidden">
      <AIChat title="Assistant" status={status} onSubmit={sendMessage} onStop={stop}>
        {messages.length === 0 ? (
          <AIChat.EmptyState title="Ask the assistant" />
        ) : (
          messages.map((message) => (
            <AIChat.Message key={message.id} from={message.role}>
              <AIChat.Response>{message.content}</AIChat.Response>
            </AIChat.Message>
          ))
        )}
      </AIChat>
    </Card.Root>
  );
}
```

`message.role` ("user" | "assistant") from `useAIChat` lines up directly with `AIChat.Message`'s `from` prop — no mapping step. `AIChat` streams for real when the AI Gateway sends real SSE chunks; there is no client-side typewriter effect.

## AIChat props

| Prop              | Type                                                         | Default   | Description                                                                                 |
| ----------------- | ------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------- |
| `children`        | `ReactNode`                                                  | required  | The transcript. Composed from the attached parts, or `AIChat.EmptyState` while empty.       |
| `title`           | `ReactNode`                                                  | -         | Title in the header strip. The strip renders when `title` or `actions` is set.              |
| `icon`            | `ReactNode`                                                  | sparkle   | Leading graphic in the header strip. Pass `null` for none, or a control for a docked panel. |
| `actions`         | `ReactNode`                                                  | -         | Right-aligned header slot — compose it from `AIChat.Action`.                                |
| `status`          | `"ready" \| "submitted" \| "streaming" \| "error"`           | `"ready"` | Drives the composer's busy/Stop state. Plugs directly into `useAIChat()`'s `status`.        |
| `onSubmit`        | `(message: string, attachments: AIChatAttachment[]) => void` | required  | Called with the trimmed prompt and any staged attachments when the composer submits.        |
| `onStop`          | `() => void`                                                 | -         | Called from the Stop button while busy. Omit to show a plain busy state with no Stop.       |
| `value`           | `string`                                                     | -         | Controlled composer draft. Cleared via `onValueChange("")` after a successful submit.       |
| `defaultValue`    | `string`                                                     | `""`      | Uncontrolled draft's initial value.                                                         |
| `onValueChange`   | `(value: string) => void`                                    | -         | Called on every draft change, including the post-submit clear.                              |
| `placeholder`     | `string`                                                     | -         | Composer placeholder text.                                                                  |
| `disabled`        | `boolean`                                                    | `false`   | Disables the whole composer — not the transcript above it.                                  |
| `submitOnEnter`   | `boolean`                                                    | `true`    | Enter submits (IME-safe); Shift+Enter always inserts a newline.                             |
| `autoScroll`      | `boolean`                                                    | `true`    | Follow content growth while the reader is pinned to the bottom.                             |
| `attachments`     | `boolean`                                                    | `false`   | Show the composer's attach-file button and staged-attachment chips.                         |
| `accept`          | `string`                                                     | -         | Accepted file types for the hidden file input, when `attachments` is enabled.               |
| `multiple`        | `boolean`                                                    | `true`    | Allow more than one staged attachment at a time.                                            |
| `composerActions` | `ReactNode`                                                  | -         | Open slot on the composer's action row — a visibility toggle, a model picker, a select.     |

## Filling the page

`AIChat` is `h-full`, so it fills whatever height its parent gives it and never grows the page — the transcript scrolls internally while the header and composer stay pinned. Give the surface around it a definite height.

Inside a `<Layout fill>` column (the column is `flex flex-col`, so the card takes the leftover space):

```tsx
<Layout fill>
  <Layout.Header title="Assistant" />
  <Layout.Column>
    <Card.Root className="astw:flex astw:min-h-0 astw:flex-1 astw:flex-col astw:overflow-hidden">
      <AIChat title="Assistant" onSubmit={sendMessage}>
        {/* … */}
      </AIChat>
    </Card.Root>
  </Layout.Column>
</Layout>
```

`min-h-0` is what lets the card shrink below its content's natural height so the transcript scrolls instead of pushing the composer off-screen. In a docked panel or `Sheet` whose height is already fixed, `astw:h-full` on the card is enough.

## Header

A 48px strip above the transcript: leading graphic, title, and an open action slot on the right, closed by a rule that runs the full width of the surface. It renders only when `title` or `actions` is set — omit both for a bare transcript-and-composer surface, and give the card `overflow-hidden` so the rule stays inside its rounded corners.

```tsx
<AIChat
  title="Assistant"
  actions={
    <>
      <AIChat.Action label="Conversation history" onClick={openHistory}>
        <History className="astw:size-3.5" aria-hidden />
      </AIChat.Action>
      <AIChat.Action label="Clear conversation" onClick={clear}>
        <Eraser className="astw:size-3.5" aria-hidden />
      </AIChat.Action>
    </>
  }
  onSubmit={sendMessage}
>
  {/* … */}
</AIChat>
```

For a docked right panel, put the collapse control in `icon` so it takes the leading position:

```tsx
<AIChat
  title="Assistant"
  icon={
    <AIChat.Action label="Collapse panel" onClick={onClose}>
      <ChevronsRight className="astw:size-3.5" aria-hidden />
    </AIChat.Action>
  }
  onSubmit={sendMessage}
>
```

## Attached parts

### Message

```tsx
<AIChat.Message from="assistant">
  <AIChat.Response>{message.content}</AIChat.Response>
</AIChat.Message>
```

User turns render as a right-aligned primary bubble; assistant turns take the full width with no bubble, so reasoning, tool calls, and citations stack inside the same column above the response text.

### Response

Renders the markdown subset a streamed LLM response actually emits — bold, inline code, links, headings, bullet/numbered lists — without a markdown dependency. Only `http(s):`, `mailto:`, and same-site relative links render as clickable; any other target renders as plain text, since the text passing through here is untrusted model output. For full CommonMark, swap `<AIChat.Response>` for `react-markdown` or the AI SDK's `streamdown` — call sites keep the same shape.

```tsx
<AIChat.Response>{message.content}</AIChat.Response>
```

### EmptyState / Suggestions

`children` on `AIChat.EmptyState` fully replaces its built-in `title`/`description` rendering — compose both text and suggestions manually when you want them together:

```tsx
<AIChat.EmptyState>
  <Sparkles className="astw:size-6 astw:text-primary" aria-hidden />
  <div className="astw:space-y-1">
    <h3 className="astw:text-sm astw:font-medium">Ask the assistant</h3>
    <p className="astw:text-sm astw:text-muted-foreground">Grounded in your help articles.</p>
  </div>
  <AIChat.Suggestions>
    <AIChat.Suggestion suggestion="How do I create a purchase order?" onSelect={sendMessage} />
  </AIChat.Suggestions>
</AIChat.EmptyState>
```

`AIChat.Suggestion` submits its `suggestion` text as if the reader had typed and sent it via `onSelect`.

### Actions

Icon-button row under a finished assistant turn — copy, retry, feedback. Render it only once the turn has finished so streaming turns stay uncluttered.

```tsx
<AIChat.Actions>
  <AIChat.Action label="Copy" onClick={() => navigator.clipboard.writeText(message.content)}>
    <Copy className="astw:size-3.5" aria-hidden />
  </AIChat.Action>
</AIChat.Actions>
```

### Reasoning

Collapsible "thinking" block for reasoning models. Auto-opens while `isStreaming` is true and auto-closes when it turns false, unless the reader has manually toggled it.

```tsx
<AIChat.Reasoning isStreaming={reasoning.streaming} duration={reasoning.duration}>
  <AIChat.ReasoningTrigger />
  <AIChat.ReasoningContent>{reasoning.text}</AIChat.ReasoningContent>
</AIChat.Reasoning>
```

### ChainOfThought

Structured step timeline for agentic turns — the discrete plan being executed, each step with a status and optional result chips. Use `Reasoning` for free-form thinking text and this for multi-step tool plans.

```tsx
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
```

`status` is `"complete" | "active" | "pending"`.

### Tool

Collapsible tool-call card. Maps 1:1 to the AI SDK's tool-part lifecycle, so a streaming loop can update a call in place as parts arrive.

```tsx
<AIChat.Tool>
  <AIChat.ToolHeader toolName="search_kb" state={call.state} />
  <AIChat.ToolContent>
    <AIChat.ToolInput input={call.input} />
    <AIChat.ToolOutput output={call.output} errorText={call.errorText} />
  </AIChat.ToolContent>
</AIChat.Tool>
```

`state` is `"input-streaming" | "input-available" | "output-available" | "output-error"`.

### Sources

Compact "Used N sources" citation trigger under a grounded answer.

```tsx
<AIChat.Sources>
  <AIChat.SourcesTrigger count={sources.length} />
  <AIChat.SourcesContent>
    {sources.map((source) => (
      <AIChat.Source key={source.id} title={source.title} onClick={() => openDocument(source.id)} />
    ))}
  </AIChat.SourcesContent>
</AIChat.Sources>
```

### History

Grouped list of past conversations for reopening an earlier chat. Layout-agnostic — render it in a popover behind a header action, or as a sidebar section of a full chat page. Group titles and date bucketing are yours; `AIChat.History` has no opinion on date ranges.

```tsx
<AIChat.History
  groups={[{ title: "Today", items: [{ id: "1", title: "Creating a purchase order" }] }]}
  activeId={activeId}
  onSelect={loadConversation}
  onDelete={deleteConversation}
/>
```

## Attachments

Set `attachments` to show the composer's paperclip button and staged-attachment chips. Staged files arrive in `onSubmit`'s second argument as `AIChatAttachment[]` — each one shares `AttachmentItem`'s shape (`id`, `fileName`, `mimeType`, `previewUrl`) plus the raw `file: File`:

```tsx
<AIChat
  attachments
  accept="image/*,application/pdf"
  onSubmit={(message, attachments) => sendMessage(message, attachments)}
>
  {/* … */}
</AIChat>
```

Staged files live in the composer until submit, then clear. For a persisted record's file list — initial items and buffered upload/delete operations flushed to a backend — use [`Attachment`](./attachment.md) instead.

## Related components

- [Textarea](./textarea.md) — the composer's body control
- [Attachment](./attachment.md) — for a persisted record's file list, a different lifecycle from the composer's own attachments
- [Card](./card.md)
- [Button](./button.md)
- [useAIChat](../api/use-ai-chat.md)
- [createAIGatewayClient](../api/create-ai-gateway-client.md)
