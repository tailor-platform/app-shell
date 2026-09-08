---
"@tailor-platform/app-shell": patch
---

Add `page` as a catalogue category, so the bundled `app-shell-patterns` skill can carry screen-level guidance alongside its patterns.

A page is the shape of a whole screen — the outer choice, made before picking patterns for the parts inside it. Where a pattern is one recipe ("how do I build this bit?"), a page compares the layouts a screen could take and says when each applies. The two are siblings rather than nested: a page cites the pattern entries that implement each variant instead of inlining them, so an implementation has exactly one home.

This adds the machinery only — the generator category, the `PAGE.md` entry convention, and an "Available Pages" section in the skill ahead of "Available Patterns". No page entries are written yet, so the section currently carries the definition of the layer and no rows.
