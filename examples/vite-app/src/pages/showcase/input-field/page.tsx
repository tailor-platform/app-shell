import {
  Card,
  Field,
  Form,
  Input,
  Layout,
  Toolbar,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import * as React from "react";

// Before/after harness for making `Input` Field-aware (platform-planning#1977
// follow-up). "Before" renders `LegacyInput`, a copy of the old native
// `Input`; "After" renders the real `Input` from this branch. Each panel
// inspects its own DOM, so the checks show what a consumer actually gets.

const legacyClasses =
  "flex h-9 w-full min-w-0 rounded-md border border-[var(--input)] bg-transparent px-3 text-sm outline-none";

function LegacyInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={`${legacyClasses} ${className ?? ""}`} {...props} />;
}

type InputComponent = typeof Input;

type Scenario = {
  id: string;
  title: string;
  question: string;
  code: string;
  render: (Comp: InputComponent, report: (values: unknown) => void) => React.ReactNode;
};

type Checks = {
  inputs: number;
  ids: string;
  name: string;
  labelLinked: string;
  describedBy: string;
  disabled: string;
  ariaInvalid: string;
};

function readChecks(root: HTMLElement): Checks {
  const inputs = Array.from(root.querySelectorAll("input"));
  const first = inputs[0];
  const label = root.querySelector("label");
  const labelFor = label?.getAttribute("for");
  const linked = labelFor ? inputs.some((input) => input.id === labelFor) : false;
  return {
    inputs: inputs.length,
    ids: inputs.map((input) => input.id || "—").join(", "),
    name: inputs.map((input) => input.getAttribute("name") ?? "—").join(", "),
    labelLinked: label ? (linked ? "yes" : "no") : "no label",
    describedBy: first?.getAttribute("aria-describedby") ? "yes" : "no",
    disabled: first?.disabled ? "yes" : "no",
    ariaInvalid: first?.getAttribute("aria-invalid") ?? "—",
  };
}

