---
"@tailor-platform/app-shell": minor
---

Add an optional `emptyContent` prop to `ActionPanel` for localized strings or custom React nodes.
Align the title, action icons, and empty content while preserving horizontal padding around action hover backgrounds and focus rings.
Omitting `emptyContent` shows the default message in the AppShell locale (English or Japanese); custom strings use the same muted body styling. Passing `null` hides the content and its additional spacing while keeping the card and title.

```tsx
<ActionPanel title="操作" actions={[]} emptyContent={<p>利用可能な操作はありません</p>} />
```
