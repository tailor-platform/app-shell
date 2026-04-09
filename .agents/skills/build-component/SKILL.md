---
name: build-component
description: "Interactive workflow for building a new AppShell component from scratch. Gathers requirements through follow-up questions, analyzes existing patterns, plans with multi-agent process, and builds on approval. Use when: adding a new component, user says 'build component', 'new component', 'create component'."
---

# Build Component

An interactive, multi-phase workflow for building a new component from scratch. This skill gathers requirements through conversation, analyzes existing patterns, produces a plan for approval, then executes with parallel agents.

## When to Use

- User wants to add a new component to `packages/core/src/components/`
- User says "build component," "new component," "create component," or similar
- User has a design (Figma, image, or verbal description) they want turned into a component

## Phase 1: Gather Requirements

**Goal:** Understand what the user wants before touching any code.

Ask the user these questions interactively using `AskUserQuestion`. Do NOT proceed until you have answers. Ask in batches of 2-3 questions max — don't overwhelm.

### Round 1 — What and Why

1. **What is the component?** — Name, purpose, where it will be used in the app.
2. **Visual reference?** — Ask for a Figma link, screenshot, or image. If the user has a `.pen` file, use the Pencil MCP tools to read it. If no visual exists, ask them to describe the layout.

### Round 2 — Behavior and Data

3. **What data does it display?** — What props will it take? What shape is the data? Is it static or does it have loading/empty/error states?
4. **Is it interactive?** — Does it have click handlers, navigation, form inputs, or is it purely display?
5. **Where does it live?** — Is this a page-level component (like ReconciliationDetail), a sidebar card (like LinkedRecordsCard), or a primitive (like Badge)?

### Round 3 — Scope

6. **Is this reusable or domain-specific?** — Will other pages use this component, or is it specific to one feature?
7. **Does it compose existing components?** — Which existing AppShell components should it use (Card, Table, Badge, DescriptionCard, Layout, etc.)?

If the user provides enough context upfront (e.g., a detailed description with an image), skip questions they've already answered.

## Phase 2: Analyze Existing Patterns

**Goal:** Understand how similar components are built in this codebase.

Launch an **Explore agent** to:

1. Survey `packages/core/src/components/` for components similar to what the user described.
2. Read their `types.ts`, main component file, and `index.ts` to understand:
   - Props API patterns (naming, shape, data vs callbacks)
   - Which component pattern they use (A/B/C/D from [Add Component skill](../add-component/SKILL.md))
   - How they handle states (loading, empty, error)
   - What they export from `index.ts` and `packages/core/src/index.ts`
3. Check `examples/app-module/src/pages/` for demo page patterns.

Report: which existing components are closest, what pattern to use, and what can be reused.

## Phase 3: Plan

**Goal:** Produce a concrete implementation plan for user approval.

Enter **Plan Mode** and write a plan that includes:

### Component Classification

- **Pattern:** A (single file), B (compound), C (directory), or D (standalone + parts)
  — per [Add Component skill — Step 1](../add-component/SKILL.md)
- **Justification:** Why this pattern fits.

### Props API Design

- Full `Props` interface with JSDoc comments
- Internal types in `types.ts` (not exported)
- Data types consumers must construct

Follow naming conventions:
- Data: `items`, `records`, `actions`, `fields`
- Callbacks: `on{Event}`
- State: `value`, `open`, `disabled`, `loading`
- Display: `title`, `label`, `description`
- Styling: `className`

### File Plan

List every file to create or modify:

```
packages/core/src/components/{name}/
  {Name}.tsx           — main component
  types.ts             — internal types
  index.ts             — exports (component + Props only)
  {Name}.test.tsx      — tests

packages/core/src/index.ts  — add export

examples/app-module/src/pages/{name}-demo.tsx  — demo page
examples/app-module/src/custom-module.tsx       — wire demo resource
```

### Styling Notes

