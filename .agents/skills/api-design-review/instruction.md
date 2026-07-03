---
description: Shared API design review rubric for GitHub Agentic Workflows and pi skills.
---

## Review Scope

Only review code that was **changed in this PR or local diff**. Do not comment on unchanged code.

### Breaking Change Baseline

When evaluating whether a change is a "breaking change," **always compare against the base branch (e.g., `main`)**, not against earlier commits within the same PR or branch. If a component, hook, type, or function was **introduced in the current branch** and does not exist on the base branch, modifications to its API within the same branch are NOT breaking changes — they are simply iterating on unreleased code.

### Review Depth

- Use export/usage impact analysis as the basis for tracing affected code paths. Do not redundantly search for usages that you have already identified.
- Evaluate proposed fixes holistically: When suggesting a fix, also analyze what new edge cases or failure modes that fix would introduce.
- Verify documentation-implementation consistency: When a change modifies type signatures (for example, making a field optional), check that JSDoc comments and default behaviors reflect the same semantics.
- Assess test quality, not just coverage: Check that tests verify **runtime behavior**, not just data structure.

### What to Flag

Report **only issues that are genuinely impactful**. Aim for quality over volume. Report up to **10 issues** maximum, sorted by severity (High → Medium → Low). Use this format:

```
[N/total — Severity] Brief title
```

#### Severity Levels

| Severity   | Description                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| **High**   | Breaking API changes, API inconsistency, critical runtime errors, significant performance degradation |
| **Medium** | Memory leaks, insufficient error handling, behavior not matching expectations                         |
| **Low**    | Insufficient tests, missing documentation, unnecessary complexity, JSDoc-implementation mismatch      |

### What NOT to Flag (Out of Scope)

- **Internal (non-exported) components** — Do not flag them as breaking API changes or public API concerns.
- **Detectable by linter/type-check** — Code style, hooks rule violations, explicit `any`, import ordering.
- **Subjective** — Naming preferences, minor refactoring suggestions without clear justification.

## API Design Principles

Follow the API Design Principles defined in the [Add Component Skill](/.agents/skills/add-component/SKILL.md). Key rules:

- Minimal public API surface — only export the component and its primary props type.
- Leverage TypeScript type inference over exporting internal types.
- Follow the pattern: `export { ComponentName, type ComponentNameProps }`.
