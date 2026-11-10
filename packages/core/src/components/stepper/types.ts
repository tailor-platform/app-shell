import type * as React from "react";

/**
 * Where a step stands:
 * - `complete` — done
 * - `current` — the step the user is on, or the next one due. Mark at most one step `current`.
 * - `upcoming` — not started
 * - `skipped` — doesn't apply to this record
 */
export type StepperStepStatus = "complete" | "current" | "upcoming" | "skipped";

export interface StepperStep<Id extends string = string> {
  /** Stable id, passed to `onStepClick`. */
  id: Id;
  /** Step name. */
  label: React.ReactNode;
  /** Where the step stands. */
  status: StepperStepStatus;
  /** Shown beside the label — for example a "Next" or "Overdue" Badge. */
  badge?: React.ReactNode;
  /** Shown under the label — a short hint, or a few lines of values such as planned and actual dates. */
  description?: React.ReactNode;
}

export interface StepperProps<Id extends string = string> {
  /** The steps, in order. */
  steps: StepperStep<Id>[];
  /**
   * `horizontal` lays the steps out in a row. Below 400px of container width it
   * shows only the markers plus "Step 2 of 4" and the current step's label;
   * each marker then names its step in a tooltip.
   * `vertical` stacks them, for a column beside a form.
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Makes completed steps clickable — for example to go back to an earlier
   * step of a wizard. Called with the step's `id`.
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
