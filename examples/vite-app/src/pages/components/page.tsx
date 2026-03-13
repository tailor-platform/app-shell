import { useState } from "react";
import type { AppShellPageProps } from "@tailor-platform/app-shell";
import {
  Accordion,
  AlertDialog,
  Autocomplete,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Combobox,
  Field,
  Fieldset,
  Form,
  Meter,
  NumberField,
  Popover,
  PreviewCard,
  Progress,
  Radio,
  ScrollArea,
  Select,
  Slider,
  Switch,
  Tabs,
  Toggle,
  Toolbar,
} from "@tailor-platform/app-shell";

// ---------------------------------------------------------------------------
// Shared styles (inline to keep the showcase self-contained)
// ---------------------------------------------------------------------------
const section: React.CSSProperties = {
  marginBottom: "2.5rem",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "1.125rem",
  fontWeight: 600,
  marginBottom: "0.75rem",
  borderBottom: "1px solid hsl(var(--border))",
  paddingBottom: "0.5rem",
};

const label: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "hsl(var(--muted-foreground))",
  marginBottom: "0.25rem",
};

const row: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
  alignItems: "center",
};

const card: React.CSSProperties = {
  padding: "1rem",
  borderRadius: "0.5rem",
  border: "1px solid hsl(var(--border))",
  backgroundColor: "hsl(var(--card))",
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const fruits = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Cherry", value: "cherry" },
  { label: "Date", value: "date" },
  { label: "Elderberry", value: "elderberry" },
  { label: "Fig", value: "fig" },
  { label: "Grape", value: "grape" },
];

