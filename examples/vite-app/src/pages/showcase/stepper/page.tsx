import * as React from "react";
import {
  Badge,
  Button,
  Card,
  Layout,
  Stepper,
  Text,
  type AppShellPageProps,
  type StepperStep,
} from "@tailor-platform/app-shell";

// Stepper showcase: progress through a fixed sequence of steps — wizard steps,
// approval stages, quality gates.

// ✅ Reusable Component: Can be moved to components/ui/ (planned / actual / overdue lines)
function GateDates({
  planned,
  actual,
  overdue,
}: {
  planned: string;
  actual?: string;
  overdue?: number;
}) {
  return (
    <span className="flex flex-col">
      <span>Plan {planned}</span>
      {actual != null && <span>Done {actual}</span>}
      {overdue != null && <span className="text-danger-text">{overdue} days over</span>}
    </span>
  );
}

// 🧪 Dummy Data: Replace with real data later
const QUALITY_GATES: StepperStep[] = [
  {
    id: "qg1",
    label: "QG1",
    status: "complete",
    description: <GateDates planned="12 Aug" actual="11 Aug" />,
  },
  {
    id: "qg2",
    label: "QG2",
    status: "complete",
    description: <GateDates planned="2 Sep" actual="6 Sep" overdue={4} />,
  },
  { id: "qg3", label: "QG3", status: "skipped", description: "Not required" },
  {
    id: "qg4",
    label: "QG4",
    status: "current",
    badge: <Badge variant="outline-info">Next</Badge>,
    description: <GateDates planned="18 Nov" />,
  },
  { id: "qg5", label: "QG5", status: "upcoming", description: <GateDates planned="9 Dec" /> },
  { id: "qg6", label: "QG6", status: "upcoming", description: <GateDates planned="13 Jan" /> },
  { id: "qg7", label: "QG7", status: "upcoming", description: <GateDates planned="3 Feb" /> },
];

// 🧪 Dummy Data: Replace with real data later
const APPROVAL: StepperStep[] = [
  { id: "draft", label: "Draft", status: "complete", description: "Hanna Suzuki" },
  { id: "manager", label: "Manager", status: "complete", description: "Kenji Mori · 3 Nov" },
  {
    id: "finance",
    label: "Finance",
    status: "current",
    badge: <Badge variant="outline-warning">Waiting 2 days</Badge>,
    description: "Priya Nair",
  },
  { id: "issued", label: "Issued", status: "upcoming" },
];

// 🧪 Dummy Data: Replace with real data later
const WIZARD_STEPS = ["Supplier", "Delivery", "Approval", "Review"];

// 🔽 Wizard steps — the page owns the current step; the Stepper only displays it
function WizardStepsDemo() {
  const [current, setCurrent] = React.useState(1);
  const steps: StepperStep[] = WIZARD_STEPS.map((label, i) => ({
    id: String(i),
    label,
    status: i < current ? "complete" : i === current ? "current" : "upcoming",
  }));
  return (
    <Card.Root>
      <Card.Header
        title="Wizard steps"
        description="Statuses come from the page's current step. Completed steps are clickable."
      />
      <Card.Content className="flex flex-col gap-6">
        <Stepper
          aria-label="New purchase order"
          steps={steps}
          onStepClick={(id) => setCurrent(Number(id))}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          >
            Back
          </Button>
          <Button
            disabled={current === WIZARD_STEPS.length}
            onClick={() => setCurrent((c) => Math.min(WIZARD_STEPS.length, c + 1))}
          >
            {current >= WIZARD_STEPS.length - 1 ? "Finish" : "Next"}
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

const StepperDemoPage = () => (
  <Layout>
    <Layout.Header title="Stepper" />
    <Layout.Column>
      <Text variant="body-md" className="text-muted-foreground max-w-3xl">
        Each step has a status — complete, current, upcoming or skipped — plus an optional badge and
        a few lines underneath. A horizontal Stepper scrolls sideways when its steps don&apos;t fit;
        below 400px of container width it shows only its markers and names the current step.
      </Text>

      <WizardStepsDemo />

      {/* 🔽 Stage progress on a detail page */}
      <Card.Root>
        <Card.Header title="Project PRJ-2041 · quality gates" />
        <Card.Content>
          <Stepper aria-label="Quality gates" steps={QUALITY_GATES} />
        </Card.Content>
      </Card.Root>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
        <Card.Root>
          <Card.Header title="PO-10000041 · approval" />
          <Card.Content>
            <Stepper aria-label="Approval" steps={APPROVAL} />
          </Card.Content>
        </Card.Root>
        {/* A narrow card: the same Stepper, collapsed to markers plus the current step */}
        <Card.Root>
          <Card.Header title="Narrow (≤ 400px)" />
          <Card.Content>
            <Stepper aria-label="Approval" steps={APPROVAL} />
          </Card.Content>
        </Card.Root>
      </div>

      <Card.Root className="max-w-md">
        <Card.Header title="Vertical" />
        <Card.Content>
          <Stepper aria-label="Approval" orientation="vertical" steps={APPROVAL} />
        </Card.Content>
      </Card.Root>
    </Layout.Column>
  </Layout>
);

StepperDemoPage.appShellPageProps = {
  meta: {
    title: "Stepper",
  },
} satisfies AppShellPageProps;

export default StepperDemoPage;