- All classes use `astw:` prefix
- `data-slot="{name}"` on root element
- `cn()` for class merging
- No CSS injection, no `globals.css` changes

### Test Plan

- Snapshot tests for each visual state
- Behavioral tests for interactions
- Edge case tests (empty data, null values)

### Demo Plan

- Realistic demo data (real names, codes, amounts — not "Acme Corp" or "Test Item")
- Cover all component states in the demo

Present the plan and call `ExitPlanMode` for approval. Do NOT start coding until approved.

## Phase 4: Build

**Goal:** Implement the component efficiently. Use agents only when there's a real parallelism gain — don't force agents for small sequential tasks.

### When to use agents

- **Use agents** when two or more tasks are genuinely independent and each takes significant effort (e.g., building a component file and building a demo page at the same time).
- **Don't use agents** for small tasks (creating an `index.ts`, adding an export line), sequential work, or when you'd spend more time writing the agent prompt than doing the work yourself.

### Typical build flow

1. **Create types + component** — Write `types.ts` first (interfaces, maps), then `{Name}.tsx`. Do this yourself since it's the core work and requires iterating on the plan.

2. **Demo + tests in parallel** — Once the component exists, these two tasks are independent and substantial enough to parallelize:
   - **Agent A:** Create demo page at `examples/app-module/src/pages/{name}-demo.tsx` with realistic data covering all states. Brief the agent with the Props interface, component file path, and demo patterns from existing pages.
   - **Agent B:** Create test file `{Name}.test.tsx` with snapshots, behavioral tests, and edge cases. Brief the agent with the Props interface and expected behavior.

3. **Wiring** — Small sequential steps, do directly:
   - Create `index.ts` (component + Props export only)
   - Add export to `packages/core/src/index.ts`
   - Wire demo into `examples/app-module/src/custom-module.tsx`

4. **Quality checks** — Run `pnpm type-check && pnpm lint && pnpm test && pnpm fmt`. Fix any failures and re-run until clean.

### Agent prompt rules

Since agents don't share conversation context, every agent prompt must include:
- The Props interface and type definitions (copy from the plan)
- File paths to create and reference files to read
- Key patterns: `astw:` prefix, `cn()`, `data-slot`, no internal type exports
- What realistic demo data looks like (real names, not "Acme Corp")

## Phase 5: Review & Deliver

**Goal:** Self-review and present the finished component.

After all waves complete, present to the user:

1. **What was built** — component name, pattern used, files created
2. **Props API** — final interface with descriptions
3. **How to see it** — `pnpm dev` → navigate to demo page path
4. **Test results** — all tests passing, snapshot count
5. **Review results** — any Low-priority items from the component review
6. **Next steps** — changeset needed? docs page needed?

## Rules

- **Never skip Phase 1.** Even if the user provides a lot of context, confirm your understanding before planning.
- **Never skip Phase 3.** Always produce a plan and get approval before writing code.
- **Follow the Add Component skill exactly** for implementation patterns — do not invent new patterns.
- **Minimal exports** — component + Props type only. No internal types in public API.
- **Realistic demo data** — no placeholder names. Use industry-appropriate names, codes, and amounts.
- **Self-contained** — components must not add to `globals.css`, must not use `"use client"`, must use `astw:` prefix on all Tailwind classes.

## References

- [Add Component skill](../add-component/SKILL.md) — patterns, styling, Base UI, exports, tests
- [Component Review skill](../component-review/SKILL.md) — pre-push audit
- [Quality Check skill](../quality-check/SKILL.md) — type-check, lint, test, fmt
- [Create Changeset skill](../create-changeset/SKILL.md) — versioning
- [Component Design skill](../../.cursor/skills/component-design/SKILL.md) — design-to-component workflow
- [Build New Component command](../../.cursor/commands/build-new-component.md) — planning checklist
- [API Design Reviewer](../../.github/agents/api-design-reviewer.md) — API design principles
