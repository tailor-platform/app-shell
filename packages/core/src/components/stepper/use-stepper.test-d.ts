import { expectTypeOf, it } from "vitest";
import { useStepper, type UseStepperReturn } from "@/index";

it("infers literal ids without as const and does not widen them from initialStepId", () => {
  const flow = useStepper({
    steps: [
      { id: "supplier", label: "Supplier" },
      { id: "review", label: "Review" },
    ],
    initialStepId: "supplier",
  });
  expectTypeOf(flow).toEqualTypeOf<UseStepperReturn<"supplier" | "review">>();
  // @ts-expect-error Navigation requires narrowing to an in-progress flow.
  flow.next();
  // @ts-expect-error Navigation requires narrowing to an in-progress flow.
  flow.skip();
  // @ts-expect-error next completes the last step; there is no separate finish action.
  flow.finish();

  if (!flow.hasNext) {
    expectTypeOf(flow.currentStepId).toEqualTypeOf<undefined>();
    expectTypeOf(flow.progress.state).toEqualTypeOf<"started">();
    expectTypeOf(flow.hasNext).toEqualTypeOf<false>();
    expectTypeOf(flow.next).toEqualTypeOf<undefined>();
    expectTypeOf(flow.skip).toEqualTypeOf<undefined>();
    // @ts-expect-error Completed flows cannot advance.
    flow.next();
    // @ts-expect-error Completed flows cannot skip.
    flow.skip();
    flow.back();
    flow.moveStep("review");
  } else {
    expectTypeOf(flow.hasNext).toEqualTypeOf<true>();
    expectTypeOf(flow.currentStepId).toEqualTypeOf<"supplier" | "review">();
    expectTypeOf(flow.progress.state).toEqualTypeOf<"started">();
    expectTypeOf(flow.progress.passedSteps).toEqualTypeOf<readonly ("complete" | "skipped")[]>();
    expectTypeOf(flow.next).toEqualTypeOf<() => void>();
    expectTypeOf(flow.skip).toEqualTypeOf<() => void>();
    flow.next();
    flow.skip();
  }

  // @ts-expect-error Progress derives the current step from the passed prefix.
  void flow.progress.currentStepId;
  // @ts-expect-error Skipped outcomes are part of the passed prefix, not independent IDs.
  void flow.progress.skippedStepIds;
  flow.moveStep("review", { skipped: true });
  // @ts-expect-error Destinations must come from steps.
  flow.moveStep("missing");
  useStepper({
    steps: [{ id: "supplier", label: "Supplier" }],
    // @ts-expect-error The initial id cannot widen the step ids.
    initialStepId: "missing",
  });
});
