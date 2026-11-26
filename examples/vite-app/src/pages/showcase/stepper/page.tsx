import {
  Badge,
  Button,
  Card,
  Layout,
  Stepper,
  Text,
  useStepper,
  type AppShellPageProps,
  type StepperProgress,
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
    description: <GateDates planned="12 Aug" actual="11 Aug" />,
  },
  {
    id: "qg2",
    label: "QG2",
    description: <GateDates planned="2 Sep" actual="6 Sep" overdue={4} />,
  },
  { id: "qg3", label: "QG3", description: "Skipped 2 Oct" },
  {
    id: "qg4",
    label: "QG4",
    render: ({ label, status }) => (
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <Text.span>{label}</Text.span>
          {status === "current" && <Badge variant="outline-info">Next</Badge>}
        </span>
        <Text.span variant="body-sm" className="text-muted-foreground">
          <GateDates planned="18 Nov" />
        </Text.span>
      </span>
    ),
  },
  { id: "qg5", label: "QG5", description: <GateDates planned="9 Dec" /> },
  { id: "qg6", label: "QG6", description: <GateDates planned="13 Jan" /> },
  { id: "qg7", label: "QG7", description: <GateDates planned="3 Feb" /> },
];

// 🧪 Dummy Data: Replace with real data later
const QUALITY_GATES_PROGRESS: StepperProgress = {
  state: "started",
  passedSteps: ["complete", "complete", "skipped"],
};

// 🧪 Dummy Data: Replace with real data later
const APPROVAL_PROGRESS: StepperProgress = {
  state: "started",
  passedSteps: ["complete", "complete"],
};

// 🧪 Dummy Data: Replace with real data later
const APPROVAL: StepperStep[] = [
  { id: "draft", label: "Draft", description: "Hanna Suzuki" },
  { id: "manager", label: "Manager", description: "Kenji Mori · 3 Nov" },
  {
    id: "finance",
    label: "Finance",
    render: ({ label }) => (
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <Text.span>{label}</Text.span>
          <Badge variant="outline-warning">Waiting 2 days</Badge>
        </span>
        <Text.span variant="body-sm" className="text-muted-foreground">
          Priya Nair
        </Text.span>
      </span>
    ),
  },
  { id: "issued", label: "Issued" },
];

// 🧪 Dummy Data: Replace with real data later
const WIZARD_STEPS = [
  { id: "supplier", label: "Supplier" },
  { id: "delivery", label: "Delivery" },
  { id: "approval", label: "Approval" },
  { id: "review", label: "Review" },
] as const;

// 🔽 Wizard steps — useStepper owns progress; the Stepper only displays it
function WizardStepsDemo() {
  const flow = useStepper({ steps: WIZARD_STEPS, initialStepId: "delivery" });

  return (
    <Card.Root>
      <Card.Header
        title="Wizard steps"
        description="useStepper manages navigation and skipped steps. Completed and skipped steps are clickable."
      />
      <Card.Content className="flex flex-col gap-6">
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
      </Card.Content>
    </Card.Root>
  );
}

const StepperDemoPage = () => (
  <Layout>
    <Layout.Header title="Stepper" />
    <Layout.Column>
      <Text variant="body-md" className="text-muted-foreground max-w-3xl">
        The page passes the steps and one progress value — not started, or started with the ordered
        results of the steps already passed — and the Stepper derives the current step and
        completion. The Stepper scrolls sideways when its steps don&apos;t fit; below 400px of
        container width it shows only its markers and names the current step.
      </Text>

      <WizardStepsDemo />

      {/* 🔽 Stage progress on a detail page */}
      <Card.Root>
        <Card.Header title="Project PRJ-2041 · quality gates" />
        <Card.Content>
          <Stepper
            aria-label="Quality gates"
            steps={QUALITY_GATES}
            progress={QUALITY_GATES_PROGRESS}
          />
        </Card.Content>
      </Card.Root>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
        <Card.Root>
          <Card.Header title="PO-10000041 · approval" />
          <Card.Content>
            <Stepper aria-label="Approval" steps={APPROVAL} progress={APPROVAL_PROGRESS} />
          </Card.Content>
        </Card.Root>
        {/* A narrow card: the same Stepper, collapsed to markers plus the current step */}
        <Card.Root>
          <Card.Header title="Narrow (≤ 400px)" />
          <Card.Content>
            <Stepper aria-label="Approval" steps={APPROVAL} progress={APPROVAL_PROGRESS} />
          </Card.Content>
        </Card.Root>
      </div>
    </Layout.Column>
  </Layout>
);

StepperDemoPage.appShellPageProps = {
  meta: {
    title: "Stepper",
  },
} satisfies AppShellPageProps;

export default StepperDemoPage;
