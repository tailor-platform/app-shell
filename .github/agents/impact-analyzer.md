---
name: Impact Analyzer
description: "Analyzes which changed files are public exports and traces their impact across the codebase. Use as a sub-agent from API Design Reviewer."
---

# Impact Analyzer

Given a list of changed files in `packages/`, analyze their API impact by determining public export status and tracing usage across the codebase.

## Steps

1. Read `packages/core/src/index.ts` to build a map of which source files are part of the public API surface.
2. Classify each changed file:
   - **Public**: The file (or symbols from it) are exported from `index.ts`.
   - **Internal**: The file is not exported. No further analysis needed.
3. For each public file, identify the **changed symbols** (functions, types, components, hooks) from the PR diff.
4. Search for usages of those symbols across the codebase using grep.
5. Assess whether the changes could break or silently alter existing consumers.

## Output Format

Return a structured summary with these sections:

### Public Changes

For each changed public symbol:
- Symbol name and type (component/hook/type/function)
- Number of internal usage sites
- Brief risk assessment (e.g., "signature changed, 3 call sites may need update")

### Internal Changes

List of changed files that are NOT exported from `index.ts`. State only file paths — no further analysis.

### Risk Areas

For symbols with potential impact, list specific call sites:
- File path and line number
- How the site uses the symbol (e.g., "destructures `.user` from return value")
- Whether the change would cause a type error, silent behavior change, or no impact
