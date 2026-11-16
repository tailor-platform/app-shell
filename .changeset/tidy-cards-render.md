---
"@tailor-platform/app-shell": minor
---

Add schema-registered, read-only Generative UI cards and the built-in Report renderer. Register `defineGenerativeUI({ cards: { Report: generativeUICards.report } }).tool` as a `ui_render` local tool.

Local tools can emit display data with `context.emit({ type, data })`. `useAIChat().messages[].parts` retains text and tool-call display parts in order; generated UI is nested inside its tool call, while `content` remains available for text-only consumers.
