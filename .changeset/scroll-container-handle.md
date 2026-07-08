---
"@tailor-platform/app-shell": minor
---

Add `useAppShellScrollContainer()` — a supported handle to the content scroll container

Now that the shell is viewport-bounded (`h-svh`) and page content scrolls inside the content area rather than on the document, consumers that previously relied on `window`/document scroll need a stable way to reach the element that actually scrolls.

`useAppShellScrollContainer()` returns a ref to that element:

```tsx
const scrollRef = useAppShellScrollContainer();
useEffect(() => {
  const el = scrollRef.current;
  if (!el) return;
  const onScroll = () => setProgress(el.scrollTop / (el.scrollHeight - el.clientHeight));
  el.addEventListener("scroll", onScroll, { passive: true });
  return () => el.removeEventListener("scroll", onScroll);
}, [scrollRef]);
```

Use it wherever you would previously have reached for `window.scrollY`, a `window` `scroll` listener, `window.scrollTo(...)`, or an `IntersectionObserver` with the default viewport root.

- On a `<Layout fill>` page the element does not scroll (its children manage their own scrolling).
- Outside a `SidebarLayout` the ref's `current` is always `null`.
- The container also carries a `data-appshell-scroll-container` attribute for non-React access (CSS, tests, `document.querySelector`).
