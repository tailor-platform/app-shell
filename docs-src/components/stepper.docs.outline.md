---
kind: code-backed
group: stepper
title: Stepper
description: Shows progress through a fixed sequence of steps — wizard steps, approval stages, quality gates
sources:
  - packages/core/src/components/stepper/**
---

# Stepper

`Stepper` shows how far something has progressed through a fixed sequence of steps: the steps of a [wizard form](../patterns/form-wizard.md), the stages of an approval flow, the quality gates of a project. You give it the steps and one `progress` value containing the results of the steps already passed, in order; it derives the current step and completion from that prefix.

It only displays progress. The page owns `progress` and decides what happens when a step is clicked. For local wizard navigation, `useStepper` manages that state; for server-owned approval stages or quality gates, keep passing `progress` directly.

## Import

```tsx
import { Stepper, useStepper } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

## Wizard navigation with `useStepper`

`useStepper({ steps, initialStepId? })` returns `steps` and `progress` to pass to `Stepper`, plus navigation actions. It starts at the first step unless `initialStepId` is supplied. Inline definitions preserve literal ids without `as const`: both `initialStepId` and `moveStep` only accept ids from `steps`.

<!-- example: wizard-navigation -->

| Action                            | Behaviour                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `next()`                          | Complete the current step and advance; on the last step, complete the flow                                |
| `back()`                          | Go back one step; after completion, reopen the last step                                                  |
| `skip()`                          | Skip exactly the current step and advance; on the last step, complete the flow with that step skipped     |
| `moveStep(id)`                    | Move to an existing step; forward moves complete the steps passed                                         |
| `moveStep(id, { skipped: true })` | On a forward move, skip the current step and every step before the destination, excluding the destination |

For example, moving from `supplier` to `review` with `{ skipped: true }` skips `supplier`, `delivery`, and `approval`. Without the option, all three are complete. Skip records before the departure point are preserved. Backward moves discard skip records at and after the destination, so revisiting and completing a skipped step replaces its skipped status. The option has no effect on backward moves.

`UseStepperReturn` is a discriminated union based on `hasNext`: when `true`, `currentStepId` is a step id and `next` / `skip` are callable. When `false`, the flow is complete and all three are `undefined`. Check `flow.hasNext` before calling `flow.next()` or `flow.skip()` directly. Button handlers can use `onClick={flow.next}` with `disabled={!flow.hasNext}`.

`hasNext` means the next action is available, not that another step exists: it stays `true` on the last step, including a single-step flow. `next()` completes the flow on the last step; there is no separate `finish` action. Identify a final submission step by `currentStepId`, or compare `currentStepIndex` with `steps.length - 1`. The page owns submission and its success/failure state. For asynchronous submission, await success before calling `next()`; on failure, leave the current step in progress.

The hook always returns `progress.state: "started"`, with `passedSteps` containing the completed or skipped prefix, including after completion. `currentStepIndex` is zero-based and equals `steps.length` once complete. `hasPrevious` indicates whether `back()` can move to or reopen a step: it is `false` at the first step and `true` after completion. `back()` and `moveStep(id)` remain callable after completion and reopen a step, restoring `next` / `skip`. `back()` at the first step is a no-op. Previously captured `next` / `skip` callbacks are also no-ops if called after completion.

The hook requires non-empty steps with unique ids and throws for unknown initial or destination ids. Step ids and their order must stay fixed for the hook's lifetime; labels, descriptions, and render callbacks can change. `initialStepId` is read only on mount. Remount the owner (for example with a React `key`) to reset the flow or change its sequence.

Navigation does not validate forms or submit data. Call the actions only after page-level validation succeeds, as in the [wizard form pattern](../patterns/form-wizard.md).

## Props

| Prop          | Type               | Default    | Description                                                                                   |
| ------------- | ------------------ | ---------- | --------------------------------------------------------------------------------------------- |
| `steps`       | `StepperStep[]`    | -          | The steps, in order                                                                           |
| `progress`    | `StepperProgress`  | -          | How far the flow has got (below)                                                              |
| `onStepClick` | `(id: Id) => void` | -          | Makes passed steps (completed or skipped) clickable — for example to go back to a wizard step |
| `aria-label`  | `string`           | "Progress" | Accessible name for the list of steps (the default is translated)                             |
| `className`   | `string`           | -          | Additional CSS classes                                                                        |
| `style`       | `CSSProperties`    | -          | Inline styles                                                                                 |

### `StepperStep`

| Field         | Type                               | Description                                                                     |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `id`          | `Id extends string`                | Stable, unique id, used for navigation and passed to `onStepClick`              |
| `label`       | `ReactNode`                        | Required step name; also used by the caption and tooltip in narrow containers   |
| `description` | `ReactNode`                        | Optional content under the standard label; cannot be combined with `render`     |
| `render`      | `({ label, status }) => ReactNode` | Optional custom text-area renderer; replaces the standard label and description |

### Custom rendering

Use either `description` for the standard label-and-description layout or `render` to compose the entire text area, including badges. They are mutually exclusive. `render` receives the common `label` and the derived status (`"complete"`, `"current"`, `"upcoming"`, or `"skipped"`); it does not replace the markers or connectors.

The common `label` remains required even with `render`: below 400px of container width, custom content is not shown and the caption and tooltip use `label`. Stepper still owns progress, `aria-current`, and status announcements.

Return non-interactive content only — no buttons, links, or other controls. When `onStepClick` is set, Stepper wraps the entire custom content of a completed or skipped step in its own button.

## Progress

`progress` is either not started or started with the results of the steps already passed. `passedSteps` corresponds to a prefix of `steps`, in the same order. Its length is the current step's zero-based index; when it contains a result for every step, the flow is complete. The type is not generic because progress does not name step ids.

```ts
type StepperProgress =
  | { state: "not-started" }
  | { state: "started"; passedSteps: readonly ("complete" | "skipped")[] };
```

| Progress                               | How the steps look                                                          |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `state: "not-started"`                 | All upcoming                                                                |
| `state: "started", passedSteps: []`    | First step current; the rest upcoming                                       |
| Started, with fewer results than steps | Prefix complete or skipped; the next step current; all later steps upcoming |
| Started, with a result for every step  | All complete or skipped; no current step                                    |

For `details → approval → review`, `passedSteps: ["complete", "skipped"]` means details is complete, approval was skipped, and review is current. The current step cannot also be skipped, and a future step cannot be marked skipped: only the passed prefix has results. Completion is derived rather than supplied as another state.

| Look     | Marker                         |
| -------- | ------------------------------ |
| Complete | Filled, with a check           |
| Current  | Outlined in the primary colour |
| Upcoming | Outlined, muted                |
| Skipped  | Dashed outline, muted          |

The current step gets `aria-current="step"`, and screen readers hear how the others stand ("Completed", "Skipped", "Not started"). The line is filled up to the current step, or all the way once complete.

### Skipping steps

A `"skipped"` result marks a step the user moved past without doing, for example by pressing "Skip" in a wizard. For each passed step, use `"complete"` or `"skipped"` at its position in `passedSteps`. A skipped step stays clickable through `onStepClick`, so the user can go back and do it.

Business states such as "Waiting for approval" or "Overdue" aren't progress; show them with `description` or compose a badge inside `render`.

### Typed ids

Step ids are typed from `steps`: `onStepClick` receives those ids, and `useStepper` navigation accepts them. `progress` uses ordered results rather than ids.

```tsx
<Stepper
  steps={[
    { id: "supplier", label: "Supplier" },
    { id: "review", label: "Review" },
  ]}
  progress={{ state: "started", passedSteps: ["complete"] }} // supplier passed; review current
  onStepClick={(id) => goTo(id)} // id: "supplier" | "review"
/>
```

The Stepper warns in the console about duplicate step ids. It also warns and ignores surplus `passedSteps` entries beyond the number of steps. Unsupported runtime outcomes warn and display as complete. Dynamic input still needs runtime validation, but valid results cannot conflict with the derived current step.

## Stage progress

Descriptions and custom-rendered badges turn the Stepper into a stage tracker on a detail page:

<!-- example: stage-progress -->

## Narrow containers

The Stepper adapts to the width of its container, not the viewport:

- When the steps don't fit side by side, the row scrolls sideways rather than squeezing the labels.
- Below 400px it shows only the markers and lines, with "Step 2 of 4" and the current step's label underneath. This is what a wizard needs in a dialog on a phone.
- Each marker then names its step in a tooltip on hover, and the marker of a passed step becomes the button that goes back to it, so keyboard users still have one visible place to focus.
