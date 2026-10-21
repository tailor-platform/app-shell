---
"@tailor-platform/app-shell": minor
---

Add an optional `emptyContent` prop to `ActionPanel` for localized strings or custom React nodes.
Align the title, action icons, and empty content by consolidating horizontal padding in `Card.Content`.
Omitting `emptyContent` preserves the styled `No actions available` message; passing `null` hides the content and its additional spacing while keeping the card and title.

```tsx
<ActionPanel title="操作" actions={[]} emptyContent={<p>利用可能な操作はありません</p>} />
```
