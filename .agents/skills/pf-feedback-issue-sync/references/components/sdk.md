---
# identity (canonical source: team-ps/platform-feedback/references/components/sdk.md)
component: sdk
label: SDK
title_prefix: "[sdk]"
project: 15
project_component: tailor-sdk
primary_package: "@tailor-platform/sdk"
# sync lifecycle — TODO confirm before enabling (see notes below).
# Until all three are filled, sdk runs link/triage reconcile only.
milestone_prefix: ""
release_repo: ""
release_tag_prefix: ""
---

# Component: sdk

Tailor Platform SDK (`@tailor-platform/sdk`).

> **Lifecycle not yet enabled.** The SDK uses semantic versioning, so the
> milestone-earmark + release-announce stages should apply — but the exact
> board milestone naming and release source still need confirming. Fill the
> three lifecycle fields once verified (see TODO below). Until then this
> component reconciles linkage and ticket filing only; milestone/release states
> are reported as _not configured_.

## Scope — what is "in scope" for reconciliation

- **In scope (canonical):** discussions carrying the `SDK` label.
- **Fuzzy candidate pass:** `@tailor-platform/sdk`, `tailor-sdk`, `sdk generate`,
  `sdk apply`, `defineGenerators`, `authInvoker`. (Canonical fingerprint:
  `../../../../team-ps/platform-feedback/references/components/sdk.md`.)

## Exclusions — what is NOT in scope (never label, never file)

- Feedback about a project that merely _uses_ the SDK, where the problem is not
  in the SDK itself → _needs a human_.
- erp-kit-specific feedback that happens to mention the SDK → route to `erp-kit`.

## Milestone & release (TODO — confirm before enabling)

- **Milestone naming:** confirm what the SDK team uses on project 15 (e.g.
  `SDK vX.Y.Z`?), then set `milestone_prefix`.
- **Shipped signal:** confirm the SDK release repo and tag prefix (e.g.
  `tailor-platform/sdk` + `@tailor-platform/sdk@`?), then set `release_repo`
  and `release_tag_prefix`.

## Component-specific instructions

- Filed SDK tickets also get the `SDK` label (contract members without project-15
  access rely on it) — `pf-feedback-triage`'s issue-template already handles this
  for `project_component: tailor-sdk`.
