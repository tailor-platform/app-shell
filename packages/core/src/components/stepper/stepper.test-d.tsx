import type { ReactNode } from "react";
import { expectTypeOf, it } from "vitest";
import { Stepper, useStepper, type StepperStep } from "@/index";

it("supports default and custom steps without widening the step ids", () => {
  const flow = useStepper({
    steps: [
      { id: "supplier", label: "Supplier", description: "Choose a supplier" },
      {
        id: "review",
        label: "Review",
        render: ({ label, status }) => {
          expectTypeOf(label).toEqualTypeOf<ReactNode>();
          expectTypeOf(status).toEqualTypeOf<"complete" | "current" | "upcoming" | "skipped">();
          return <span>{label}</span>;
        },
      },
    ],
  });
  <Stepper
    steps={flow.steps}
    progress={flow.progress}
    onStepClick={(id) => {
      expectTypeOf(id).toEqualTypeOf<"supplier" | "review">();
    }}
  />;
  <Stepper
    steps={[{ id: "review", label: "Review", render: ({ label }) => <span>{label}</span> }]}
    progress={{ state: "started", passedSteps: [] }}
    onStepClick={(id) => {
      expectTypeOf(id).toEqualTypeOf<"review">();
    }}
  />;
});

it("requires a common label and makes description and render mutually exclusive", () => {
  // @ts-expect-error Custom rendering replaces description rather than supplementing it.
  const both: StepperStep = {
    id: "review",
    label: "Review",
    description: "Due soon",
    render: () => null,
  };
  // @ts-expect-error Custom steps still need a label for narrow containers.
  const withoutLabel: StepperStep = { id: "review", render: () => null };
  // @ts-expect-error Badges must be composed through render, not a dedicated prop.
  const badge: StepperStep = { id: "review", label: "Review", badge: "Next" };
  expectTypeOf(both).toEqualTypeOf<StepperStep>();
  expectTypeOf(withoutLabel).toEqualTypeOf<StepperStep>();
  expectTypeOf(badge).toEqualTypeOf<StepperStep>();
});
