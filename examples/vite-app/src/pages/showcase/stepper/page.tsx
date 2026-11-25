import * as React from "react";
import {
  Badge,
  Button,
  Card,
  Layout,
  Stepper,
  Text,
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
    badge: <Badge variant="outline-info">Next</Badge>,
    description: <GateDates planned="18 Nov" />,
  },
  { id: "qg5", label: "QG5", description: <GateDates planned="9 Dec" /> },
  { id: "qg6", label: "QG6", description: <GateDates planned="13 Jan" /> },
  { id: "qg7", label: "QG7", description: <GateDates planned="3 Feb" /> },
];

// 🧪 Dummy Data: Replace with real data later
const QUALITY_GATES_PROGRESS: StepperProgress = {
  state: "in-progress",
  currentStepId: "qg4",
  skippedStepIds: ["qg3"],
};

// 🧪 Dummy Data: Replace with real data later
const APPROVAL_PROGRESS: StepperProgress = { state: "in-progress", currentStepId: "finance" };

// 🧪 Dummy Data: Replace with real data later
const APPROVAL: StepperStep[] = [
  { id: "draft", label: "Draft", description: "Hanna Suzuki" },
  { id: "manager", label: "Manager", description: "Kenji Mori · 3 Nov" },
  {
    id: "finance",
    label: "Finance",
    badge: <Badge variant="outline-warning">Waiting 2 days</Badge>,
    description: "Priya Nair",
  },
  { id: "issued", label: "Issued" },
];

// 🧪 Dummy Data: Replace with real data later
const WIZARD_STEPS = ["Supplier", "Delivery", "Approval", "Review"];

// 🔽 Wizard steps — the page owns progress; the Stepper only displays it
function WizardStepsDemo() {
  const [current, setCurrent] = React.useState(1);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const done = current === WIZARD_STEPS.length;
  const steps: StepperStep[] = WIZARD_STEPS.map((label, i) => ({ id: String(i), label }));
  const passedSkips = skipped.filter((id) => Number(id) < current);
  const progress: StepperProgress = done
    ? { state: "complete", skippedStepIds: passedSkips }
    : { state: "in-progress", currentStepId: String(current), skippedStepIds: passedSkips };

  const advance = (skip: boolean) => {
    const id = String(current);
    setSkipped((ids) =>
      skip ? [...ids.filter((x) => x !== id), id] : ids.filter((x) => x !== id),
    );
    setCurrent((c) => Math.min(WIZARD_STEPS.length, c + 1));
  };

  return (
    <Card.Root>
      <Card.Header
        title="Wizard steps"
        description="Progress comes from the page's current step and the steps the user skipped. Completed and skipped steps are clickable."
      />
      <Card.Content className="flex flex-col gap-6">
        <Stepper
          aria-label="New purchase order"
          steps={steps}
          progress={progress}
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
          <Button variant="ghost" disabled={done} onClick={() => advance(true)}>
            Skip
          </Button>
          <Button disabled={done} onClick={() => advance(false)}>
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
        The page passes the steps and one progress value — not started, on a step (with any skipped
        steps), or complete — and the Stepper works out how each step looks. The Stepper scrolls
        sideways when its steps don&apos;t fit; below 400px of container width it shows only its
        markers and names the current step.
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
