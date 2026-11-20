---
kind: code-backed
group: ai-chat
title: AIChat
description: Building blocks for an LLM assistant UI — a streaming conversation view over a composer, plus reasoning, tool-call, and citation parts
sources:
  - packages/core/src/components/ai-chat/**
---

# AIChat

`AIChat` owns the frame for an assistant UI and places its three regions in a fixed order, the way [`Layout`](./layout.md) places `Layout.Header` and `Layout.Column`: **`AIChat.Header`** (optional) over **`AIChat.Conversation`** (required) over **`AIChat.Composer`** (optional). Each region carries its own props; the root carries only the chat's `status`. You compose the transcript inside `AIChat.Conversation` from the attached parts — `AIChat.Message`, `AIChat.Response`, `AIChat.Reasoning`, `AIChat.Tool`, `AIChat.Sources`, and more — against your own [`useAIChat()`](../api/use-ai-chat.md) state.

It renders no border or background of its own. Wrap it in [`Card`](./card.md), [`Sheet`](./sheet.md), or a `Layout.Column` for the surrounding surface.

## Import

```tsx
import { AIChat, useAIChat, createAIGatewayClient } from "@tailor-platform/app-shell";
```

The additional runnable examples also import `useState` from `react`, and `Button`, `Card`, `Select`, `Text`, and `type ToolState` from `@tailor-platform/app-shell`. Their icons (`ChevronsRightIcon`, `CopyIcon`, `EraserIcon`, `HistoryIcon`, `RotateCcwIcon`, `SparklesIcon`, and `ThumbsUpIcon`) come from `lucide-react`.

## Basic usage

This example uses the real `useAIChat()` hook with a local `AIGatewayClient` fixture. Send a message to see the waiting state, a streamed reply, and the Stop control. Replies are predefined chunks with a short delay, not model output; no prompts leave your browser and no authentication or API key is needed.

The example also imports `useState` from `react`, and `Card`, `Text`, and `type AIGatewayClient` from `@tailor-platform/app-shell`. Its fixed-height card keeps the transcript scrollable while the header and composer stay in place.

<!-- example: basic-usage -->

### Connecting to AI Gateway

For real responses, replace the local client with `createAIGatewayClient` configured using your application's gateway URI and authenticated client, and select an available model. For example, inside your component, import `useMemo` from `react` and use:

```tsx
const client = useMemo(
  () => createAIGatewayClient({ gatewayUri, authClient }),
  [gatewayUri, authClient],
);
const { messages, status, error, sendMessage, stop } = useAIChat({ client, model: "gpt-5" });
```

`message.role` ("user" | "assistant") from `useAIChat` lines up directly with `AIChat.Message`'s `from` prop — no mapping step. `AIChat` streams for real when the AI Gateway sends real SSE chunks; there is no client-side typewriter effect.

The regions can appear in any source order — the root always renders Header, then Conversation, then Composer. Omit `AIChat.Composer` for a read-only transcript.

They must be **direct** children. The root matches them by component identity, so a region wrapped in one of your own components — `const AppComposer = () => <AIChat.Composer … />` — is not recognised, and is dropped with a console warning like any other unexpected child. To preset props, export the props instead of the element: `<AIChat.Composer {...appComposerProps} />`.

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

While the root's `status` is `"submitted"`, the conversation automatically appends a [`Spinner`](./spinner.md) and localized “Thinking…” status at the end. This covers the initial reply wait, tool execution, and the next reply wait after a tool result. The indicator disappears when text starts streaming, or when the request finishes, fails, or is stopped. It participates in the conversation's normal auto-scroll behavior; no separate loader state is needed.

### `AIChat.ToolCall`

A compact label for one model-requested tool call. Each label occupies its own row, so multiple calls stack vertically. It does not imply execution success, render tool arguments/results, or manage history.

| Prop        | Type                           | Default  | Description                                      |
| ----------- | ------------------------------ | -------- | ------------------------------------------------ |
| `call`      | `{ id: string; name: string }` | required | A `toolCalls` element returned by `useAIChat()`. |
| `className` | `string`                       | -        | Merged onto the outer row, not the badge.        |

### `AIChat.Composer`

| Prop            | Type                        | Default  | Description                                                                      |
| --------------- | --------------------------- | -------- | -------------------------------------------------------------------------------- |
| `onSubmit`      | `(message: string) => void` | required | Called with the trimmed prompt.                                                  |
| `onStop`        | `() => void`                | -        | Called from the Stop button while the chat is busy. Omit for a plain busy state. |
| `value`         | `string`                    | -        | Controlled draft. Cleared via `onValueChange("")` after a successful submit.     |
| `defaultValue`  | `string`                    | `""`     | Uncontrolled draft's initial value.                                              |
| `onValueChange` | `(value: string) => void`   | -        | Called on every draft change, including the post-submit clear.                   |
| `placeholder`   | `string`                    | -        |                                                                                  |
| `disabled`      | `boolean`                   | `false`  | Disables the composer — not the transcript above it.                             |
| `submitOnEnter` | `boolean`                   | `true`   | Enter submits (IME-safe); Shift+Enter always inserts a newline.                  |
| `actions`       | `ReactNode`                 | -        | Open slot on the action row — a visibility toggle, a model picker, a select.     |
| `className`     | `string`                    | -        |                                                                                  |

## Prop pass-through

Most props stay inside their region. These `AIChat.Composer` props land on **another AppShell component**, so they carry that component's contract — and any future change to it — rather than one `AIChat` defines:

| Prop          | Reaches                                                                | Note                                    |
| ------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| `value`       | [`Textarea`](./textarea.md) `value`                                    | The composer body is a real `Textarea`. |
| `placeholder` | [`Textarea`](./textarea.md) `placeholder`                              |                                         |
| `disabled`    | [`Textarea`](./textarea.md) **and** the attach [`Button`](./button.md) | One prop, two components.               |
| `onStop`      | [`Button`](./button.md) `onClick`                                      | Becomes the Stop button's handler.      |

`onValueChange` is wrapped rather than forwarded — it is called from the `Textarea`'s `onChange`, and again with `""` after a submit. `defaultValue` seeds the composer's own state and is never forwarded. Nothing on `AIChat`, `AIChat.Header`, or `AIChat.Conversation` reaches another AppShell component.

Four attached parts wrap an AppShell component. They expose only the props the part's job needs rather than inheriting the wrapped component's surface, so its visual treatment is fixed and not yours to change:

| Part                                | Wraps                                                      | Accepts                                                       | Fixed                              |
| ----------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| `AIChat.Suggestion`                 | [`Button`](./button.md)                                    | `suggestion`, `onSelect`, `className`, `disabled`, `children` | `variant="secondary"`, `size="sm"` |
| `AIChat.Action`                     | [`Button`](./button.md) inside a [`Tooltip`](./tooltip.md) | `label`, `onClick`, `className`, `disabled`, `children`       | `variant="ghost"`, `size="icon"`   |
| `AIChat.ChainOfThoughtSearchResult` | [`Badge`](./badge.md)                                      | `className`, `children`, `variant`                            | —                                  |
| `AIChat.ToolCall`                   | [`Badge`](./badge.md)                                      | `call`, `className`                                           | `variant="neutral"`                |

`variant` stays open on `ChainOfThoughtSearchResult` because conveying status is what a `Badge` is for. `AIChat.Action`'s `label` becomes both the accessible name and the tooltip text.

`ToolCall` applies `className` to its outer row, not the inner badge. For `Suggestion`, `Action`, and `ChainOfThoughtSearchResult`, `className` is merged with `cn()`, which is not configured for AppShell's internal prefix, so it cannot reliably override a base utility from the wrapped component. Add properties the component doesn't set, and reach for the wrapped component's own props or variants to change ones it does — see [Styling AppShell components](../concepts/styling-theming.md#styling-appshell-components).

## Filling the page

`AIChat` fills whatever height its parent gives it — `h-full` for a block parent, `flex-1 min-h-0` for a flex column — and never grows the page: the transcript scrolls internally while the header and composer stay pinned. Give the surface around it a definite height.

Inside a `<Layout fill>` column (the column is `flex flex-col`, so the card takes the leftover space):

```tsx
<Layout fill>
  <Layout.Header title="Assistant" />
  <Layout.Column>
    <Card.Root className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AIChat status={status}>
        <AIChat.Header title="Assistant" />
        <AIChat.Conversation>{/* … */}</AIChat.Conversation>
        <AIChat.Composer onSubmit={sendMessage} />
      </AIChat>
    </Card.Root>
  </Layout.Column>
