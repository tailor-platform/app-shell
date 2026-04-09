---
name: component-review
description: "Reviews all component changes on the current branch against main. Checks API design, exports, patterns, styling, test coverage, and data safety. Use when: before pushing, before PR, pre-push review, component audit."
---

# Component Review

Run this skill before pushing a branch that adds or modifies components. It diffs against `main`, audits every changed component file against the project's established patterns and rules, and produces a categorized report with actionable fixes.

## When to Use

- Before pushing component changes
- User says "review components," "pre-push check," or "audit my changes"
- After finishing a component and before running the [Review PR skill](../../.cursor/skills/review-pr/SKILL.md)

## Procedure

### Step 1: Gather the Diff

```bash
git fetch origin main
git diff origin/main --name-only
git diff origin/main --stat
git log origin/main..HEAD --oneline
```

Identify all changed files under `packages/core/src/components/`, `packages/core/src/lib/`, and `packages/core/src/index.ts`. Group them by component directory.

If no component files changed, report "No component changes found" and stop.

### Step 2: Impact Analysis

Follow the approach from the [Impact Analyzer](../../.github/agents/impact-analyzer.md):

1. Read `packages/core/src/index.ts` to build a map of public exports.
2. Classify each changed file as **public** (exported from index.ts) or **internal**.
3. For public files, identify changed symbols and search for usages across `packages/` and `examples/`.
4. Flag any changes that could break or silently alter existing consumers.

Use the [Breaking Change Baseline](../../.github/agents/api-design-reviewer.md) rule: if a component was introduced in this branch and doesn't exist on `main`, modifications to its API within the branch are NOT breaking changes.

### Step 3: Pattern Compliance

For each new or modified component, verify it follows the correct pattern from the [Add Component skill](../add-component/SKILL.md):

1. **Pattern selection** — Is the right pattern used?
   - Pattern A (single file) for simple variant components
   - Pattern B (compound namespace) for multi-part Base UI wrappers
   - Pattern C (directory) for complex components with internal types
   - Pattern D (standalone + parts) for compound with dominant simple usage

