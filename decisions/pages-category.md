# Decision: `page` as a catalogue category

> Status: **Decided — `catalogue/src/page/` added as a sibling of `src/pattern/`. Machinery only; page entries land per ticket.**
> Scope: where page entries live and how they differ from patterns. Does not cover any individual page's content.

## Context

The UI Catalogue migration assessment (tailor-inc/platform-planning#1731) reviewed 10 Pages and 19 Patterns as candidates for adoption into AppShell as endorsed, documented approaches. Four Pages were agreed for migration on 2026-08-27; four others were closed as not needed (Chat, Document page and Email stay in the upstream catalogue; Assistant panel resolved to a component plus a chat-drawer layout rather than a page).

Those four had no home. Two distinct things are easy to confuse here, so to be explicit:

- **`catalogue/`** (this repo) generates the **`app-shell-patterns` agent skill** into `packages/core/skills/` — gitignored, produced by `pnpm build`, and shipped to consumers through core's `files: ["skills/**"]`. It is documentation for coding agents working inside a consumer app, where no `docs/` tree exists.
- **The UI Catalogue at ui.tailor.tech** is a separate product living in `tailor-inc/app-web`. Nothing in this repo publishes to it; the only link is `.github/workflows/scripts/check-catalogue-links.sh`, which validates deep links out of `docs/components/*.md`.

A page is neither a component API nor a concept, and `docs/` carries no pattern category at all — so the catalogue, which already owns the pattern vocabulary, is where a page belongs.

## Decision

**`catalogue/src/page/` is a sibling of `src/pattern/`, not a container for patterns.**

A page owns a route and its value is _choosing_ between the variants that could fill it. A pattern is one composition recipe used within a screen — a single recipe, not a choice between several. The test: if it owns a route and its value is choosing between variants, it is a page; if it is one way to build one thing, it is a pattern.

**The load-bearing rule: a page links, it does not restate.** Every variant a page compares should be a pattern entry the page cites by slug, never inlined. This is why the two are siblings rather than nested — the page carries the _decision_, the pattern carries the _implementation_.

That rule is doing real work, because all four agreed pages sit directly on top of patterns that already exist:

| Page                                             | Patterns it will compare                                          |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Collection (tailor-inc/platform-planning#1735)   | `list/dense-scan`, plus inline-edit and grid/list-toggle variants |
| Detail page (tailor-inc/platform-planning#1736)  | `detail/hero-with-actions`, plus a page-tabs variant              |
| Master list (tailor-inc/platform-planning#1737)  | `form/modal`, plus a Sheet variant                                |
| Form-as-page (tailor-inc/platform-planning#1742) | `form/single-page`, `form/sectioned`, `form/wizard`               |

Without the link-don't-restate rule, each page entry would duplicate three pattern implementations and drift from them.

## Implementation

`generate-skill.mjs` was built for this: its `CATEGORIES` list carries a comment saying a new category needs an entry there plus a matching `{{<templateKey>}}` in `SKILL.template.md`. Both were added — `{ name: "page", entryFile: "PAGE.md", outputDir: "pages", templateKey: "PAGES_TABLE" }` and an "Available Pages" section ahead of "Available Patterns", reflecting the outer-to-inner order in which the two are chosen. `slugToFilename` derives its category list from `CATEGORIES`, so `page/collection` → `pages/collection.md` needs no further wiring.

## Consequences and open questions

- **The "Available Pages" section is empty until the first entry lands.** It renders as a heading plus the definition of the layer, which reads correctly on its own, but it is a section with no rows. The first page entry should also add a page step to the skill's "How to Use" list, which currently sends an agent straight to a pattern.
- **Subcategories are optional.** Index tables group by `subcategory` only, so a page without one renders as a bare table rather than under a heading repeating its category. Pages can adopt subcategories later where they earn their keep — Collection and Master list are both list-shaped while Detail page is not — without any generator change.
- **Page entries do not reach `docs/`.** The catalogue feeds the agent skill only. Closing that gap belongs to the documentation-management pipeline work, which intends `docs-kit` to subsume catalogue's generator; this taxonomy carries over to it unchanged, since the boundary is about authoring intent rather than how output is produced.
- **`expected-skills-files.txt` must gain a row per page entry.** It is the committed manifest guarding the gitignored generated tree, and `catalogue`'s `test` script fails when the two disagree.
- **Two migration blockers are carried on their tickets**, not here: tailor-inc/platform-planning#1742 needs `Layout` to support a centered, width-constrained form column, and tailor-inc/platform-planning#1737's overlap with Collection still needs defining.
