import type * as React from "react";

/** How a step is drawn. Derived from `progress`; never passed in. */
export type StepperStepStatus = "complete" | "current" | "upcoming" | "skipped";

export type StepperStep<Id extends string = string> = {
  /** Stable, unique id, used for navigation and passed to `onStepClick`. */
  id: Id;
  /** Step name, also used by the caption, tooltip, and click target in narrow containers. */
  label: React.ReactNode;
} & (
  | {
      /** Shown under the label — a short hint, or a few lines of values such as planned and actual dates. */
      description?: React.ReactNode;
      render?: never;
    }
  | {
      description?: never;
      /**
       * Replaces the label and description area with non-interactive content.
       * Passed steps wrap the content in a button when `onStepClick` is set.
       * Narrow containers use the common `label` instead.
       */
      render: (state: { label: React.ReactNode; status: StepperStepStatus }) => React.ReactNode;
    }
);

/**
 * Outcomes for the passed prefix of `steps`, in the same order.
 * The next step is current; when every step has an outcome, the flow is complete.
 */
export type StepperProgress =
  | { state: "not-started" }
  | { state: "started"; passedSteps: readonly ("complete" | "skipped")[] };

export interface StepperProps<Id extends string = string> {
  /** The steps, in order. */
  steps: readonly StepperStep<Id>[];
  /** How far the flow has got. Outcomes correspond to the passed prefix of `steps`. */
  progress: StepperProgress;
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

export type UseStepperReturn<Id extends string = string> = {
  steps: readonly StepperStep<Id>[];
  /** Passed-step outcomes; the hook starts immediately, even for an empty prefix. */
  progress: Extract<StepperProgress, { state: "started" }>;
  /** Zero-based position; equals steps.length once complete. */
  currentStepIndex: number;
  /** Whether back can move to or reopen a step. */
  hasPrevious: boolean;
  /** Go back one step; after completion, reopens the last step. */
  back: () => void;
  /**
   * Move to an existing step. Forward moves complete the steps passed.
   * With skipped: true, skip the current step through the destination's predecessor.
   * Backward moves discard skip records at and after the destination.
   */
  moveStep: (id: Id, options?: { skipped?: boolean }) => void;
} & (
  | {
      /** next / skip are available, including on the last step. */
      hasNext: true;
      currentStepId: Id;
      /** Complete the current step and advance; completes the flow at the last step. */
      next: () => void;
      /** Skip the current step and advance; completes the flow at the last step. */
      skip: () => void;
    }
  | {
      /** The flow is complete; next / skip are unavailable. */
      hasNext: false;
      currentStepId: undefined;
      next: undefined;
      skip: undefined;
    }
);