</Layout>
```

`min-h-0` is what lets the card shrink below its content's natural height so the transcript scrolls instead of pushing the composer off-screen. In a docked panel or `Sheet` whose height is already fixed, `h-full` on the card is enough.

## Header

A 48px strip above the transcript: leading graphic, title, and an open action slot on the right, closed by a rule that runs the full width of the surface. Omit it for a bare transcript-and-composer surface, and give the card `overflow-hidden` so the rule stays inside its rounded corners.

Try the history/back action, clear the local transcript, or collapse and reopen the card. The collapse control occupies `icon`, while history and clear occupy `actions`. This changes only the example card, not the surrounding application layout:

<!-- example: header-actions -->

## Attached parts

### Message

<!-- example: message -->

User turns render as a right-aligned primary bubble; assistant turns take the full width with no bubble, so reasoning, tool calls, and citations stack inside the same column above the response text.

### Response

Renders the markdown subset a streamed LLM response actually emits — bold, inline code, links, headings, bullet/numbered lists — without a markdown dependency. Only `http(s):`, `mailto:`, and same-site relative links render as clickable; any other target renders as plain text, since the text passing through here is untrusted model output. For full CommonMark, swap `<AIChat.Response>` for `react-markdown` or the AI SDK's `streamdown` — call sites keep the same shape.

<!-- example: response -->

### EmptyState / Suggestions

`AIChat.EmptyState` stacks `icon`, then the `title`/`description` block, then `children` — so starter suggestions sit alongside the text rather than replacing it:

Choose a starter prompt to display the user turn and a predefined local reply. Use **Reset suggestions** to return to the empty state. This example does not call a model or execute a request:

<!-- example: empty-state-suggestions -->

`AIChat.Suggestion` submits its `suggestion` text as if the reader had typed and sent it via `onSelect`.

### Actions

Icon-button row under a finished assistant turn — copy, retry, feedback. Render it only once the turn has finished so streaming turns stay uncluttered.

Copy the response, produce another local revision with Retry, or mark it helpful. The status below the message records the action. Copy uses the browser clipboard and reports when access is unavailable; Retry and feedback remain entirely local:

<!-- example: message-actions -->

### Reasoning

Collapsible "thinking" block for reasoning models. Auto-opens while `isStreaming` is true and auto-closes when it turns false, unless the reader has manually toggled it.

<!-- example: reasoning -->

### ChainOfThought

Structured step timeline for agentic turns — the discrete plan being executed, each step with a status and optional result chips. Use `Reasoning` for free-form thinking text and this for multi-step tool plans.

<!-- example: chain-of-thought -->

`status` is `"complete" | "active" | "pending"`.

### Tool calls during the active flow

`useAIChat()` returns a transient `toolCalls` list separately from `messages`. Render it with `AIChat.ToolCall` after the message history inside `AIChat.Conversation`.

For an application integration, pass a configured client and registered tools to the component below, and choose a model available through your Gateway. Unlike the local preview, submitting a message here calls that client and may execute the supplied tools:

```tsx
import {
  AIChat,
  Card,
  useAIChat,
  type AIGatewayClient,
  type AILocalTool,
} from "@tailor-platform/app-shell";

