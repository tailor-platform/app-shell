---
kind: code-backed
group: stepper
title: Stepper
description: Shows progress through a fixed sequence of steps — wizard steps, approval stages, quality gates
sources:
  - packages/core/src/components/stepper/**
---

# Stepper

`Stepper` shows how far something has progressed through a fixed sequence of steps: the steps of a [wizard form](../patterns/form-wizard.md), the stages of an approval flow, the quality gates of a project. Each step has a status, and the line between steps is filled up to the furthest step reached.

It only displays progress. The page decides each step's status and what happens when a step is clicked.

## Import

```tsx
import { Stepper } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

## Props

| Prop          | Type                         | Default        | Description                                                                        |
| ------------- | ---------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `steps`       | `StepperStep[]`              | -              | The steps, in order                                                                |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | A row of steps, or a column for beside a form                                      |
| `onStepClick` | `(id: Id) => void`           | -              | Makes completed steps clickable — for example to go back to an earlier wizard step |
| `aria-label`  | `string`                     | "Progress"     | Accessible name for the list of steps (the default is translated)                  |
| `className`   | `string`                     | -              | Additional CSS classes                                                             |
| `style`       | `CSSProperties`              | -              | Inline styles                                                                      |

### `StepperStep`

| Field         | Type                                                 | Description                                                                                  |
| ------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `id`          | `Id extends string`                                  | Stable id, passed to `onStepClick`                                                           |
| `label`       | `ReactNode`                                          | Step name                                                                                    |
| `status`      | `"complete" \| "current" \| "upcoming" \| "skipped"` | Where the step stands (below)                                                                |
| `badge`       | `ReactNode`                                          | Shown beside the label — for example a "Next" or "Overdue" `Badge`                           |
| `description` | `ReactNode`                                          | Shown under the label — a short hint, or a few lines of values such as plan and actual dates |

## Status

| `status`     | Marker                         | Use for                                      |
| ------------ | ------------------------------ | -------------------------------------------- |
| `"complete"` | Filled, with a check           | Steps that are done                          |
| `"current"`  | Outlined in the primary colour | The step the user is on, or the next one due |
| `"upcoming"` | Outlined, muted                | Steps not started                            |
| `"skipped"`  | Dashed outline, muted          | Steps that don't apply to this record        |

Mark at most one step `current`. It gets `aria-current="step"`, and screen readers hear the status of the others ("Completed", "Skipped", "Not started").

The line is filled up to the furthest step reached — the last step that is `complete` or `current`. A skipped step before it is filled through; one after it isn't.

Step ids are typed: give `steps` a union of ids and `onStepClick` receives that union.

```tsx
type StepId = "supplier" | "lines" | "review";
const steps: StepperStep<StepId>[] = [
  /* … */
];

<Stepper steps={steps} onStepClick={(id) => goTo(id)} />; // id: StepId
```

## Stage progress

Badges and descriptions turn the Stepper into a stage tracker on a detail page:

<!-- example: stage-progress -->

## Vertical

A vertical Stepper suits a column beside a form, such as a wizard on a page:

<!-- example: vertical -->

## Narrow containers

A horizontal Stepper adapts to the width of its container, not the viewport:

- When the steps don't fit side by side, the row scrolls sideways rather than squeezing the labels.
- Below 400px it shows only the markers and lines, with "Step 2 of 4" and the current step's label underneath. This is what a wizard needs in a dialog on a phone.
- Each marker then names its step in a tooltip on hover, and the marker of a completed step becomes the button that goes back to it, so keyboard users still have one visible place to focus.
