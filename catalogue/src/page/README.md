# Pages

A **page** is the shape of a whole screen — its layout, its scroll model, and the
competing variants that could reasonably fill it. It is the outer choice, made
before picking patterns for the parts inside it.

Where a pattern is one recipe ("how do I build this bit?"), a page compares the
layouts a screen could take and says when each applies ("what shape should this
screen be?"). The test: if it owns a route and its value is choosing between
variants, it is a page; if it is one way to build one thing, it is a pattern.

**A page links, it does not restate.** Every variant a page compares should be a
pattern entry the page cites by slug, never inlined. That is why pages and
patterns are sibling categories rather than nested — the page carries the
decision, the pattern carries the implementation.

## Adding an entry

Mirror `src/pattern/`: one directory per page, holding a `PAGE.md` plus the
`.tsx` files it embeds.

```
src/page/<name>/
  PAGE.md          ← frontmatter + prose; the generator's entry marker
  <name>.tsx       ← reference implementation, embedded via a source marker
```

`PAGE.md` frontmatter follows the `PATTERN.md` shape, with `category: page`:

```yaml
slug: page/collection # → references/pages/collection.md
name: Collection
category: page
description: ...
requiredImports: [DataTable, Tabs, Layout]
tags: [list, tabs, collection]
do: [...]
dont: [...]
```

Embed source with `<!-- source: collection.tsx -->`; the generator replaces the
marker with a fenced code block. Anything not named `PAGE.md` — this file
included — is ignored by the generator.

After adding an entry, run `pnpm build` from the repo root and add the newly
generated `references/pages/<slug>.md` to `catalogue/expected-skills-files.txt`,
which the catalogue's `test` script checks against the generated tree.

## Planned entries

Four pages were agreed for migration from the UI Catalogue on 2026-08-27
(tailor-inc/platform-planning#1731). None are written up yet:

| Page         | Ticket                            | Patterns it will compare                                          |
| ------------ | --------------------------------- | ----------------------------------------------------------------- |
| Collection   | tailor-inc/platform-planning#1735 | `list/dense-scan`, plus inline-edit and grid/list-toggle variants |
| Detail page  | tailor-inc/platform-planning#1736 | `detail/hero-with-actions`, plus a page-tabs variant              |
| Master list  | tailor-inc/platform-planning#1737 | `form/modal`, plus a Sheet variant                                |
| Form-as-page | tailor-inc/platform-planning#1742 | `form/single-page`, `form/sectioned`, `form/wizard`               |
