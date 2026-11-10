import { Badge, Stepper } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Stepper
      aria-label="New purchase order"
      steps={[
        { id: "supplier", label: "Supplier", status: "complete" },
        { id: "delivery", label: "Delivery", status: "current" },
        { id: "approval", label: "Approval", status: "upcoming" },
        { id: "review", label: "Review", status: "upcoming" },
      ]}
    />
  );
}

export function StageProgress() {
  return (
    <Stepper
      aria-label="Quality gates"
      steps={[
        { id: "qg1", label: "QG1", status: "complete", description: "Done 11 Aug" },
        { id: "qg2", label: "QG2", status: "complete", description: "Done 6 Sep" },
        { id: "qg3", label: "QG3", status: "skipped", description: "Not required" },
        {
          id: "qg4",
          label: "QG4",
          status: "current",
          badge: <Badge variant="outline-info">Next</Badge>,
          description: "Plan 18 Nov",
        },
        { id: "qg5", label: "QG5", status: "upcoming", description: "Plan 9 Dec" },
      ]}
    />
  );
}

export function Vertical() {
  return (
    <Stepper
      aria-label="Approval"
      orientation="vertical"
      steps={[
        { id: "draft", label: "Draft", status: "complete", description: "Hanna Suzuki" },
        { id: "manager", label: "Manager", status: "complete", description: "Kenji Mori · 3 Nov" },
        { id: "finance", label: "Finance", status: "current", description: "Priya Nair" },
        { id: "issued", label: "Issued", status: "upcoming" },
      ]}
    />
  );
}
