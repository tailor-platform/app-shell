---
"@tailor-platform/app-shell": patch
---

Render explicit sidebar header content even when the stock title/toggle row is hidden.
This enables `GlobalHeaderLayout.DefaultSidebar` headers above the scrolling navigation, including responsive rails and drawers, without changing its default chrome.

```tsx
<GlobalHeaderLayout.DefaultSidebar header={<SectionSwitcher />} />
```