2. **Styling rules** (from [Add Component — Step 2](../add-component/SKILL.md#step-2-styling-rules))
   - ALL Tailwind classes use `astw:` prefix — grep for bare Tailwind classes
   - `cn()` used for class merging (not string concatenation)
   - `data-slot` attribute on root elements
   - No `<style>` tags, `dangerouslySetInnerHTML`, or CSS-in-JS
   - No `"use client"` directive
   - No additions to `globals.css`

3. **Base UI integration** (from [Add Component — Step 3](../add-component/SKILL.md#step-3-base-ui-integration))
   - Root props use `Pick<>` (not full spread)
   - `displayName` set on all sub-components
   - Composited leaf components use namespaced prop objects

### Step 4: Export Audit

Check `packages/core/src/index.ts` and each component's `index.ts` against the [Minimal Surface rules](../add-component/SKILL.md#step-4-public-api-export):

1. **Minimal surface** — Only the component + primary Props type should be exported.
   - Flag any exported internal types (enums, helper types, type guards, discriminant helpers)
   - Exception: data shape types that consumers must construct to pass as props are acceptable if the type is complex enough that inference would be impractical

2. **No dead exports** — Every exported type/component must be used or usable by consumers.
   - Check for props declared in types but never read in the component
   - Check for exported types not referenced in any Props interface

3. **No missing exports** — If a consumer must construct a complex data object to pass as a prop, ensure the type is exported or practically inferable from Props

### Step 5: Props Design Review

For each component's Props interface, check against the [API Design Principles](../../.github/agents/api-design-reviewer.md):

1. **Prop count** — Flag components with more than 8 props. Consider if some can be grouped, removed, or are domain-specific leakage.

2. **Naming conventions** — Check against established patterns:
   - Data arrays: `items`, `records`, `actions`, `fields` (not `data` unless raw object)
   - Callbacks: `on{Event}` (e.g., `onChange`, `onItemClick`, `onUpload`)
   - State: `value`, `open`, `defaultOpen`, `disabled`, `loading`
   - Display: `title`, `label`, `description`, `placeholder`
   - Styling: `className` (not `style`, `css`, `sx`)

3. **Conflicting props** — Check for mutually exclusive props that can be silently ignored at runtime. Either enforce with TypeScript unions or document precedence. (From [Review PR — Step 2.2](../../.cursor/skills/review-pr/SKILL.md))

4. **Dead props** — Check that every prop in the interface is actually used in the component's render logic. (From [Review PR — Step 2.1](../../.cursor/skills/review-pr/SKILL.md))

5. **Domain leakage** — Generic/reusable components should not have domain-specific props (e.g., a generic card component should not have `matchScore` or `reconciliationStatus`). Domain logic belongs in the caller.

6. **Type/docs/runtime alignment** — Validate that public fields in exported types are reflected in rendered/runtime behavior. Remove fields that are declared but never used. (From [Review PR — Step 2.4](../../.cursor/skills/review-pr/SKILL.md))

### Step 6: Data Safety

Check for runtime crash risks:

1. **Intl / formatting** — Any `Intl.NumberFormat`, `Intl.DateTimeFormat`, or similar calls should have try/catch. Invalid locale or currency codes cause `RangeError`.

2. **Array access** — `[0]` access without length check, `.find()` results used without null check.

3. **Drag-and-drop** — If the component has drag-and-drop or file input, verify dropped files are validated against `accept` constraints (not just the file picker).

4. **Lifecycle/resource cleanup** — `setInterval`, `setTimeout`, event listeners, blob URLs, or async operations must be cleaned up on unmount. Verify long-running async paths cannot leak resources or update state on unmounted components. (From [Review PR — Step 2.3](../../.cursor/skills/review-pr/SKILL.md))

### Step 7: Code Duplication

Search for duplicated logic across changed components and existing codebase:

1. **Utility functions** — Same function defined in multiple files (e.g., `formatCurrency`, `scoreColor`, `formatDate`). Should be extracted to `packages/core/src/lib/`.

2. **Type definitions** — Same interface/type defined in multiple places. Single source of truth.

3. **Status/variant maps** — Same mapping object duplicated across files. Extract to the component's `types.ts` or a shared location.

### Step 8: Test Coverage

For each new or modified component, check against [Add Component — Step 5](../add-component/SKILL.md#step-5-tests):

1. **Test file exists** — `{ComponentName}.test.tsx` next to the component
2. **Snapshot test** — At least one snapshot test per component
3. **State coverage** — Tests for each distinct visual state (loading, empty, error, populated, etc.)
4. **Interaction coverage** — Tests for user interactions (click, type, select, drag)
5. **Edge cases** — Tests for boundary conditions (empty data, null values, stale state after data changes)
6. **Verify tests actually assert behavior** — not just data structure. (From [API Design Reviewer — Review Depth](../../.github/agents/api-design-reviewer.md))

### Step 9: Demo / Preview

If the branch adds a new component, check for a demo page:

1. Demo exists at `examples/app-module/src/pages/<component-name>-demo.tsx`
2. Demo is wired into `examples/app-module/src/custom-module.tsx`
3. Demo data is realistic — real supplier names, product codes, amounts, and dates. No placeholder names like "Acme Corp" or "Test Item".
4. Demo covers all component states (loading, empty, populated, error, edge cases)

## Output

Produce a categorized report. Report up to **15 issues** maximum, sorted by severity.

### Critical / High (must fix before push)
Issues that will break consumers, cause runtime crashes, violate core patterns, or cause global visual regressions.

### Medium (should fix)
API design issues, missing tests, inconsistencies, dead props, duplicated code.

### Low (nice to have)
Style nits, naming preferences, documentation gaps, minor demo data improvements.

For each issue, provide:
- **File** and **line** (or line range)
- **What's wrong** — one sentence
- **Fix** — concrete code change or direction

End with a summary:

```
## Summary
- Critical: {count}
- Medium: {count}
- Low: {count}
- Components reviewed: {list}
- Public API changes: {list of added/changed exports}
```

## References

- [Add Component skill](../add-component/SKILL.md) — patterns, styling, exports, tests
- [Quality Check skill](../quality-check/SKILL.md) — type-check, lint, test, fmt
- [Review PR skill](../../.cursor/skills/review-pr/SKILL.md) — end-of-feature PR review, API hygiene
- [Component Design skill](../../.cursor/skills/component-design/SKILL.md) — design-to-component workflow
- [Build New Component command](../../.cursor/commands/build-new-component.md) — planning checklist
- [API Design Reviewer](../../.github/agents/api-design-reviewer.md) — API review principles, severity levels
- [Impact Analyzer](../../.github/agents/impact-analyzer.md) — public export tracing
