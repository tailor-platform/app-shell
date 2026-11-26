import { useCallback, useReducer } from "react";
import type { StepperProgress, UseStepperOptions, UseStepperReturn } from "./types";

type State<Id extends string> = {
  stepIds: readonly Id[];
  index: number;
  skipped: readonly number[];
};

type Action =
  | { type: "next" | "back" | "skip" }
  | { type: "move"; index: number; skipped: boolean };

function initialize<Id extends string>({ steps, initialStepId }: UseStepperOptions<Id>): State<Id> {
  const stepIds = steps.map((step) => step.id);
  if (stepIds.length === 0) throw new Error("[useStepper] steps must not be empty.");
  const seen = new Set<Id>();
  for (const id of stepIds) {
    if (seen.has(id)) throw new Error(`[useStepper] duplicate step id "${id}".`);
    seen.add(id);
  }
  const index = initialStepId === undefined ? 0 : stepIds.indexOf(initialStepId);
  if (index < 0) throw new Error(`[useStepper] initialStepId "${initialStepId}" is not a step.`);
  return { stepIds, index, skipped: [] };
}

function move<Id extends string>(state: State<Id>, index: number, skip = false): State<Id> {
  const skipped = state.skipped.filter((i) => i < Math.min(state.index, index));
  if (skip) {
    for (let i = state.index; i < index; i++) skipped.push(i);
  }
  return { ...state, index, skipped };
}

function reducer<Id extends string>(state: State<Id>, action: Action): State<Id> {
  const count = state.stepIds.length;
  switch (action.type) {
    case "next":
    case "skip":
      return state.index === count ? state : move(state, state.index + 1, action.type === "skip");
    case "back":
      return state.index === 0 ? state : move(state, state.index - 1);
    case "move":
      return move(state, action.index, action.skipped);
  }
}

/**
 * Owns progress through a fixed sequence, with ids inferred from steps.
 * Pass the returned steps and progress to Stepper; gate navigation in the page.
 * Remount the owner to reset progress or change the step ids/order.
 */
export function useStepper<const Id extends string>(
  options: UseStepperOptions<Id>,
): UseStepperReturn<Id> {
  const { steps } = options;
  const [state, dispatch] = useReducer(reducer<Id>, options, initialize<Id>);

  if (
    steps.length !== state.stepIds.length ||
    steps.some((step, index) => step.id !== state.stepIds[index])
  ) {
    throw new Error("[useStepper] step ids and order must stay fixed; remount to change them.");
  }

  const next = useCallback(() => dispatch({ type: "next" }), []);
  const back = useCallback(() => dispatch({ type: "back" }), []);
  const skip = useCallback(() => dispatch({ type: "skip" }), []);
  const moveStep = useCallback(
    (id: Id, { skipped = false }: { skipped?: boolean } = {}) => {
      const index = state.stepIds.indexOf(id);
      if (index < 0) throw new Error(`[useStepper] step id "${id}" is not a step.`);
      dispatch({ type: "move", index, skipped });
    },
    [state.stepIds],
  );

  const skipped = new Set(state.skipped);
  const progress: Extract<StepperProgress, { state: "started" }> = {
    state: "started",
    passedSteps: Array.from({ length: state.index }, (_, index) =>
      skipped.has(index) ? "skipped" : "complete",
    ),
  };
  const common = {
    steps,
    progress,
    currentStepIndex: state.index,
    hasPrevious: state.index > 0,
    back,
    moveStep,
  };

  return state.index === steps.length
    ? {
        ...common,
        hasNext: false,
        currentStepId: undefined,
        next: undefined,
        skip: undefined,
      }
    : {
        ...common,
        hasNext: true,
        currentStepId: state.stepIds[state.index],
        next,
        skip,
      };
}
