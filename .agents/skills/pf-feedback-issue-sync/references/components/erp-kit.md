---
# identity (canonical source: team-ps/platform-feedback/references/components/erp-kit.md)
component: erp-kit
label: erp-kit
title_prefix: "[erp-kit]"
project: 15
project_component: erp-kit
primary_package: "@tailor-platform/erp-kit"
# sync lifecycle — TODO confirm before enabling (see notes below).
# Until all three are filled, erp-kit runs link/triage reconcile only.
milestone_prefix: ""
release_repo: ""
release_tag_prefix: ""
---

# Component: erp-kit

Tailor ERP-Kit (`@tailor-platform/erp-kit`) — the SDK extension and skill bundle
for ERP-shaped applications.

> **Lifecycle not yet enabled.** ERP-Kit uses semantic versioning, so the
> milestone-earmark + release-announce stages should apply — but the exact board
> milestone naming and release source still need confirming. Fill the three
> lifecycle fields once verified (see TODO below). Until then this component
> reconciles linkage and ticket filing only.

## Scope — what is "in scope" for reconciliation

- **In scope (canonical):** discussions carrying the `erp-kit` label. Because
  `erp-kit` and `erp-kit-module` **share the same `erp-kit` label**, the
  `[erp-kit]` title prefix is what separates them here — reconcile the
  `[erp-kit]`-prefixed ones and leave `[module]` to erp-kit-module (project 17).
- **Fuzzy candidate pass:** `@tailor-platform/erp-kit`, `erp-kit`, `erpkit`.
  (Canonical fingerprint:
  `../../../../team-ps/platform-feedback/references/components/erp-kit.md`.)

## Exclusions — what is NOT in scope (never label, never file)

- **erp-kit framework/process vs. a business module.** This component covers the
  erp-kit _framework / generators / executor / CLI / packaging_ (project 15).
  Feedback about a specific business module's domain behaviour (accounting,
  inventory, sales, …) is the separate **erp-kit-module** component, tracked on
  project **17** with a `Module` field — do not file those here; flag for
  module routing.
- Feedback about a project that merely _uses_ erp-kit → _needs a human_.

## Milestone & release (TODO — confirm before enabling)

- **Milestone naming:** confirm what the ERP-Kit team uses on project 15 (e.g.
  `ERP-Kit vX.Y.Z`?), then set `milestone_prefix`.
- **Shipped signal:** confirm the release repo and tag prefix (e.g.
  `tailor-platform/erp-kit` + `@tailor-platform/erp-kit@`?), then set
  `release_repo` and `release_tag_prefix`.

## Component-specific instructions

- `Related Component` for filed tickets is the literal `SDK / ERP-Kit`.
