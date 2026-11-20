---
name: code-review
description: "Substantive review of repository PRs and connected behavior, with AppShell-specific checks for public API compatibility, Base UI and Field/Form integration, accessibility, and React lifecycle where relevant."
---

Read the [shared reference map](../../references/README.md) and load only the references relevant to the change.

## Review Procedure

1. Establish the exact base/head range and review the full PR diff, not just the latest commit or a sample of files.
2. Trace changed behavior through connected implementation, callers, tests, configuration, and documentation. Evaluate failure paths, edge cases, trust boundaries, compatibility, and lifecycle/concurrency where relevant. Reading files or passing mechanical checks alone is not this analysis.
3. Apply the priority checks below where relevant. For scripts, workflows, or other non-package changes, review their actual behavior and contracts; do not skip this skill because no `packages/**` files changed.
4. Report concrete findings supported by the reviewed code and a failing scenario. `No findings` is a conclusion only after substantive review is complete, never a default because tests passed, a diff was inspected, or no review was performed. If the review was not performed or is unfinished, report it as incomplete instead of claiming a clean result.

## Priority Checks

- **Published contract:** inspect package entrypoints, `package.json` exports, public types, CSS entrypoints, and consumer import paths. Check for accidental exports, typing regressions, and unexpected CSS side effects.
- **Internal behavior:** do not treat internal code as a public API, but still trace its effects on consumers.
- **Base UI integration:** preserve primitive behavior, prop ownership, popup/portal layering, and controlled/uncontrolled state contracts.
- **Field/Form and accessibility:** preserve one semantic field value, submission and validation behavior, labeling, keyboard interaction, focus, and announced state.
- **React lifecycle:** check state ownership, async races, subscriptions, and cleanup across rerender and unmount. Question timing or DOM workarounds when an existing React, CSS, or Base UI mechanism would avoid the risk.
- **Contract evidence:** when signatures, defaults, or behavior change, compare implementation with documentation and examples. Check that relevant tests exercise the risky behavior; snapshots alone do not prove interaction or type compatibility.
