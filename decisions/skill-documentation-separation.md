# Skill/documentation separation

## Decision

Separate agent workflow instructions from versioned documentation:

- `skills/app-shell-patterns/SKILL.md` and its discovery script are hand-authored,
  Git-managed consumer skill sources, installable by repository-based skill tools.
- `docs-src/` remains the authored documentation source. Docs-kit generates and checks
  `docs/` and `docs-manifest.json`; it no longer generates or tracks consumer skills.
- `docs-src/guides/index.docs.outline.md` owns reading routes. Its `<!-- docs-index -->`
  token generates the catalogue from outline titles, descriptions, and output paths.
- Core's `prepack` copies the entire generated `docs/` tree into ignored
  `packages/core/docs/`. npm publishes `dist/**` and `docs/**`, not skills.
- The skill's discovery script resolves app-shell from the consuming workspace and
  locates its bundled `docs/index.md`. The installed package's docs are authoritative
  for its API, examples, patterns, and migrations.

## Rationale

The skill should explain when and how to consult documentation, not duplicate its
catalogue. Putting the catalogue in the docs makes it useful to both humans and agents,
while removing skill template expansion and its separate manifest bookkeeping.

Repository distribution lets users install the skill independently of npm. Documentation
stays tied to the installed package version rather than the skill's repository revision.
There is no requirement to make the skill self-contained without an installed app-shell
package.

## Preserved guarantees

API-surface drift detection, public-export coverage reconciliation, example extraction,
generated-doc integrity checks, and docs-browser consumption remain unchanged. Copying
the docs tree without flattening preserves relative documentation links. Packing fails
before replacing any existing docs copy if the generated root index is missing; run
`pnpm docs:sync` before packing when documentation inputs have changed.

This supersedes the consumer-skill generation and npm skill-packaging portions of
[Documentation Management Overhaul](./documentation-management-overhaul.md), not its
documentation authorship or verification model.
