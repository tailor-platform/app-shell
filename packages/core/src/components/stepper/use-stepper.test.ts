import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStepper } from "./use-stepper";
import type { StepperStep, UseStepperOptions } from "./types";

const STEPS = [
  { id: "supplier", label: "Supplier" },
  { id: "delivery", label: "Delivery" },
  { id: "approval", label: "Approval" },
  { id: "review", label: "Review" },
] as const;

describe("useStepper", () => {
  it("starts at the first step, or at the initial id", () => {
    const { result } = renderHook(() => useStepper({ steps: STEPS }));
    expect(result.current.progress).toEqual({ state: "started", passedSteps: [] });
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(false);
    act(() => result.current.back());
    expect(result.current.currentStepIndex).toBe(0);

    const initial = renderHook(() => useStepper({ steps: STEPS, initialStepId: "approval" }));
    expect(initial.result.current.currentStepId).toBe("approval");
    expect(initial.result.current.currentStepIndex).toBe(2);
    expect(initial.result.current.progress).toEqual({
      state: "started",
      passedSteps: ["complete", "complete"],
    });
    expect(initial.result.current.hasPrevious).toBe(true);
  });

  it("processes batched navigation in order and reopens the last step after completion", () => {
    const { result } = renderHook(() => useStepper({ steps: STEPS }));
    const { next, skip } = result.current;
    act(() => {
      next!();
      next!();
      next!();
    });
    expect(result.current.currentStepId).toBe("review");
    expect(result.current.hasNext).toBe(true);
    act(() => result.current.next!());
    expect(result.current.progress).toEqual({
      state: "started",
      passedSteps: ["complete", "complete", "complete", "complete"],
    });
    expect(result.current.currentStepId).toBeUndefined();
    expect(result.current.currentStepIndex).toBe(STEPS.length);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.next).toBeUndefined();
    expect(result.current.skip).toBeUndefined();
    act(() => {
      next!();
      skip!();
    });
    expect(result.current.progress).toEqual({
      state: "started",
      passedSteps: ["complete", "complete", "complete", "complete"],
    });
    act(() => result.current.back());
    expect(result.current.currentStepId).toBe("review");
    expect(result.current.hasNext).toBe(true);
    expect(result.current.next).toBe(next);
    expect(result.current.skip).toBe(skip);
    act(() => result.current.next!());
    expect(result.current.hasNext).toBe(false);
  });

  it("skips exactly one step and preserves earlier skips when advancing normally", () => {
    const { result } = renderHook(() => useStepper({ steps: STEPS }));
    act(() => {
      result.current.skip!();
      result.current.next!();
    });
    expect(result.current.progress).toEqual({
      state: "started",
      passedSteps: ["skipped", "complete"],
    });
  });

  it.each([false, true])(
    "moves forward with skipped: %s, including the current step",
    (skipped) => {
      const { result } = renderHook(() => useStepper({ steps: STEPS }));
      act(() => result.current.moveStep("review", skipped ? { skipped: true } : undefined));
      expect(result.current.progress).toEqual({
        state: "started",
        passedSteps: skipped
          ? ["skipped", "skipped", "skipped"]
          : ["complete", "complete", "complete"],
      });
    },
  );

  it("discards undone skips on backward moves and completes a skipped step when redone", () => {
    const { result } = renderHook(() => useStepper({ steps: STEPS }));
    act(() => result.current.moveStep("review", { skipped: true }));
    act(() => result.current.back());
    expect(result.current.progress).toEqual({
      state: "started",
      passedSteps: ["skipped", "skipped"],
    });
    act(() => result.current.next!());
    expect(result.current.progress).toEqual({
      state: "started",
      passedSteps: ["skipped", "skipped", "complete"],
    });
    act(() => result.current.moveStep("delivery", { skipped: true }));
    expect(result.current.progress).toEqual({ state: "started", passedSteps: ["skipped"] });
    act(() => result.current.moveStep("review"));
    expect(result.current.progress).toEqual({
      state: "started",
      passedSteps: ["skipped", "complete", "complete"],
    });
  });

  it("can skip the last step, including a single-step flow, then reopen it", () => {
    const { result } = renderHook(() => useStepper({ steps: [STEPS[0]] }));
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(false);
    act(() => result.current.skip!());
    expect(result.current.progress).toEqual({
      state: "started",
      passedSteps: ["skipped"],
    });
    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.next).toBeUndefined();
    expect(result.current.skip).toBeUndefined();
    act(() => result.current.back());
    expect(result.current.progress).toEqual({ state: "started", passedSteps: [] });
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(false);
    act(() => result.current.next!());
    expect(result.current.progress).toEqual({ state: "started", passedSteps: ["complete"] });
  });

  it("restores navigation when moving to a step after completion", () => {
    const { result } = renderHook(() => useStepper({ steps: [STEPS[0]] }));
    act(() => result.current.next!());
    expect(result.current.hasNext).toBe(false);
    act(() => result.current.moveStep("supplier"));
    expect(result.current.hasNext).toBe(true);
    expect(result.current.currentStepId).toBe("supplier");
    expect(result.current.next).toBeTypeOf("function");
    expect(result.current.skip).toBeTypeOf("function");
    act(() => result.current.skip!());
    expect(result.current.progress).toEqual({ state: "started", passedSteps: ["skipped"] });
  });

  it("completes the last step only after the application submits successfully", async () => {
    const { result } = renderHook(() => useStepper({ steps: [STEPS[0]] }));
    const send = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("Submission failed"))
      .mockResolvedValueOnce(undefined);
    const submit = async () => {
      const flow = result.current;
      if (!flow.hasNext) return;
      await send();
      flow.next();
    };

    await expect(submit()).rejects.toThrow("Submission failed");
    expect(result.current.hasNext).toBe(true);
    expect(result.current.progress).toEqual({ state: "started", passedSteps: [] });
    await act(submit);
    expect(result.current.hasNext).toBe(false);
    expect(result.current.progress).toEqual({ state: "started", passedSteps: ["complete"] });
  });

  it("rejects empty, duplicate, and unknown initial ids", () => {
    expect(() => renderHook(() => useStepper({ steps: [] }))).toThrow("steps must not be empty");
    expect(() => renderHook(() => useStepper({ steps: [STEPS[0], STEPS[0]] }))).toThrow(
      'duplicate step id "supplier"',
    );
    const steps: StepperStep[] = STEPS.slice();
    expect(() => renderHook(() => useStepper({ steps, initialStepId: "missing" }))).toThrow(
      'initialStepId "missing" is not a step',
    );
  });

  it("rejects unknown runtime destinations without changing progress", () => {
    const steps: StepperStep[] = STEPS.slice();
    const { result } = renderHook(() => useStepper({ steps }));
    expect(() => result.current.moveStep("missing")).toThrow('step id "missing" is not a step');
    expect(result.current.currentStepId).toBe("supplier");
  });

  it("keeps progress across equivalent definitions and rejects changes to the sequence", () => {
    const initialProps: UseStepperOptions<(typeof STEPS)[number]["id"]> = {
      steps: STEPS,
      initialStepId: "supplier",
    };
    const { result, rerender } = renderHook(
      ({ steps, initialStepId }) => useStepper({ steps, initialStepId }),
      { initialProps },
    );
    act(() => result.current.skip!());
    rerender({
      steps: STEPS.map((step) => ({ ...step, label: `${step.label} updated` })),
      initialStepId: "review",
    });
    expect(result.current.currentStepId).toBe("delivery");
    expect(result.current.progress).toEqual({ state: "started", passedSteps: ["skipped"] });
    expect(() => rerender({ steps: STEPS.toReversed(), initialStepId: "supplier" })).toThrow(
      "step ids and order must stay fixed",
    );
  });
});