function Panel({
  label,
  scenario,
  Comp,
}: {
  label: string;
  scenario: Scenario;
  Comp: InputComponent;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [checks, setChecks] = React.useState<Checks | null>(null);
  const [submitted, setSubmitted] = React.useState<string>("not submitted");

  const refresh = React.useCallback(() => {
    if (ref.current) setChecks(readChecks(ref.current));
  }, []);

  React.useEffect(() => {
    refresh();
    const node = ref.current;
    if (!node) return;
    const observer = new MutationObserver(refresh);
    observer.observe(node, { attributes: true, subtree: true, childList: true });
    return () => observer.disconnect();
  }, [refresh]);

  const report = (values: unknown) => setSubmitted(JSON.stringify(values));

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-md border p-3" data-panel={label}>
      <div className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">{label}</div>
      <div
        ref={ref}
        onClickCapture={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button[type=submit]"))
            setSubmitted("blocked (onFormSubmit not called)");
        }}
      >
        {scenario.render(Comp, report)}
      </div>
      {checks && (
        <table className="text-xs">
          <tbody>
            {Object.entries({ ...checks, submitted }).map(([key, value]) => (
              <tr key={key}>
                <td className="pr-3 text-[var(--muted-foreground)]">{key}</td>
                <td className="font-mono" data-check={key}>
                  {String(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SubmitForm({
  children,
  report,
  noValidate,
}: {
  children: React.ReactNode;
  report: (values: unknown) => void;
  noValidate?: boolean;
}) {
  return (
    <Form
      noValidate={noValidate}
      onFormSubmit={(values) => report(values)}
      className="flex flex-col gap-2"
    >
      {children}
      <button type="submit" className="self-start rounded border px-2 py-1 text-xs">
        Submit
      </button>
    </Form>
  );
}

function FileScenario({
  Comp,
  report,
}: {
  Comp: InputComponent;
  report: (values: unknown) => void;
}) {
  const [fileName, setFileName] = React.useState("none");
  const [key, setKey] = React.useState(0);
  return (
    <SubmitForm report={report}>
      <Field.Root name="upload">
        <Field.Label>Upload</Field.Label>
        <Comp
          key={key}
          type="file"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "none")}
        />
      </Field.Root>
      <div className="text-xs">
        onChange file: <span data-check="file">{fileName}</span>{" "}
        <button
          type="button"
          className="ml-2 rounded border px-1"
          onClick={() => {
            setKey((current) => current + 1);
            setFileName("none");
          }}
        >
          Reset (key remount)
        </button>
      </div>
    </SubmitForm>
  );
}

function ControlledScenario({
  Comp,
  report,
}: {
  Comp: InputComponent;
  report: (values: unknown) => void;
}) {
  const [value, setValue] = React.useState("from state");
  return (
    <SubmitForm report={report}>
      <Field.Root name="note">
        <Field.Label>Note</Field.Label>
        <Comp value={value} onChange={(event) => setValue(event.target.value)} />
      </Field.Root>
      <div className="text-xs">
        useState value: <span data-check="state">{value}</span>
      </div>
    </SubmitForm>
  );
}

const scenarios: Scenario[] = [
  {
    id: "direct",
    title: "1. Input directly under Field.Root",
    question: "Does the label, description and error wiring reach the input?",
    code: `<Field.Root name="email" invalid>\n  <Field.Label>Email</Field.Label>\n  <Input />\n  <Field.Description>Work address</Field.Description>\n  <Field.Error match>Required</Field.Error>\n</Field.Root>`,
    render: (Comp) => (
      <Field.Root name="email" invalid>
        <Field.Label>Email</Field.Label>
        <Comp />
        <Field.Description>Work address</Field.Description>
        <Field.Error match={true}>Required</Field.Error>
      </Field.Root>
    ),
  },
  {
    id: "submit",
    title: "2. Value reaches Form's onFormSubmit",
    question: "Is the value in onFormSubmit's values?",
    code: `<Form onFormSubmit={save}>\n  <Field.Root name="title">\n    <Input defaultValue="hello" />\n  </Field.Root>\n</Form>`,
    render: (Comp, report) => (
      <SubmitForm report={report}>
        <Field.Root name="title">
          <Field.Label>Title</Field.Label>
          <Comp defaultValue="hello" />
        </Field.Root>
      </SubmitForm>
    ),
  },
  {
    id: "controlled",
    title: "3. Controlled with useState inside a Form",
    question: "Do state and onFormSubmit agree?",
    code: `const [value, setValue] = useState("from state");\n<Field.Root name="note">\n  <Input value={value} onChange={(e) => setValue(e.target.value)} />\n</Field.Root>`,
    render: (Comp, report) => <ControlledScenario Comp={Comp} report={report} />,
  },
  {
    id: "names",
    title: "4. Field.Root name vs Input name",
    question: "Which name wins? Left field is named, right field is not.",
    code: `<Field.Root name="field-name"><Input name="own-name" /></Field.Root>\n<Field.Root><Input name="own-name" /></Field.Root>`,
    render: (Comp) => (
      <div className="flex flex-col gap-2">
        <Field.Root name="field-name">
          <Comp name="own-name" />
        </Field.Root>
        <Field.Root>
          <Comp name="own-name" />
        </Field.Root>
      </div>
    ),
  },
  {
    id: "disabled",
    title: "5. Disabled Field.Root",
    question: "Does the input inherit disabled?",
    code: `<Field.Root name="locked" disabled>\n  <Input />\n</Field.Root>`,
    render: (Comp) => (
      <Field.Root name="locked" disabled>
        <Field.Label>Locked</Field.Label>
        <Comp />
      </Field.Root>
    ),
  },
  {
    id: "backstop",
    title: "6. <Field.Control render={<Input />} />",
    question: "Still one control, same values? After logs one deprecation warning (see console).",
    code: `<Field.Root name="subject">\n  <Field.Label>Subject</Field.Label>\n  <Field.Control render={<Input />} defaultValue="hello" />\n</Field.Root>`,
    render: (Comp, report) => (
      <SubmitForm report={report}>
        <Field.Root name="subject">
          <Field.Label>Subject</Field.Label>
          <Field.Control render={<Comp />} defaultValue="hello" />
          <Field.Description>Shown on the card</Field.Description>
        </Field.Root>
      </SubmitForm>
    ),
  },
  {
    id: "novalidate",
    title: '7. type="email" inside <Form noValidate>',
    question: "Type an invalid address and submit. Does noValidate stop Field validation?",
    code: `<Form noValidate onFormSubmit={save}>\n  <Field.Root name="email">\n    <Input type="email" defaultValue="not-an-email" />\n  </Field.Root>\n</Form>`,
    render: (Comp, report) => (
      <SubmitForm noValidate report={report}>
        <Field.Root name="email">
          <Field.Label>Email</Field.Label>
          <Comp type="email" defaultValue="not-an-email" />
          <Field.Error />
        </Field.Root>
      </SubmitForm>
    ),
  },
  {
    id: "file",
    title: '8. type="file" inside a Form',
    question:
      "Does onChange still get the File, what does onFormSubmit get, does a key reset work?",
    code: `<Field.Root name="upload">\n  <Input key={key} type="file" onChange={(e) => setFile(e.target.files?.[0])} />\n</Field.Root>`,
    render: (Comp, report) => <FileScenario Comp={Comp} report={report} />,
  },
  {
    id: "many",
    title: "9. Several Inputs in one Field.Root",
    question: "Do the inputs stay distinct?",
    code: `<Field.Root name="tags">\n  <Input defaultValue="one" />\n  <Input defaultValue="two" />\n</Field.Root>`,
    render: (Comp, report) => (
      <SubmitForm report={report}>
        <Field.Root name="tags">
          <Field.Label>Tags</Field.Label>
          <Comp defaultValue="one" />
          <Comp defaultValue="two" />
        </Field.Root>
      </SubmitForm>
    ),
  },
  {
    id: "explicit-id",
    title: "10. Explicit id with Field.Label htmlFor",
    question: "Does the explicit id survive?",
    code: `<Field.Root name="query">\n  <Field.Label htmlFor="combo">Find</Field.Label>\n  <Input id="combo" />\n</Field.Root>`,
    render: (Comp) => {
      // Both panels are on the page at once, so each needs its own id.
      const id = Comp === Input ? "combo-after" : "combo-before";
      return (
        <Field.Root name="query">
          <Field.Label htmlFor={id}>Find</Field.Label>
          <Comp id={id} />
        </Field.Root>
      );
    },
  },
  {
    id: "standalone",
    title: "11. Standalone in a Toolbar",
    question: "Outside Field.Root: anything different?",
    code: `<Toolbar.Row>\n  <Input type="search" name="q" placeholder="Search" />\n</Toolbar.Row>`,
    render: (Comp) => (
      <Toolbar.Root>
        <Toolbar.Row aria-label="Search">
          <Comp type="search" name="q" placeholder="Search" />
        </Toolbar.Row>
      </Toolbar.Root>
    ),
  },
];

const InputFieldShowcasePage = () => (
  <Layout>
    <Layout.Header title="Input: Field-aware (before / after)" />
    <Layout.Column>
      <div className="flex flex-col gap-4">
        {scenarios.map((scenario) => (
          <Card.Root key={scenario.id} data-scenario={scenario.id}>
            <Card.Header title={scenario.title} description={scenario.question} />
            <Card.Content>
              <pre className="mb-3 overflow-x-auto rounded bg-[var(--muted)] p-2 text-xs">
                {scenario.code}
              </pre>
              <div className="flex flex-col gap-3 md:flex-row">
                <Panel label="Before" scenario={scenario} Comp={LegacyInput as InputComponent} />
                <Panel label="After" scenario={scenario} Comp={Input} />
              </div>
            </Card.Content>
          </Card.Root>
        ))}
      </div>
    </Layout.Column>
  </Layout>
);

InputFieldShowcasePage.appShellPageProps = {
  meta: { title: "Input Field-aware" },
} satisfies AppShellPageProps;

export default InputFieldShowcasePage;
