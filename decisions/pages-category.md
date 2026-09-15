# Decision: `page` as a skill category

> Status: **Decided — `packages/core/skills-src/app-shell-patterns/page/` is a sibling of `pattern/`. Machinery only; page entries land per ticket.**
> Scope: where page entries live and how they differ from patterns. Does not cover any individual page's content.

## Context

The UI Catalogue migration assessment (tailor-inc/platform-planning#1731) reviewed 10 Pages and 19 Patterns as candidates for adoption into AppShell as endorsed, documented approaches. Four Pages were agreed for migration on 2026-08-27; four others were closed as not needed (Chat, Document page and Email stay in the upstream catalogue; Assistant panel resolved to a component plus a chat-drawer layout rather than a page).

Those four had no home. Two distinct things are easy to confuse here, so to be explicit:

- **`packages/core/skills-src/`** is the tracked source for the **`app-shell-patterns` agent skill**. Core generates `packages/core/skills/` only while packing, ships it through `files: ["skills/**"]`, then removes it. This gives coding agents in consumer apps documentation where no `docs/` tree exists, without leaving a generated tree for contributors to edit.
- **The UI Catalogue at ui.tailor.tech** is a separate product living in `tailor-inc/app-web`. Nothing in this repo publishes to it; the only link is `.github/workflows/scripts/check-catalogue-links.sh`, which validates deep links out of `docs/components/*.md`.

A page is neither a component API nor a concept, and `docs/` carries no pattern category at all — so AppShell's skill source, which owns the pattern vocabulary, is where a page belongs.

## Decision

**`skills-src/app-shell-patterns/page/` is a sibling of `pattern/`, not a container for patterns.**

A page owns a route and its value is _choosing_ between the variants that could fill it. A pattern is one composition recipe used within a screen — a single recipe, not a choice between several. The test: if it owns a route and its value is choosing between variants, it is a page; if it is one way to build one thing, it is a pattern.

**The load-bearing rule: a page links, it does not restate.** Every variant a page compares should be a pattern entry the page cites by slug, never inlined. This is why the two are siblings rather than nested — the page carries the _decision_, the pattern carries the _implementation_.

That rule is doing real work, because all four agreed pages sit directly on top of patterns that already exist:

| Page                                             | Patterns it will compare                                          |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Collection (tailor-inc/platform-planning#1735)   | `list/dense-scan`, plus inline-edit and grid/list-toggle variants |
| Detail page (tailor-inc/platform-planning#1736)  | `detail/hero-with-actions`, plus a page-tabs variant              |
| Master list (tailor-inc/platform-planning#1737)  | `form/modal`, plus a Sheet variant                                |
| Form-as-page (tailor-inc/platform-planning#1742) | `form/single-page`, `form/sectioned`, `form/wizard`               |

> **Amended by the first entry.** Detail page did not land as a comparison. A
> review of two client implementations found no tabbed detail screens in the
> field, so the tabbed variant was dropped and `detail/hero-with-actions`
> — already the house shape — moved wholesale out of `src/pattern/` to become
> `page/detail`. See "A page with one shape" below.

Without the link-don't-restate rule, each page entry would duplicate three pattern implementations and drift from them.

## Implementation

`packages/core/scripts/generate-skills.mjs` carries the category definitions. A new category needs an entry there plus a matching `{{<templateKey>}}` in `skills-src/app-shell-patterns/SKILL.template.md`. `page` adds `{ name: "page", entryFile: "PAGE.md", outputDir: "pages", templateKey: "PAGES_TABLE" }` and an "Available Pages" section ahead of "Available Patterns", reflecting the outer-to-inner order in which the two are chosen. `slugToFilename` derives its category list from `CATEGORIES`, so `page/collection` → `pages/collection.md` needs no further wiring.

## Consequences and open questions

- ~~**The "Available Pages" section is empty until the first entry lands.**~~ Resolved by the first entry, `page/detail` (tailor-inc/platform-planning#1736), which also added the page step to the skill's "How to Use" list and scoped the "NEVER mix patterns" rule so that composing patterns for different parts of one screen — which a page entry exists to direct — is no longer read as forbidden.
- **A page with one shape owns its layout.** The link-don't-restate rule was written for pages that compare variants sitting on patterns that already exist, and it holds there. It does not force a page whose shape is settled to invent a pattern to point at: `page/detail` embeds the two-column detail layout directly, having absorbed the pattern that used to hold it, and cites patterns only for the pieces inside its frame. The rule's purpose is preventing one implementation from living in two entries and drifting; a move satisfies that where a copy would not. `catalogue/src/page/README.md` carries the same clarification for authors.
- **`src/pattern/detail/` no longer exists.** Its sole entry became `page/detail`. Three `Used in patterns:` references in `fundamental/components.md` (`DescriptionCard`, `ActionPanel`, `ActivityCard`) were re-pointed at the page; anything else citing `detail/hero-with-actions` is stale.
- **Subcategories are optional.** Index tables group by `subcategory` only, so a page without one renders as a bare table rather than under a heading repeating its category. Pages can adopt subcategories later where they earn their keep — Collection and Master list are both list-shaped while Detail page is not — without any generator change.
- **Page entries do not reach `docs/`.** The skill source feeds the consumer skill only. Closing that gap belongs to future documentation-management work; this taxonomy carries over unchanged, since the boundary is about authoring intent rather than how output is produced.
- **Generated skill files have no manifest.** The core package generator clears its output first, and the package test verifies the packed tarball rather than an untracked worktree tree.
- **Two migration blockers are carried on their tickets**, not here: tailor-inc/platform-planning#1742 needs `Layout` to support a centered, width-constrained form column, and tailor-inc/platform-planning#1737's overlap with Collection still needs defining.
