---
"@tailor-platform/app-shell": patch
---

Replace the `astw:` prefix advice in the public docs and the bundled `app-shell-patterns` skill with guidance that works in a consumer app.

`astw:` is the library's **internal** Tailwind prefix. A consuming app's Tailwind build has no `astw` prefix configured, so it never generates `astw:*` classes — an `astw:` class written in application code only resolves if app-shell happens to already ship that exact utility for its own use. Roughly half of the classes the docs recommended (`astw:p-8`, `astw:mb-4`, `astw:max-h-96`, `astw:container`, `astw:max-w-7xl`, …) are absent from the shipped CSS, and Tailwind emits nothing for an unknown utility: no error, no warning, nothing in the console.

The docs now state the measured rule instead:

1. Prefer a real prop where the component exposes one (`Sheet.Content size`, `Table.Head align`, `Grid columns`).
2. To **add** a property app-shell doesn't set on that element, use a plain utility.
3. To **override** a value app-shell does set, use a plain utility with Tailwind's `!` importance modifier — a plain utility silently loses, because `tailwind-merge` groups `astw:`-prefixed and unprefixed classes separately and app-shell's precompiled rule wins at equal specificity.

`docs/concepts/styling-theming.md` carries the full explanation; the component docs link to it. Also corrects the published `Layout` `gap` JSDoc, which told consumers to write `className="astw:gap-6"`.

The Next.js example's demo pages were converted to plain utilities too, which surfaced a second bug in that example: it imported `@tailor-platform/app-shell/styles` from `layout.tsx` rather than from its CSS entry, so its own Tailwind build never saw the `@theme inline` token bridge and generated no token utilities (`text-muted-foreground`, `bg-muted`, …). Both imports now live in `globals.css` alongside `@import "tailwindcss"`, matching the documented setup and the Vite example. One side effect, in the example only: its own `dark:` utilities now resolve against AppShell's `@custom-variant dark (&:where(.dark, .dark *))` rather than `prefers-color-scheme`, so they follow the theme toggle. Consumers on the documented setup always had this.

The docs also spell out that the override rule depends on importing `@tailor-platform/app-shell/styles` **after** `@import "tailwindcss"` in the same CSS entry, and that a value AppShell sets under a state variant (`hover:`) or on a descendant counts as "set" for the purposes of rule 3.
