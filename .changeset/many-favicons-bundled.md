---
"@tailor-platform/app-shell": minor
---

AppShell now bundles and injects a small default favicon set instead of a single 32×32 icon. When no `favicon` prop is passed (and the host page declares no `<link rel="icon">`), AppShell renders 16×16 and 32×32 PNG tab icons plus a 180×180 Apple touch icon — all embedded as data URIs, so no asset-copy step is needed. The Apple touch icon covers "Add to Home Screen" on both iOS and Android; the legacy `.ico` and PWA `android-chrome-*` icons are intentionally omitted to keep the bundle small (this is not a PWA).

Behavior for consumers is unchanged: passing `favicon` still replaces the whole set with your single href, and an existing host-page favicon is still respected.
