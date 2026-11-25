import { Badge, Button, Stepper, useStepper } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Stepper
      aria-label="New purchase order"
      steps={[
        { id: "supplier", label: "Supplier" },
        { id: "delivery", label: "Delivery" },
        { id: "approval", label: "Approval" },
        { id: "review", label: "Review" },
      ]}
      progress={{ state: "in-progress", currentStepId: "delivery" }}
    />
  );
}

export function WizardNavigation() {
  const flow = useStepper({
    steps: [
      { id: "supplier", label: "Supplier" },
      { id: "delivery", label: "Delivery" },
      { id: "approval", label: "Approval" },
      { id: "review", label: "Review" },
    ],
  });

  return (
    <div className="flex flex-col gap-6">
      <Stepper
        aria-label="New purchase order"
        steps={flow.steps}
        progress={flow.progress}
        onStepClick={flow.moveStep}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={!flow.hasPrevious} onClick={flow.back}>
          Back
        </Button>
        <Button variant="ghost" disabled={!flow.hasNext} onClick={flow.skip}>
          Skip
        </Button>
        <Button disabled={!flow.hasNext} onClick={flow.next}>
          {flow.currentStepId === "review" || !flow.hasNext ? "Finish" : "Next"}
        </Button>
      </div>
    </div>
  );
}

export function StageProgress() {
  return (
    <Stepper
      aria-label="Quality gates"
      steps={[
        { id: "qg1", label: "QG1", description: "Done 11 Aug" },
        { id: "qg2", label: "QG2", description: "Done 6 Sep" },
        { id: "qg3", label: "QG3", description: "Skipped 2 Oct" },
        {
          id: "qg4",
          label: "QG4",
          badge: <Badge variant="outline-info">Next</Badge>,
          description: "Plan 18 Nov",
        },
        { id: "qg5", label: "QG5", description: "Plan 9 Dec" },
      ]}
      progress={{ state: "in-progress", currentStepId: "qg4", skippedStepIds: ["qg3"] }}
    />
  );
}
