---
# identity (canonical source: team-ps/platform-feedback/references/components/app-shell.md)
component: app-shell
label: AppShell
title_prefix: "[app-shell]"
project: 15
project_component: app-shell
primary_package: "@tailor-platform/app-shell"
# sync lifecycle — fully configured
milestone_prefix: "AppShell v"
release_repo: tailor-platform/app-shell
release_tag_prefix: "@tailor-platform/app-shell@"
---

# Component: app-shell

Tailor AppShell (`@tailor-platform/app-shell`) — the application shell framework
used by Tailor frontends.

## Scope — what is "in scope" for reconciliation

- **In scope (canonical):** discussions carrying the `AppShell` label. Reconcile
  actions only ever run against this set.
- **Fuzzy candidate pass** (catch unlabelled feedback): match `app[-\s]?shell`
  (case-insensitive) in title or body — catches `[app-shell]`, `[AppShell]`, and
  prose like `app-shell に …`. Also `@tailor-platform/app-shell`.

## Exclusions — what is NOT in scope (never label, never file)

For each fuzzy candidate, classify: is this feedback _about the app-shell library
itself_ (a bug / request / report about `@tailor-platform/app-shell` components,
APIs, types, behaviour) — versus a problem in a project that merely _uses_
app-shell?

- Confident it's about the library → propose applying the `AppShell` label
  (approval); once labelled it flows through the pipeline like any in-scope post.
- "Just uses app-shell", or **not confident** → never label, never file. List
  under _needs a human_. Lean on the discussion form's `Feedback Type` and
  `Related Component` fields plus title/body.
- Already labelled for another component (`SDK`, `Platform`, `erp-kit`) where
  app-shell is only mentioned in passing → out of scope.

## Milestone & release

- **Milestone naming:** `AppShell vX.Y.Z` on `tailor-inc/platform-planning`.
- **Shipped signal:** a release tagged `@tailor-platform/app-shell@X.Y.Z` on
  `tailor-platform/app-shell`. A closed milestone is a weaker corroborating
  signal — a ticket can be milestoned `vX.Y.Z` and slip, or be milestoned but
  still open, so require the published release before announcing.
- A ticket closed with **no milestone** → can't name a version → flag, never
  announce.

## Component-specific instructions

- A gh bot auto-translates discussion posts/comments into Japanese shortly after
  posting. Post in **English only**; do not add a Japanese version yourself, and
  do not treat the bot's appended translation as someone else's reply. Version
  detection keys on the `vX.Y.Z` token, which the translation preserves.
- `Related Component` for filed tickets is the literal `AppShell`.
