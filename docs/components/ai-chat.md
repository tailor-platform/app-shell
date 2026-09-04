---
title: AIChat
description: Building blocks for an LLM assistant UI — a streaming conversation view over a composer, plus reasoning, tool-call, and citation parts
---

# AIChat

`AIChat` owns the frame for an assistant UI and places its three regions in a fixed order, the way [`Layout`](./layout.md) places `Layout.Header` and `Layout.Column`: **`AIChat.Header`** (optional) over **`AIChat.Conversation`** (required) over **`AIChat.Composer`** (optional). Each region carries its own props; the root carries only the chat's `status`. You compose the transcript inside `AIChat.Conversation` from the attached parts — `AIChat.Message`, `AIChat.Response`, `AIChat.Reasoning`, `AIChat.Tool`, `AIChat.Sources`, and more — against your own [`useAIChat()`](../api/use-ai-chat.md) state.

It renders no border or background of its own. Wrap it in [`Card`](./card.md), [`Sheet`](./sheet.md), or a `Layout.Column` for the surrounding surface.

> **Not a mirror of the catalogue pattern.** `AIChat` was migrated from the UI Catalogue's [AI chat pattern](https://ui.tailor.tech/patterns/ai-chat), which is a design reference built on its own primitives — not a preview of this component. The API differs, and several behaviours were changed deliberately to fit AppShell (see [Prop pass-through](#prop-pass-through) and the notes throughout). Read that page for the intent; read this one for the contract.

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
      <AIChat status={status}>
        <AIChat.Header title="Assistant" />
        <AIChat.Conversation>
          {messages.length === 0 ? (
            <AIChat.EmptyState title="Ask the assistant" />
          ) : (
            messages.map((message) => (
              <AIChat.Message key={message.id} from={message.role}>
                <AIChat.Response>{message.content}</AIChat.Response>
              </AIChat.Message>
            ))
          )}
        </AIChat.Conversation>
        <AIChat.Composer onSubmit={sendMessage} onStop={stop} />
      </AIChat>
    </Card.Root>
  );
}
```

`message.role` ("user" | "assistant") from `useAIChat` lines up directly with `AIChat.Message`'s `from` prop — no mapping step. `AIChat` streams for real when the AI Gateway sends real SSE chunks; there is no client-side typewriter effect.

The regions can appear in any source order — the root always renders Header, then Conversation, then Composer. Children that are not one of the three are dropped with a console warning, so a transcript accidentally passed as a loose child is loud rather than silently missing. Omit `AIChat.Composer` for a read-only transcript.

## Props

### `AIChat`

| Prop        | Type                                               | Default   | Description                                                                                          |
| ----------- | -------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `children`  | `ReactNode`                                        | required  | `AIChat.Header`, `AIChat.Conversation`, and `AIChat.Composer`, in any order.                         |
| `status`    | `"ready" \| "submitted" \| "streaming" \| "error"` | `"ready"` | The chat's state. Plugs directly into `useAIChat()`'s `status`; `AIChat.Composer` reads it.          |
| `className` | `string`                                           | -         | Merged onto the root. It already fills a block parent (`h-full`) or a flex-column parent (`flex-1`). |

Other props spread onto the root `<div>`.

### `AIChat.Header`

| Prop        | Type        | Default | Description                                                                                      |
| ----------- | ----------- | ------- | ------------------------------------------------------------------------------------------------ |
| `title`     | `ReactNode` | -       | Title text.                                                                                      |
| `icon`      | `ReactNode` | sparkle | Leading graphic. Pass `null` for none, or a control (e.g. a collapse button) for a docked panel. |
| `actions`   | `ReactNode` | -       | Right-aligned slot — compose it from `AIChat.Action`.                                            |
| `className` | `string`    | -       |                                                                                                  |

### `AIChat.Conversation`

| Prop         | Type        | Default  | Description                                                                           |
| ------------ | ----------- | -------- | ------------------------------------------------------------------------------------- |
| `children`   | `ReactNode` | required | The transcript. Composed from the attached parts, or `AIChat.EmptyState` while empty. |
| `autoScroll` | `boolean`   | `true`   | Follow content growth while the reader is pinned to the bottom.                       |
| `className`  | `string`    | -        |                                                                                       |

Other props spread onto the region's outer `<div>`.

### `AIChat.Composer`

| Prop            | Type                                                         | Default  | Description                                                                      |
| --------------- | ------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------- |
| `onSubmit`      | `(message: string, attachments: AIChatAttachment[]) => void` | required | Called with the trimmed prompt and any staged attachments.                       |
| `onStop`        | `() => void`                                                 | -        | Called from the Stop button while the chat is busy. Omit for a plain busy state. |
| `value`         | `string`                                                     | -        | Controlled draft. Cleared via `onValueChange("")` after a successful submit.     |
| `defaultValue`  | `string`                                                     | `""`     | Uncontrolled draft's initial value.                                              |
| `onValueChange` | `(value: string) => void`                                    | -        | Called on every draft change, including the post-submit clear.                   |
| `placeholder`   | `string`                                                     | -        |                                                                                  |
| `disabled`      | `boolean`                                                    | `false`  | Disables the composer — not the transcript above it.                             |
| `submitOnEnter` | `boolean`                                                    | `true`   | Enter submits (IME-safe); Shift+Enter always inserts a newline.                  |
| `attachments`   | `boolean`                                                    | `false`  | Show the attach-file button and staged-attachment chips.                         |
| `accept`        | `string`                                                     | -        | Accepted file types for the hidden file input, when `attachments` is enabled.    |
| `multiple`      | `boolean`                                                    | `true`   | Allow more than one staged attachment at a time.                                 |
| `actions`       | `ReactNode`                                                  | -        | Open slot on the action row — a visibility toggle, a model picker, a select.     |
| `className`     | `string`                                                     | -        |                                                                                  |

## Prop pass-through

Most props stay inside their region. These `AIChat.Composer` props land on **another AppShell component**, so they carry that component's contract — and any future change to it — rather than one `AIChat` defines:

| Prop          | Reaches                                                                | Note                                    |
| ------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| `value`       | [`Textarea`](./textarea.md) `value`                                    | The composer body is a real `Textarea`. |
| `placeholder` | [`Textarea`](./textarea.md) `placeholder`                              |                                         |
| `disabled`    | [`Textarea`](./textarea.md) **and** the attach [`Button`](./button.md) | One prop, two components.               |
| `onStop`      | [`Button`](./button.md) `onClick`                                      | Becomes the Stop button's handler.      |

`accept` and `multiple` reach a plain hidden `<input type="file">`, not an AppShell component. `onValueChange` is wrapped rather than forwarded — it is called from the `Textarea`'s `onChange`, and again with `""` after a submit. `defaultValue` seeds the composer's own state and is never forwarded. Nothing on `AIChat`, `AIChat.Header`, or `AIChat.Conversation` reaches another AppShell component.

Three attached parts wrap an AppShell component. They expose only the props the part's job needs rather than inheriting the wrapped component's surface, so its visual treatment is fixed and not yours to change:

| Part                                | Wraps                                                      | Accepts                                                       | Fixed                              |
| ----------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| `AIChat.Suggestion`                 | [`Button`](./button.md)                                    | `suggestion`, `onSelect`, `className`, `disabled`, `children` | `variant="secondary"`, `size="sm"` |
| `AIChat.Action`                     | [`Button`](./button.md) inside a [`Tooltip`](./tooltip.md) | `label`, `onClick`, `className`, `disabled`, `children`       | `variant="ghost"`, `size="icon"`   |
| `AIChat.ChainOfThoughtSearchResult` | [`Badge`](./badge.md)                                      | `className`, `children`, `variant`                            | —                                  |

`variant` stays open on `ChainOfThoughtSearchResult` because conveying status is what a `Badge` is for. `AIChat.Action`'s `label` becomes both the accessible name and the tooltip text.

One thing to know about `className` on these: it is merged with `cn()`, which is not configured for the `astw:` prefix, so it cannot reliably override a base utility from the wrapped component. If an override appears to do nothing, that is why.

## Filling the page

`AIChat` fills whatever height its parent gives it — `h-full` for a block parent, `flex-1 min-h-0` for a flex column — and never grows the page: the transcript scrolls internally while the header and composer stay pinned. Give the surface around it a definite height.

Inside a `<Layout fill>` column (the column is `flex flex-col`, so the card takes the leftover space):

```tsx
<Layout fill>
  <Layout.Header title="Assistant" />
  <Layout.Column>
    <Card.Root className="astw:flex astw:min-h-0 astw:flex-1 astw:flex-col astw:overflow-hidden">
      <AIChat status={status}>
        <AIChat.Header title="Assistant" />
        <AIChat.Conversation>{/* … */}</AIChat.Conversation>
        <AIChat.Composer onSubmit={sendMessage} />
      </AIChat>
    </Card.Root>
  </Layout.Column>