// ---------------------------------------------------------------------------
// Component Showcase Page
// ---------------------------------------------------------------------------
const ComponentsPage = () => {
  const [progress, setProgress] = useState(60);
  const [sliderValue, setSliderValue] = useState([50]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "56rem", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginBottom: "0.5rem",
        }}
      >
        Component Showcase
      </h1>
      <p style={{ marginBottom: "2rem", color: "hsl(var(--muted-foreground))" }}>
        All newly added primitive components in <code>@tailor-platform/app-shell</code>.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Accordion */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Accordion</h2>
        <Accordion.Root defaultValue={["item-1"]}>
          <Accordion.Item value="item-1">
            <Accordion.Trigger>What is AppShell?</Accordion.Trigger>
            <Accordion.Content>
              A React-based framework for building ERP applications with opinionated layouts,
              authentication, and module federation.
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="item-2">
            <Accordion.Trigger>How do I get started?</Accordion.Trigger>
            <Accordion.Content>
              Install the package via npm or pnpm, wrap your app with the AppShell provider, and
              define your modules and resources.
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="item-3">
            <Accordion.Trigger>Can I customise the sidebar?</Accordion.Trigger>
            <Accordion.Content>
              Yes — use SidebarItem and SidebarGroup components or provide your own sidebar
              component.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Alert Dialog */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Alert Dialog</h2>
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button variant="destructive">Delete Item</Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Are you sure?</AlertDialog.Title>
              <AlertDialog.Description>
                This action cannot be undone. This will permanently delete the item.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Action>
                <Button variant="destructive">Delete</Button>
              </AlertDialog.Action>
              <AlertDialog.Action>
                <Button variant="outline">Cancel</Button>
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Avatar */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Avatar</h2>
        <div style={row}>
          <Avatar.Root>
            <Avatar.Image src="https://github.com/shadcn.png" alt="@shadcn" />
            <Avatar.Fallback>SC</Avatar.Fallback>
          </Avatar.Root>
          <Avatar.Root>
            <Avatar.Fallback>AB</Avatar.Fallback>
          </Avatar.Root>
          <Avatar.Root>
            <Avatar.Fallback>ZY</Avatar.Fallback>
          </Avatar.Root>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Badge (existing but showing for completeness) */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Badge</h2>
        <div style={row}>
          <Badge>Default</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="error">Error</Badge>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Checkbox */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Checkbox</h2>
        <div style={{ display: "flex", gap: "2rem" }}>
          <div>
            <p style={label}>Single</p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Checkbox.Root defaultChecked name="terms" />
              <span style={{ fontSize: "0.875rem" }}>Accept terms</span>
            </div>
          </div>
          <div>
            <p style={label}>Group</p>
            <Checkbox.Group>
              {["Email", "SMS", "Push"].map((ch) => (
                <div
                  key={ch}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Checkbox.Root name={ch.toLowerCase()} />
                  <span style={{ fontSize: "0.875rem" }}>{ch}</span>
                </div>
              ))}
            </Checkbox.Group>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Field / Fieldset / Form */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Field / Fieldset / Form</h2>
        <Form>
          <Fieldset.Root>
            <Fieldset.Legend>User Information</Fieldset.Legend>
            <Field.Root>
              <Field.Label>Name</Field.Label>
              <Field.Control
                placeholder="John Doe"
                style={{
                  height: "2.25rem",
                  width: "100%",
                  borderRadius: "0.375rem",
                  border: "1px solid hsl(var(--input))",
                  padding: "0 0.75rem",
                  fontSize: "0.875rem",
                }}
              />
              <Field.Description>Your full name.</Field.Description>
            </Field.Root>
            <Field.Root>
              <Field.Label>Email</Field.Label>
              <Field.Control
                type="email"
                placeholder="john@example.com"
                style={{
                  height: "2.25rem",
                  width: "100%",
                  borderRadius: "0.375rem",
                  border: "1px solid hsl(var(--input))",
                  padding: "0 0.75rem",
                  fontSize: "0.875rem",
                }}
              />
              <Field.Error>This field is required.</Field.Error>
            </Field.Root>
          </Fieldset.Root>
        </Form>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Meter */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Meter</h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            maxWidth: "24rem",
          }}
        >
          <div>
            <p style={label}>30%</p>
            <Meter.Root value={30}>
              <Meter.Track>
                <Meter.Indicator />
              </Meter.Track>
            </Meter.Root>
          </div>
          <div>
            <p style={label}>65%</p>
            <Meter.Root value={65}>
              <Meter.Track>
                <Meter.Indicator />
              </Meter.Track>
            </Meter.Root>
          </div>
          <div>
            <p style={label}>100%</p>
            <Meter.Root value={100}>
              <Meter.Track>
                <Meter.Indicator />
              </Meter.Track>
            </Meter.Root>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Number Field */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Number Field</h2>
        <div style={{ maxWidth: "12rem" }}>
          <NumberField.Root defaultValue={5}>
            <NumberField.Group>
              <NumberField.Input />
              <NumberField.Increment />
              <NumberField.Decrement />
            </NumberField.Group>
          </NumberField.Root>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Popover */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Popover</h2>
        <Popover.Root>
          <Popover.Trigger>
            <Button variant="outline">Open Popover</Button>
          </Popover.Trigger>
          <Popover.Content>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <p style={{ fontWeight: 500, fontSize: "0.875rem" }}>Popover Title</p>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                This is some popover content. You can put anything here.
              </p>
            </div>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Root>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Preview Card */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Preview Card</h2>
        <PreviewCard.Root>
          <PreviewCard.Trigger>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              Hover to preview
            </a>
          </PreviewCard.Trigger>
          <PreviewCard.Content>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>GitHub</p>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                Where the world builds software. Millions of developers and companies build, ship,
                and maintain their software on GitHub.
              </p>
            </div>
            <PreviewCard.Arrow />
          </PreviewCard.Content>
        </PreviewCard.Root>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Progress */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Progress</h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            maxWidth: "24rem",
          }}
        >
          <div>
            <p style={label}>{progress}%</p>
            <Progress.Root value={progress}>
              <Progress.Track>
                <Progress.Indicator />
              </Progress.Track>
            </Progress.Root>
          </div>
          <div style={row}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProgress(Math.max(0, progress - 10))}
            >
              −10
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProgress(Math.min(100, progress + 10))}
            >
              +10
            </Button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Radio */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Radio</h2>
        <Radio.Group defaultValue="comfortable">
          {[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
            { value: "spacious", label: "Spacious" },
          ].map((opt) => (
            <div key={opt.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Radio.Root value={opt.value} />
              <span style={{ fontSize: "0.875rem" }}>{opt.label}</span>
            </div>
          ))}
        </Radio.Group>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Scroll Area */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Scroll Area</h2>
        <ScrollArea.Root style={{ height: "10rem", width: "16rem", ...card }}>
          <div style={{ padding: "0.5rem" }}>
            {Array.from({ length: 30 }, (_, i) => (
              <p key={i} style={{ fontSize: "0.8125rem", paddingBottom: "0.25rem" }}>
                Item {i + 1}
              </p>
            ))}
          </div>
        </ScrollArea.Root>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Select */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Select</h2>
        <div style={{ maxWidth: "16rem" }}>
          <Select.Root>
            <Select.Trigger>
              <Select.Value placeholder="Select a fruit..." />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.GroupLabel>Fruits</Select.GroupLabel>
                {fruits.map((f) => (
                  <Select.Item key={f.value} value={f.value}>
                    {f.label}
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Slider */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Slider</h2>
        <div style={{ maxWidth: "24rem" }}>
          <p style={label}>Value: {sliderValue[0]}</p>
          <Slider.Root
            defaultValue={sliderValue}
            onValueChange={(v) => setSliderValue(Array.isArray(v) ? v : [v])}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Thumb />
              </Slider.Track>
            </Slider.Control>
          </Slider.Root>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Switch */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Switch</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Switch.Root defaultChecked />
            <span style={{ fontSize: "0.875rem" }}>Airplane Mode</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Switch.Root />
            <span style={{ fontSize: "0.875rem" }}>Notifications</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Tabs */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Tabs</h2>
        <Tabs.Root defaultValue="account">
          <Tabs.List>
            <Tabs.Trigger value="account">Account</Tabs.Trigger>
            <Tabs.Trigger value="password">Password</Tabs.Trigger>
            <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="account">
            <div style={card}>
              <p style={{ fontSize: "0.875rem" }}>Manage your account settings and preferences.</p>
            </div>
          </Tabs.Content>
          <Tabs.Content value="password">
            <div style={card}>
              <p style={{ fontSize: "0.875rem" }}>Change your password and security settings.</p>
            </div>
          </Tabs.Content>
          <Tabs.Content value="settings">
            <div style={card}>
              <p style={{ fontSize: "0.875rem" }}>Configure application-wide settings.</p>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Toggle */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Toggle</h2>
        <div style={row}>
          <Toggle.Root aria-label="Bold">
            <b>B</b>
          </Toggle.Root>
          <Toggle.Root aria-label="Italic">
            <i>I</i>
          </Toggle.Root>
          <Toggle.Root variant="outline" aria-label="Underline">
            <u>U</u>
          </Toggle.Root>
        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <p style={label}>Toggle Group</p>
          <Toggle.Group>
            <Toggle.Root aria-label="Left">L</Toggle.Root>
            <Toggle.Root aria-label="Center">C</Toggle.Root>
            <Toggle.Root aria-label="Right">R</Toggle.Root>
          </Toggle.Group>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Toolbar */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Toolbar</h2>
        <Toolbar.Root>
          <Toolbar.Group>
            <Toolbar.Button>Cut</Toolbar.Button>
            <Toolbar.Button>Copy</Toolbar.Button>
            <Toolbar.Button>Paste</Toolbar.Button>
          </Toolbar.Group>
          <Toolbar.Separator />
          <Toolbar.Link href="https://github.com" target="_blank" rel="noopener noreferrer">
            GitHub
          </Toolbar.Link>
        </Toolbar.Root>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Combobox & Autocomplete — detailed in sub-page */}
      {/* ----------------------------------------------------------------- */}
      <div style={section}>
        <h2 style={sectionTitle}>Combobox &amp; Autocomplete</h2>
        <p
          style={{
            fontSize: "0.875rem",
            color: "hsl(var(--muted-foreground))",
            marginBottom: "1rem",
          }}
        >
          See the dedicated sub-pages for comprehensive pattern showcases including basic, multiple,
          async, and creatable variants.
        </p>

        {/* Basic Combobox */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={label}>Combobox (basic)</p>
          <div style={{ maxWidth: "16rem" }}>
            <Combobox.Root>
              <Combobox.InputGroup>
                <Combobox.Input placeholder="Search fruits..." />
                <Combobox.Clear />
                <Combobox.Trigger />
              </Combobox.InputGroup>
              <Combobox.Content>
                <Combobox.List>
                  {fruits.map((f) => (
                    <Combobox.Item key={f.value} value={f.value}>
                      {f.label}
                    </Combobox.Item>
                  ))}
                  <Combobox.Empty>No results.</Combobox.Empty>
                </Combobox.List>
              </Combobox.Content>
            </Combobox.Root>
          </div>
        </div>

        {/* Basic Autocomplete */}
        <div>
          <p style={label}>Autocomplete (basic)</p>
          <div style={{ maxWidth: "16rem" }}>
            <Autocomplete.Root>
              <Autocomplete.InputGroup>
                <Autocomplete.Input placeholder="Type a fruit..." />
                <Autocomplete.Clear />
                <Autocomplete.Trigger />
              </Autocomplete.InputGroup>
              <Autocomplete.Content>
                <Autocomplete.List>
                  {fruits.map((f) => (
                    <Autocomplete.Item key={f.value} value={f.label}>
                      {f.label}
                    </Autocomplete.Item>
                  ))}
                  <Autocomplete.Empty>No suggestions.</Autocomplete.Empty>
                </Autocomplete.List>
              </Autocomplete.Content>
            </Autocomplete.Root>
          </div>
        </div>
      </div>
    </div>
  );
};

const ComponentsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

ComponentsPage.appShellPageProps = {
  meta: {
    title: "Components",
    icon: <ComponentsIcon />,
  },
} satisfies AppShellPageProps;

export default ComponentsPage;
