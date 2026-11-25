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

export interface UseStepperOptions<Id extends string = string> {
  /** Non-empty steps with unique ids, in a fixed order for the hook's lifetime. */
  steps: readonly StepperStep<Id>[];
  /** Start on this step; defaults to the first step. Read only on mount. */
  initialStepId?: NoInfer<Id>;
}

export interface UseStepperReturn<Id extends string = string> {
  steps: readonly StepperStep<Id>[];
  progress: StepperProgress<Id>;
  /** Undefined once the flow is complete. */
  currentStepId: Id | undefined;
  /** Zero-based position; equals steps.length once complete. */
  currentStepIndex: number;
  isLastStep: boolean;
  isComplete: boolean;
  canBack: boolean;
  /** Complete the current step and advance; completes the flow at the last step. */
  next: () => void;
  /** Go back one step; after completion, reopens the last step. */
  back: () => void;
  /** Skip the current step and advance; completes the flow at the last step. */
  skip: () => void;
  /** Complete the last step. Throws if called before the last step. */
  finish: () => void;
  /**
   * Move to an existing step. Forward moves complete the steps passed.
   * With skipped: true, skip the current step through the destination's predecessor.
   * Backward moves discard skip records at and after the destination.
   */
  moveStep: (id: Id, options?: { skipped?: boolean }) => void;
}
