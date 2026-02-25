---
applyTo: "packages/**/*.ts,packages/**/*.tsx,packages/**/package.json"
excludeAgent: "coding-agent"
description: Code review guidelines focused on API design consistency and identifying potential footguns in TypeScript/React code.
---

# Focus

* Review for API consistency and potential present/future footguns

# Output Format

* Report up to 10 issues, sorted by severity (High → Medium → Low)
* Use format: `[N/total — Severity] Brief title`

## Severity Levels

| Severity | Description |
|----------|-------------|
| **High** | Breaking API changes, API inconsistency, critical runtime errors, significant performance degradation |
| **Medium** | Memory leaks, lack of type safety, insufficient error handling, behavior not matching expectations |
| **Low** | Insufficient tests, missing documentation, unnecessary complexity |

# Skip Rules

* Do not re-flag issues that have already been addressed in previous review iterations
* Skip comments on code that was not changed in this PR

## Out of Scope

The following should NOT be flagged in reviews:

### Detectable by Linter/Type-check

* Code style and formatting issues (they should be delegated to linters/formatters)
* React hooks rule violations (conditional calls, missing dependencies)
* Prohibited type usage (e.g., explicit `any`)
* Import ordering

### Subjective/Ad-hoc

* Naming convention preferences
* Minor refactoring suggestions without clear justification