function ToolCallAssistant({
  client,
  model,
  tools,
}: {
  client: AIGatewayClient;
  model: string;
  tools: Record<string, AILocalTool>;
}) {
  const { messages, status, toolCalls, sendMessage, stop } = useAIChat({ client, model, tools });

  return (
    <Card.Root className="flex h-96 flex-col overflow-hidden">
      <AIChat status={status}>
        <AIChat.Conversation>
          {messages.map((message) => (
            <AIChat.Message key={message.id} from={message.role}>
              <AIChat.Response>{message.content}</AIChat.Response>
            </AIChat.Message>
          ))}
          {toolCalls.map((call) => (
            <AIChat.ToolCall key={call.id} call={call} />
          ))}
        </AIChat.Conversation>
        <AIChat.Composer onSubmit={sendMessage} onStop={stop} />
      </AIChat>
    </Card.Root>
  );
}
```

The following fixture shows two requested names. **Finish request** clears them, and **Show requested calls** restores them, making the transient presentation observable without executing a tool:

<!-- example: active-tool-calls -->

Each call renders on its own row, in the order supplied. Labels are localized automatically.

The list clears when the response finishes, is stopped, or fails. It does not create tool messages or persist in the conversation log.

These names record model requests, not execution success. Tool arguments and results stay internal. Do not infer a `ToolHeader` success or running state from name-only metadata.

### Tool

Collapsible tool-call card. Maps 1:1 to the AI SDK's tool-part lifecycle, so a streaming loop can update a call in place as parts arrive.

Select each lifecycle state and expand or collapse the card to inspect its local input, result, and error fixtures. The selector controls presentation only; it does not run a tool:

<!-- example: tool-lifecycle -->

`state` is `"input-streaming" | "input-available" | "output-available" | "output-error"`.

### Sources

Compact "Used N sources" citation trigger under a grounded answer. Supply source data from your application; `useAIChat()` does not return citation metadata.

Expand the citations and choose a source to read its local excerpt below the list. An application can use the same `onClick` callback to open its document viewer:

<!-- example: citation-sources -->

### History

Grouped list of past conversations for reopening an earlier chat. Layout-agnostic — render it in a popover behind a header action, or as a sidebar section of a full chat page. Group titles and date bucketing are yours; `AIChat.History` has no opinion on date ranges.

Choose a conversation to switch its displayed summary. Delete removes only the local fixture; deleting the active item also clears its displayed summary. **Reset history** restores the sample conversations. There is no remote history store or request:

<!-- example: conversation-history -->

## Related components

- [Layout](./layout.md) — the same children-placed-by-the-root shape
- [Textarea](./textarea.md) — the composer's body control
- [Card](./card.md)
- [Button](./button.md)
- [useAIChat](../api/use-ai-chat.md)
- [createAIGatewayClient](../api/create-ai-gateway-client.md)
