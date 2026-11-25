import { Badge, Stepper } from "@tailor-platform/app-shell";

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
