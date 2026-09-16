---
"@tailor-platform/app-shell": patch
---

Remove the `astw:` prefix advice from the public docs under `docs/`, applying the same styling boundary the bundled skill now states: ordinary Tailwind utilities on application markup and documented layout hooks, and component props, variants, or composition for a component's own appearance.

Seventeen of the 55 classes these pages used to recommend (`astw:p-8`, `astw:mb-4`, `astw:max-h-96`, `astw:container`, `astw:max-w-7xl`, …) are absent from the shipped stylesheet, so they emitted no CSS at all — silently, with no error or warning. `docs/concepts/styling-theming.md` now explains the boundary and why a plain utility cannot override an AppShell default, and the component pages link to it.

Also corrects `ActionPanel`'s JSDoc, which ships in the published `.d.ts` and told consumers to write the prefix. The Vite showcase's own demo pages were converted to plain utilities too.
