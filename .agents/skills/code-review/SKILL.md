---
name: code-review
description: "AppShell-specific review checks for public API compatibility, Base UI and Field/Form integration, accessibility, and React lifecycle. Use when reviewing PRs that change packages/**."
---

Read the [shared reference map](../../references/README.md) and load only the references relevant to the change.

## Priority Checks

- **Published contract:** inspect package entrypoints, `package.json` exports, public types, CSS entrypoints, and consumer import paths. Check for accidental exports, typing regressions, and unexpected CSS side effects.
- **Internal behavior:** do not treat internal code as a public API, but still trace its effects on consumers.
- **Base UI integration:** preserve primitive behavior, prop ownership, popup/portal layering, and controlled/uncontrolled state contracts.
- **Field/Form and accessibility:** preserve one semantic field value, submission and validation behavior, labeling, keyboard interaction, focus, and announced state.
- **React lifecycle:** check state ownership, async races, subscriptions, and cleanup across rerender and unmount. Question timing or DOM workarounds when an existing React, CSS, or Base UI mechanism would avoid the risk.
- **Contract evidence:** when signatures, defaults, or behavior change, compare implementation with documentation and examples. Check that relevant tests exercise the risky behavior; snapshots alone do not prove interaction or type compatibility.
