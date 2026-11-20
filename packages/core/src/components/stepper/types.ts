import type * as React from "react";

/** How a step is drawn. Derived from `progress`; never passed in. */
export type StepperStepStatus = "complete" | "current" | "upcoming" | "skipped";

export interface StepperStep<Id extends string = string> {
  /** Stable, unique id, used by `progress` and passed to `onStepClick`. */
  id: Id;
  /** Step name. */
  label: React.ReactNode;
  /** Shown beside the label — for example a "Next" or "Overdue" Badge. */
  badge?: React.ReactNode;
  /** Shown under the label — a short hint, or a few lines of values such as planned and actual dates. */
  description?: React.ReactNode;
}

/**
 * How far the flow has got. Steps before the current one are complete, the
 * current one is current, and the ones after it are upcoming.
 *
 * `skippedStepIds` names steps the user moved past without doing — for
 * example by pressing "Skip" in a wizard. Only steps already passed can be
 * skipped: before `currentStepId` while in progress, or any step once complete.
 */
export type StepperProgress<Id extends string = string> =
  | { state: "not-started" }
  | { state: "in-progress"; currentStepId: Id; skippedStepIds?: readonly Id[] }
  | { state: "complete"; skippedStepIds?: readonly Id[] };

export interface StepperProps<Id extends string = string> {
  /** The steps, in order. */
  steps: readonly StepperStep<Id>[];
  /** How far the flow has got. Its ids must be ids of `steps`. */
  progress: StepperProgress<NoInfer<Id>>;
  /**
   * `horizontal` lays the steps out in a row. Below 400px of container width it
   * shows only the markers plus "Step 2 of 4" and the current step's label;
   * each marker then names its step in a tooltip.
   * `vertical` stacks them, for a column beside a form.
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Makes passed steps (completed or skipped) clickable — for example to go
   * back to an earlier step of a wizard. Called with the step's `id`.
   */
  onStepClick?: (id: Id) => void;
  /**
   * Accessible name for the list of steps.
   * @default "Progress" (translated)
   */
  "aria-label"?: string;
  /** Additional CSS classes for the root element. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
}
