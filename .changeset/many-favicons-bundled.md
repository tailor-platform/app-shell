---
"@tailor-platform/app-shell": minor
---

AppShell now bundles and injects a full default favicon set instead of a single 32×32 icon. When no `favicon` prop is passed (and the host page declares no `<link rel="icon">`), AppShell renders a multi-resolution `.ico`, 16/32/192/512 PNG icons, and a 180×180 Apple touch icon — all embedded as data URIs, so no asset-copy step is needed.

Behavior for consumers is unchanged: passing `favicon` still replaces the whole set with your single href, and an existing host-page favicon is still respected.
