---
"@tailor-platform/app-shell": minor
---

AppShell components now use the typography roles. Titles, descriptions, captions, messages, error text, and key and value display render with `Text`; controls such as buttons, inputs, menu items, badges, and table cells use the role classes. Most text looks the same. These values change:

- Text below 12px moves to 12px: chat history group titles, tool status and section labels, tool JSON, command palette paths and descriptions, chain-of-thought search result badges, and `xs` and `sm` Avatar initials.
- Line heights outside the roles move to the role: chat messages (`body-md-relaxed`, 22.75 to 24px), attachment file names and upload text, the ActivityCard activity line, Appearance switcher options, and paragraphs in `Alert.Description`.
- Section labels use weight 500: the filter rail section legend, the ActivityCard day label, and `Menu.GroupLabel` (600 to 500).
- Key and value pairs use a 500 key and a 400 value: DescriptionCard values (500 to 400), and the AppInfo, DocumentProgressCard, and CsvImporter summary keys (400 to 500).
- The chat empty state title and the default sidebar app title use `heading-sm` (600).
- `Alert.Title` drops its letter spacing (-0.025em to 0).
- A selected item uses weight 600 (500 before): sidebar items, chat history, and the DataTable filter panel.
- Inline code and code blocks use `code-sm`, with an 18px line height.

Element types do not change. Elements rendered with `Text` and no `data-slot` of their own get `data-slot="text"`.