</Layout>
```

`min-h-0` is what lets the card shrink below its content's natural height so the transcript scrolls instead of pushing the composer off-screen. In a docked panel or `Sheet` whose height is already fixed, `astw:h-full` on the card is enough.

## Header

A 48px strip above the transcript: leading graphic, title, and an open action slot on the right, closed by a rule that runs the full width of the surface. Omit it for a bare transcript-and-composer surface, and give the card `overflow-hidden` so the rule stays inside its rounded corners.

```tsx
<AIChat.Header
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
/>
```

For a docked right panel, put the collapse control in `icon` so it takes the leading position:

```tsx
<AIChat.Header
  title="Assistant"
  icon={
    <AIChat.Action label="Collapse panel" onClick={onClose}>
      <ChevronsRight className="astw:size-3.5" aria-hidden />
    </AIChat.Action>
  }
/>
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

Set `attachments` on `AIChat.Composer` to show the paperclip button and staged-attachment chips. Staged files arrive in `onSubmit`'s second argument as `AIChatAttachment[]` — each one shares `AttachmentItem`'s shape (`id`, `fileName`, `mimeType`, `previewUrl`) plus the raw `file: File`:

```tsx
<AIChat.Composer
  attachments
  accept="image/*,application/pdf"
  onSubmit={(message, attachments) => sendMessage(message, attachments)}
/>
```

Staged files live in the composer until submit, then clear. For a persisted record's file list — initial items and buffered upload/delete operations flushed to a backend — use [`Attachment`](./attachment.md) instead.

## Related components

- [Layout](./layout.md) — the same children-placed-by-the-root shape
- [Textarea](./textarea.md) — the composer's body control
- [Attachment](./attachment.md) — for a persisted record's file list, a different lifecycle from the composer's own attachments
- [Card](./card.md)
- [Button](./button.md)
- [useAIChat](../api/use-ai-chat.md)
- [createAIGatewayClient](../api/create-ai-gateway-client.md)
