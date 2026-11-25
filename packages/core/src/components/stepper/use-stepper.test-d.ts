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

  if (flow.isComplete) {
    expectTypeOf(flow.currentStepId).toEqualTypeOf<undefined>();
    expectTypeOf(flow.progress.state).toEqualTypeOf<"complete">();
    expectTypeOf(flow.isLastStep).toEqualTypeOf<false>();
    expectTypeOf(flow.next).toEqualTypeOf<undefined>();
    expectTypeOf(flow.skip).toEqualTypeOf<undefined>();
    // @ts-expect-error Completed flows cannot advance.
    flow.next();
    // @ts-expect-error Completed flows cannot skip.
    flow.skip();
    flow.back();
    flow.moveStep("review");
  } else {
    expectTypeOf(flow.currentStepId).toEqualTypeOf<"supplier" | "review">();
    expectTypeOf(flow.progress.state).toEqualTypeOf<"in-progress">();
    expectTypeOf(flow.progress.currentStepId).toEqualTypeOf<"supplier" | "review">();
    expectTypeOf(flow.next).toEqualTypeOf<() => void>();
    expectTypeOf(flow.skip).toEqualTypeOf<() => void>();
    flow.next();
    flow.skip();
  }

  flow.moveStep("review", { skipped: true });
  // @ts-expect-error Destinations must come from steps.
  flow.moveStep("missing");
  useStepper({
    steps: [{ id: "supplier", label: "Supplier" }],
    // @ts-expect-error The initial id cannot widen the step ids.
    initialStepId: "missing",
  });
});
