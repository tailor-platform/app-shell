---
# Copy this file to <component>.md and fill it in. Frontmatter is the machine-
# readable config; the body is the human guidance the reconciler reads.
#
# ── identity (same data platform-feedback / pf-feedback-triage use) ──
component: "" # the component key, e.g. app-shell
label: "" # discussion label = the canonical in-scope signal, e.g. AppShell. Empty = no dedicated label (catch-all)
title_prefix: "" # e.g. "[app-shell]" — primary classify signal, matches platform-feedback's prefix
project: 15 # 15 = Tailor Platform, 17 = ERP Kit Modules
project_component: "" # project-15 Component option name (or "" for project-17 / catch-all). Routed via pf-feedback-triage/references/project-routing.md
primary_package: "" # e.g. @tailor-platform/app-shell ("" for catch-alls)
#
# ── sync lifecycle (this skill only) ──
# Leave ALL THREE empty to disable the milestone+release stages for this
# component (link/triage reconcile still runs). Fill all three to enable them.
milestone_prefix: "" # board milestone naming, e.g. "AppShell v" → matches "AppShell v1.4.0"
release_repo: "" # repo whose Releases mark "shipped", e.g. tailor-platform/app-shell
release_tag_prefix: "" # release tag prefix, e.g. "@tailor-platform/app-shell@" → tag "@tailor-platform/app-shell@1.4.0"
---

# Component: <component>

One-line description of the package/component this file configures.

## Scope — what is "in scope" for reconciliation

- **In scope (canonical):** discussions carrying the `label` above. All
  reconcile actions only ever run against this set.
- **Fuzzy candidate pass** (catch unlabelled feedback): substring/regex terms
  that suggest the discussion is about this component. The canonical detection
  fingerprint lives in
  `../../../../team-ps/platform-feedback/references/components/<component>.md`
  — restate here only the terms used to _propose the `label`_, e.g.:
  - `@tailor-platform/<pkg>`
  - `<short-name>`

## Exclusions — what is NOT in scope (never label, never file)

State the "merely uses X vs. about X itself" rule and any hard exclusions, e.g.:

- Feedback about a project that merely _uses_ this package, where the problem is
  not in the package itself → list under _needs a human_, do not label/file.
- Mentions where another component owns the surface (name them) → out of scope.
- Low-confidence fuzzy hits → flag, never auto-act.

## Milestone & release (only if the lifecycle fields are set)

- **Milestone naming:** `<milestone_prefix>X.Y.Z` on `tailor-inc/platform-planning`.
- **Shipped signal:** a release tagged `<release_tag_prefix>X.Y.Z` on
  `<release_repo>` (a closed milestone is a weaker corroborating signal).
- Any component-specific quirks in how versions map (monorepo tag style, etc.).

## Component-specific instructions

Anything else the reconciler should know for this component — known maintainers
whose replies set disposition, related components to redirect to, wording
preferences for the comment templates, etc.

---

## Adding a component — checklist

1. Copy this file to `<component>.md`, set `component`, `label`, `title_prefix`,
   `project`, `project_component`, `primary_package` from the matching
   `team-ps/platform-feedback/references/components/<component>.md`.
2. Confirm the **milestone naming** the component's team uses on project 15/17
   and its **release repo + tag prefix**. Fill `milestone_prefix`,
   `release_repo`, `release_tag_prefix`. If you can't confirm them yet, leave
   them empty — the component runs link/triage reconcile only until they're set.
3. Fill the Scope / Exclusions / Instructions sections.
4. No SKILL.md change needed — `--component <name>` and `--all` pick it up.

### Known coordinates to confirm for the common components

| component | label    | package                    | milestone_prefix | release_repo / tag_prefix                                                                                                                                                             |
| --------- | -------- | -------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| app-shell | AppShell | @tailor-platform/app-shell | `AppShell v` ✅  | tailor-platform/app-shell · `@tailor-platform/app-shell@` ✅                                                                                                                          |
| sdk       | SDK      | @tailor-platform/sdk       | **TODO confirm** | **TODO confirm**                                                                                                                                                                      |
| erp-kit   | erp-kit  | @tailor-platform/erp-kit   | **TODO confirm** | **TODO confirm**                                                                                                                                                                      |
| console   | (n/a)    | (n/a)                      | **TODO confirm** | **TODO confirm** (console is a project-15 Component option `console`; no npm package — confirm whether it has version-named milestones/releases at all before enabling the lifecycle) |
