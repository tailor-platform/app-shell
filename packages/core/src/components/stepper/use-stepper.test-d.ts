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
  flow.moveStep("review", { skipped: true });
  // @ts-expect-error Destinations must come from steps.
  flow.moveStep("missing");
  useStepper({
    steps: [{ id: "supplier", label: "Supplier" }],
    // @ts-expect-error The initial id cannot widen the step ids.
    initialStepId: "missing",
  });
});
