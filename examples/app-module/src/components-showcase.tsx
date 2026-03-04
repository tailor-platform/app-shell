import { useState, Fragment } from "react";
import {
  defineResource,
  Layout,
  Accordion,
  Tabs,
  Progress,
  Meter,
  Slider,
  Switch,
  Toggle,
  ToggleGroup,
  Radio,
  RadioGroup,
  Checkbox,
  CheckboxGroup,
  Select,
  Field,
  Fieldset,
  Form,
  Input,
  NumberField,
  Separator,
  Badge,
  Button,
  AlertDialog,
  Autocomplete,
  Avatar,
  Breadcrumb,
  Collapsible,
  Combobox,
  Dialog,
  Popover,
  PreviewCard,
  ScrollArea,
  Sheet,
  Table,
  Toolbar,
  Tooltip,
  DescriptionCard,
} from "@tailor-platform/app-shell";
import type { SVGProps } from "react";

// ============================================================================
// Icons
// ============================================================================

const ComponentsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z" />
    <path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z" />
    <path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z" />
    <path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z" />
  </svg>
);

const BoldIcon = (props: SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
  </svg>
);

const ItalicIcon = (props: SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <line x1="19" x2="10" y1="4" y2="4" />
    <line x1="14" x2="5" y1="20" y2="20" />
    <line x1="15" x2="9" y1="4" y2="20" />
  </svg>
);

const UnderlineIcon = (props: SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <line x1="4" x2="20" y1="20" y2="20" />
  </svg>
);

const InfoIcon = (props: SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const AlignLeftIcon = (props: SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="15" x2="3" y1="12" y2="12" />
    <line x1="17" x2="3" y1="18" y2="18" />
  </svg>
);

const AlignCenterIcon = (props: SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="17" x2="7" y1="12" y2="12" />
    <line x1="19" x2="5" y1="18" y2="18" />
  </svg>
);

const AlignRightIcon = (props: SVGProps<SVGSVGElement>) => (
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
    {...props}
  >
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="21" x2="9" y1="12" y2="12" />
    <line x1="21" x2="7" y1="18" y2="18" />
  </svg>
);

// ============================================================================
// Section wrapper
// ============================================================================

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div
    className="astw:rounded-lg astw:border astw:border-border astw:bg-card astw:p-6"
    style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
  >
    <h3 className="astw:text-base astw:font-semibold astw:text-foreground">
      {title}
    </h3>
    <Separator />
    {children}
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="astw:text-sm astw:font-medium">{children}</span>
);

// ============================================================================
// Mock data
// ============================================================================

const mockOrder = {
  id: "po-2024-0042",
  docNumber: "PO-10000041",
  status: "CONFIRMED",
  billingStatus: "PARTIALLY_BILLED",
  deliveryStatus: "NOT_RECEIVED",
  supplierName: "Acme Industrial Supplies",
  expectedDeliveryDate: "2024-02-15T00:00:00Z",
  createdAt: "2024-01-20T10:30:00Z",
  confirmedAt: "2024-01-21T09:00:00Z",
  externalReference: "P00594",
  note: "Rush order - priority shipping requested.",
  currency: { code: "USD", symbol: "$" },
  shipToLocation: {
    name: "Main Warehouse",
    address: {
      line1: "1234 Industrial Blvd",
      line2: "Building C",
      city: "Austin",
      state: "TX",
      zip: "78701",
      country: "United States",
    },
  },
  subtotal: 12500.0,
  tax: 1031.25,
  total: 13531.25,
};

const invoices = [
  { id: "INV-001", status: "Paid", method: "Credit Card", amount: "$250.00" },
  { id: "INV-002", status: "Pending", method: "PayPal", amount: "$150.00" },
  {
    id: "INV-003",
    status: "Unpaid",
    method: "Bank Transfer",
    amount: "$350.00",
  },
  { id: "INV-004", status: "Paid", method: "Credit Card", amount: "$450.00" },
  { id: "INV-005", status: "Paid", method: "PayPal", amount: "$550.00" },
];

const tags = Array.from({ length: 50 }, (_, i) => `Tag ${i + 1}`);

const fruits = ["Apple", "Banana", "Cherry", "Grape", "Mango", "Orange"];
const frameworks = ["React", "Vue", "Angular", "Svelte", "Express", "NestJS"];

interface ProduceGroupItem {
  value: string;
  items: string[];
}

const produceGroups: ProduceGroupItem[] = [
  {
    value: "Fruits",
    items: ["Apple", "Banana", "Orange"],
  },
  {
    value: "Vegetables",
    items: ["Carrot", "Lettuce", "Spinach"],
  },
];

const frameworkGroups: ProduceGroupItem[] = [
  {
    value: "Frontend",
    items: ["React", "Vue", "Angular", "Svelte"],
  },
  {
    value: "Backend",
    items: ["Express", "NestJS", "Fastify"],
  },
];

const programmingLanguages = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Rust",
  "Go",
  "Java",
  "C#",
  "Swift",
  "Kotlin",
  "Ruby",
];

interface LabelItem {
  id: string;
  value: string;
}

const initialLabels: LabelItem[] = [
  { id: "bug", value: "bug" },
  { id: "docs", value: "documentation" },
  { id: "enhancement", value: "enhancement" },
  { id: "help-wanted", value: "help wanted" },
  { id: "good-first-issue", value: "good first issue" },
];

// ============================================================================
// Combobox Pattern Demos
// ============================================================================

const MultipleComboboxDemo = () => {
  return (
    <Combobox.Root items={programmingLanguages} multiple>
      <Combobox.Chips>
        <Combobox.Value>
          {(value: string[]) => (
            <Fragment>
              {value.map((lang) => (
                <Combobox.Chip key={lang} aria-label={lang}>
                  {lang}
                  <Combobox.ChipRemove aria-label="Remove" />
                </Combobox.Chip>
              ))}
              <Combobox.Input
                placeholder={value.length > 0 ? "" : "Select languages..."}
              />
            </Fragment>
          )}
        </Combobox.Value>
      </Combobox.Chips>
      <Combobox.Content>
        <Combobox.List>
          {(item: string) => <Combobox.Item value={item}>{item}</Combobox.Item>}
        </Combobox.List>
        <Combobox.Empty>No languages found.</Combobox.Empty>
      </Combobox.Content>
    </Combobox.Root>
  );
};

const CreatableComboboxDemo = () => {
  const [labels, setLabels] = useState<LabelItem[]>(initialLabels);
  const [dialogState, setDialogState] = useState<{
    item: LabelItem;
    resolve: (accept?: boolean) => void;
  } | null>(null);
  const createInputRef = { current: null as HTMLInputElement | null };

  const creatable = Combobox.useCreatable({
    items: labels,
    multiple: true,
    getLabel: (item) => item.value,
    createItem: (value) => ({
      id: value.toLocaleLowerCase().replace(/\s+/g, "-"),
      value,
    }),
    onItemCreated: (item, resolve) => {
      setDialogState({ item, resolve });
    },
    formatCreateLabel: (value) => `Create "${value}"`,
  });

  return (
    <Fragment>
      <Combobox.Root
        items={creatable.items}
        multiple
        value={creatable.value}
        onValueChange={creatable.onValueChange}
        inputValue={creatable.inputValue}
        onInputValueChange={creatable.onInputValueChange}
      >
        <Combobox.Chips>
          <Combobox.Value>
            {(value: LabelItem[]) => (
              <Fragment>
                {value.map((label) => (
                  <Combobox.Chip key={label.id} aria-label={label.value}>
                    {label.value}
                    <Combobox.ChipRemove aria-label="Remove" />
                  </Combobox.Chip>
                ))}
                <Combobox.Input
                  placeholder={value.length > 0 ? "" : "Add labels..."}
                />
              </Fragment>
            )}
          </Combobox.Value>
        </Combobox.Chips>
        <Combobox.Content>
          <Combobox.List>
            {(item: LabelItem) => (
              <Combobox.Item key={item.id} value={item}>
                {creatable.isCreateItem(item)
                  ? `+ ${creatable.formatCreateLabel(creatable.getCreateLabel(item)!)}`
                  : item.value}
              </Combobox.Item>
            )}
          </Combobox.List>
          <Combobox.Empty>No labels found.</Combobox.Empty>
        </Combobox.Content>
      </Combobox.Root>

      <Dialog.Root
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) {
            dialogState?.resolve(false);
            setDialogState(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Create new label</Dialog.Title>
            <Dialog.Description>Add a new label to select.</Dialog.Description>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const value = createInputRef.current?.value.trim();
                if (value && dialogState) {
                  setLabels((prev) => [
                    ...prev,
                    { ...dialogState.item, value },
                  ]);
                  dialogState.resolve();
                  setDialogState(null);
                }
              }}
            >
              <Input
                ref={createInputRef}
                placeholder="Label name"
                defaultValue={dialogState?.item.value ?? ""}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  marginTop: "1rem",
                }}
              >
                <Button
                  variant="outline"
                  onClick={() => {
                    dialogState?.resolve(false);
                    setDialogState(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Fragment>
  );
};

// ============================================================================
// Components Showcase Page
// ============================================================================

const ComponentsShowcasePage = () => {
  const [switchChecked, setSwitchChecked] = useState(false);
  const [radioValue, setRadioValue] = useState("option1");
  const [checkboxA, setCheckboxA] = useState(false);
  const [checkboxB, setCheckboxB] = useState(true);
  const [selectValue, setSelectValue] = useState("apple");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Layout columns={1} title="Components Showcase">
      <Layout.Column>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {/* ================================================================
              BUTTON
              ================================================================ */}
          <Section title="Button">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <SectionLabel>Variants</SectionLabel>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <SectionLabel>Sizes</SectionLabel>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">
                  <InfoIcon />
                </Button>
              </div>
            </div>
          </Section>

          {/* ================================================================
              BADGE
              ================================================================ */}
          <Section title="Badge">
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="neutral">Neutral</Badge>
              <Badge variant="outline-success">Outline Success</Badge>
              <Badge variant="outline-warning">Outline Warning</Badge>
              <Badge variant="outline-error">Outline Error</Badge>
              <Badge variant="outline-info">Outline Info</Badge>
              <Badge variant="outline-neutral">Outline Neutral</Badge>
            </div>
          </Section>

          {/* ================================================================
              ACCORDION
              ================================================================ */}
          <Section title="Accordion">
            <Accordion.Root>
              <Accordion.Item value="item-1">
                <Accordion.Trigger>What is AppShell?</Accordion.Trigger>
                <Accordion.Content>
                  AppShell is a React-based framework for building ERP
                  applications with opinionated layouts, authentication, and
                  module federation.
                </Accordion.Content>
              </Accordion.Item>
              <Accordion.Item value="item-2">
                <Accordion.Trigger>How do I define a module?</Accordion.Trigger>
                <Accordion.Content>
                  Use <code>defineModule()</code> to create top-level navigation
                  items and <code>defineResource()</code> to create pages and
                  sub-pages within modules.
                </Accordion.Content>
              </Accordion.Item>
              <Accordion.Item value="item-3">
                <Accordion.Trigger>
                  What UI components are available?
                </Accordion.Trigger>
                <Accordion.Content>
                  AppShell provides a comprehensive set of UI primitives built
                  on Base UI.
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          </Section>

          {/* ================================================================
              TABS
              ================================================================ */}
          <Section title="Tabs">
            <Tabs.Root defaultValue="overview">
              <Tabs.List>
                <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
                <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
                <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="overview">
                <div className="astw:p-4 astw:text-sm astw:text-muted-foreground">
                  This is the Overview tab content.
                </div>
              </Tabs.Content>
              <Tabs.Content value="analytics">
                <div className="astw:p-4 astw:text-sm astw:text-muted-foreground">
                  Analytics data would be displayed here.
                </div>
              </Tabs.Content>
              <Tabs.Content value="settings">
                <div className="astw:p-4 astw:text-sm astw:text-muted-foreground">
                  Configuration and preferences.
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </Section>

          {/* ================================================================
              COLLAPSIBLE
              ================================================================ */}
          <Section title="Collapsible">
            <Collapsible.Root>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <SectionLabel>3 items tagged</SectionLabel>
                <Collapsible.Trigger>
                  <Button variant="ghost" size="sm">
                    Toggle
                  </Button>
                </Collapsible.Trigger>
              </div>
              <div
                className="astw:rounded-md astw:border astw:border-border astw:px-4 astw:py-2 astw:text-sm"
                style={{ marginTop: "0.5rem" }}
              >
                @tailor-platform/app-shell
              </div>
              <Collapsible.Content>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <div className="astw:rounded-md astw:border astw:border-border astw:px-4 astw:py-2 astw:text-sm">
                    @tailor-platform/auth-public-client
                  </div>
                  <div className="astw:rounded-md astw:border astw:border-border astw:px-4 astw:py-2 astw:text-sm">
                    @base-ui/react
                  </div>
                </div>
              </Collapsible.Content>
            </Collapsible.Root>
          </Section>

          {/* ================================================================
              OVERLAY (Dialog, AlertDialog, Sheet, Popover, Tooltip, PreviewCard)
              ================================================================ */}
          <Section title="Overlay">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
              }}
            >
              {/* Dialog */}
              <div
                className="astw:rounded-md astw:border astw:border-border astw:p-4"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <span className="astw:text-sm astw:font-medium">Dialog</span>
                <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
                  <Dialog.Trigger>
                    <Button variant="outline" size="sm">
                      Open Dialog
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Content>
                    <Dialog.Header>
                      <Dialog.Title>Edit Profile</Dialog.Title>
                      <Dialog.Description>
                        Make changes to your profile here. Click save when done.
                      </Dialog.Description>
                    </Dialog.Header>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        padding: "1rem 0",
                      }}
                    >
                      <Field.Root>
                        <Field.Label>Name</Field.Label>
                        <Field.Control
                          render={<Input defaultValue="John Doe" />}
                        />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Email</Field.Label>
                        <Field.Control
                          render={<Input defaultValue="john@example.com" />}
                        />
                      </Field.Root>
                    </div>
                    <Dialog.Footer>
                      <Button
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={() => setDialogOpen(false)}>
                        Save changes
                      </Button>
                    </Dialog.Footer>
                  </Dialog.Content>
                </Dialog.Root>
              </div>

              {/* AlertDialog */}
              <div
                className="astw:rounded-md astw:border astw:border-border astw:p-4"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <span className="astw:text-sm astw:font-medium">
                  AlertDialog
                </span>
                <AlertDialog.Root>
                  <AlertDialog.Trigger>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Content>
                    <AlertDialog.Header>
                      <AlertDialog.Title>
                        Are you absolutely sure?
                      </AlertDialog.Title>
                      <AlertDialog.Description>
                        This action cannot be undone. This will permanently
                        delete your account and remove your data from our
                        servers.
                      </AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer>
                      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                      <AlertDialog.Action onClick={() => alert("Deleted!")}>
                        Yes, delete account
                      </AlertDialog.Action>
                    </AlertDialog.Footer>
                  </AlertDialog.Content>
                </AlertDialog.Root>
              </div>

              {/* Sheet */}
              <div
                className="astw:rounded-md astw:border astw:border-border astw:p-4"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <span className="astw:text-sm astw:font-medium">Sheet</span>
                <Sheet.Root open={sheetOpen} onOpenChange={setSheetOpen}>
                  <Sheet.Trigger>
                    <Button variant="outline" size="sm">
                      Open Sheet
                    </Button>
                  </Sheet.Trigger>
                  <Sheet.Content side="right">
                    <Sheet.Header>
                      <Sheet.Title>Settings</Sheet.Title>
                      <Sheet.Description>
                        Adjust your application preferences here.
                      </Sheet.Description>
                    </Sheet.Header>
                    <div
                      style={{
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <Field.Root>
                        <Field.Label>Display Name</Field.Label>
                        <Field.Control
                          render={<Input defaultValue="John Doe" />}
                        />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Username</Field.Label>
                        <Field.Control
                          render={<Input defaultValue="@johndoe" />}
                        />
                      </Field.Root>
                    </div>
                    <Sheet.Footer>
                      <Button onClick={() => setSheetOpen(false)}>
                        Save changes
                      </Button>
                    </Sheet.Footer>
                  </Sheet.Content>
                </Sheet.Root>
              </div>

              {/* Popover */}
              <div
                className="astw:rounded-md astw:border astw:border-border astw:p-4"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <span className="astw:text-sm astw:font-medium">Popover</span>
                <Popover.Root>
                  <Popover.Trigger>
                    <Button variant="outline" size="sm">
                      Open Popover
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <span className="astw:text-sm astw:font-semibold">
                        Dimensions
                      </span>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "0.5rem",
                        }}
                      >
                        <Field.Root>
                          <Field.Label>Width</Field.Label>
                          <Field.Control
                            render={<Input defaultValue="100%" />}
                          />
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>Height</Field.Label>
                          <Field.Control
                            render={<Input defaultValue="25px" />}
                          />
                        </Field.Root>
                      </div>
                    </div>
                    <Popover.Arrow />
                  </Popover.Content>
                </Popover.Root>
              </div>

              {/* Tooltip */}
              <div
                className="astw:rounded-md astw:border astw:border-border astw:p-4"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <span className="astw:text-sm astw:font-medium">Tooltip</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Button variant="outline" size="icon">
                        <InfoIcon />
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content side="top">
                      This is a helpful tooltip
                    </Tooltip.Content>
                  </Tooltip.Root>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Button variant="outline" size="sm">
                        Hover me
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content side="bottom">
                      Tooltip on the bottom
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
              </div>

              {/* PreviewCard */}
              <div
                className="astw:rounded-md astw:border astw:border-border astw:p-4"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <span className="astw:text-sm astw:font-medium">
                  PreviewCard
                </span>
                <PreviewCard.Root>
                  <PreviewCard.Trigger>
                    <span className="astw:text-sm astw:text-primary astw:underline astw:cursor-pointer">
                      Hover to preview
                    </span>
                  </PreviewCard.Trigger>
                  <PreviewCard.Content side="bottom">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <span className="astw:text-sm astw:font-semibold">
                        Tailor Platform
                      </span>
                      <span className="astw:text-xs astw:text-muted-foreground">
                        A headless ERP platform for building enterprise
                        applications.
                      </span>
                    </div>
                    <PreviewCard.Arrow />
                  </PreviewCard.Content>
                </PreviewCard.Root>
              </div>
            </div>
          </Section>

          {/* ================================================================
              AVATAR
              ================================================================ */}
          <Section title="Avatar">
            <div
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <Avatar.Root>
                <Avatar.Image
                  src="https://github.com/github.png"
                  alt="GitHub"
                />
                <Avatar.Fallback>GH</Avatar.Fallback>
              </Avatar.Root>
              <Avatar.Root>
                <Avatar.Fallback>JD</Avatar.Fallback>
              </Avatar.Root>
              <Avatar.Root>
                <Avatar.Fallback>CN</Avatar.Fallback>
              </Avatar.Root>
            </div>
          </Section>

          {/* ================================================================
              BREADCRUMB
              ================================================================ */}
          <Section title="Breadcrumb">
            <Breadcrumb.Root>
              <Breadcrumb.List>
                <Breadcrumb.Item>
                  <Breadcrumb.Link to="/">Home</Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  <Breadcrumb.Link to="/custom-page">Modules</Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  <Breadcrumb.Ellipsis />
                </Breadcrumb.Item>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  <Breadcrumb.Page>Components Showcase</Breadcrumb.Page>
                </Breadcrumb.Item>
              </Breadcrumb.List>
            </Breadcrumb.Root>
          </Section>

          {/* ================================================================
              SEPARATOR
              ================================================================ */}
          <Section title="Separator">
            <div>
              <div className="astw:text-sm">Content above</div>
              <Separator className="astw:my-4" />
              <div className="astw:text-sm">Content below</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                height: "1.5rem",
              }}
            >
              <span className="astw:text-sm">Left</span>
              <Separator orientation="vertical" />
              <span className="astw:text-sm">Center</span>
              <Separator orientation="vertical" />
              <span className="astw:text-sm">Right</span>
            </div>
          </Section>

          {/* ================================================================
              PROGRESS & METER
              ================================================================ */}
          <Section title="Progress & Meter">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <SectionLabel>Progress</SectionLabel>
                  <span className="astw:text-sm astw:text-muted-foreground">
                    65%
                  </span>
                </div>
                <Progress value={65} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <SectionLabel>Meter (Storage)</SectionLabel>
                  <span className="astw:text-sm astw:text-muted-foreground">
                    78%
                  </span>
                </div>
                <Meter value={78} />
              </div>
            </div>
          </Section>

          {/* ================================================================
              FORM CONTROLS
              ================================================================ */}
          <Section title="Form Controls (Field / Fieldset / Form / Input / NumberField / Label / Select)">
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Form submitted!");
              }}
            >
              <Fieldset.Root>
                <Fieldset.Legend>User Information</Fieldset.Legend>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginTop: "0.75rem",
                  }}
                >
                  <Field.Root>
                    <Field.Label>Full Name</Field.Label>
                    <Field.Control render={<Input placeholder="John Doe" />} />
                    <Field.Description>
                      Enter your full legal name.
                    </Field.Description>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Email</Field.Label>
                    <Field.Control
                      render={
                        <Input type="email" placeholder="john@example.com" />
                      }
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Quantity</Field.Label>
                    <NumberField.Root defaultValue={1} min={0} max={100}>
                      <NumberField.Group>
                        <NumberField.Decrement />
                        <NumberField.Input />
                        <NumberField.Increment />
                      </NumberField.Group>
                    </NumberField.Root>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Category</Field.Label>
                    <Select.Root
                      value={selectValue}
                      onValueChange={(value) => setSelectValue(value as string)}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select a category" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Group>
                          <Select.GroupLabel>Fruits</Select.GroupLabel>
                          <Select.Item value="apple">Apple</Select.Item>
                          <Select.Item value="banana">Banana</Select.Item>
                          <Select.Item value="orange">Orange</Select.Item>
                        </Select.Group>
                        <Select.Separator />
                        <Select.Group>
                          <Select.GroupLabel>Vegetables</Select.GroupLabel>
                          <Select.Item value="carrot">Carrot</Select.Item>
                          <Select.Item value="broccoli">Broccoli</Select.Item>
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </Field.Root>
                </div>
              </Fieldset.Root>
            </Form>
          </Section>

          {/* ================================================================
              COMBOBOX
              ================================================================ */}
          <Section title="Combobox">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#888",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  Basic
                </span>
                <Combobox.Root items={frameworks}>
                  <Combobox.InputGroup>
                    <Combobox.Input placeholder="Select a framework..." />
                    <Combobox.Clear />
                    <Combobox.Trigger />
                  </Combobox.InputGroup>
                  <Combobox.Content>
                    <Combobox.List>
                      {(item: string) => (
                        <Combobox.Item value={item}>{item}</Combobox.Item>
                      )}
                    </Combobox.List>
                    <Combobox.Empty>No framework found.</Combobox.Empty>
                  </Combobox.Content>
                </Combobox.Root>
              </div>

              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#888",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  Grouped
                </span>
                <Combobox.Root items={frameworkGroups}>
                  <Combobox.InputGroup>
                    <Combobox.Input placeholder="Select a framework..." />
                    <Combobox.Clear />
                    <Combobox.Trigger />
                  </Combobox.InputGroup>
                  <Combobox.Content>
                    <Combobox.List>
                      {(group: ProduceGroupItem) => (
                        <Combobox.Group key={group.value} items={group.items}>
                          <Combobox.GroupLabel>
                            {group.value}
                          </Combobox.GroupLabel>
                          <Combobox.Collection>
                            {(item: string) => (
                              <Combobox.Item key={item} value={item}>
                                {item}
                              </Combobox.Item>
                            )}
                          </Combobox.Collection>
                        </Combobox.Group>
                      )}
                    </Combobox.List>
                    <Combobox.Empty>No framework found.</Combobox.Empty>
                  </Combobox.Content>
                </Combobox.Root>
              </div>

              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#888",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  Multiple Select
                </span>
                <MultipleComboboxDemo />
              </div>
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#888",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  Creatable
                </span>
                <CreatableComboboxDemo />
              </div>
            </div>
          </Section>

          {/* ================================================================
              AUTOCOMPLETE
              ================================================================ */}
          <Section title="Autocomplete">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#888",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  Basic
                </span>
                <Autocomplete.Root items={fruits}>
                  <Autocomplete.InputGroup>
                    <Autocomplete.Input placeholder="Search fruits..." />
                    <Autocomplete.Clear />
                    <Autocomplete.Trigger />
                  </Autocomplete.InputGroup>
                  <Autocomplete.Content>
                    <Autocomplete.List>
                      {(item: string) => (
                        <Autocomplete.Item value={item}>
                          {item}
                        </Autocomplete.Item>
                      )}
                    </Autocomplete.List>
                    <Autocomplete.Empty>No fruits found.</Autocomplete.Empty>
                  </Autocomplete.Content>
                </Autocomplete.Root>
              </div>

              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#888",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  Grouped
                </span>
                <Autocomplete.Root items={produceGroups}>
                  <Autocomplete.InputGroup>
                    <Autocomplete.Input placeholder="Search produce..." />
                    <Autocomplete.Clear />
                    <Autocomplete.Trigger />
                  </Autocomplete.InputGroup>
                  <Autocomplete.Content>
                    <Autocomplete.List>
                      {(group: ProduceGroupItem) => (
                        <Autocomplete.Group
                          key={group.value}
                          items={group.items}
                        >
                          <Autocomplete.GroupLabel>
                            {group.value}
                          </Autocomplete.GroupLabel>
                          <Autocomplete.Collection>
                            {(item: string) => (
                              <Autocomplete.Item key={item} value={item}>
                                {item}
                              </Autocomplete.Item>
                            )}
                          </Autocomplete.Collection>
                        </Autocomplete.Group>
                      )}
                    </Autocomplete.List>
                    <Autocomplete.Empty>No produce found.</Autocomplete.Empty>
                  </Autocomplete.Content>
                </Autocomplete.Root>
              </div>
            </div>
          </Section>

          {/* ================================================================
              SWITCH / SLIDER / RADIO / CHECKBOX
              ================================================================ */}
          <Section title="Switch / Slider / Radio / Checkbox">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <SectionLabel>Switch</SectionLabel>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Switch
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                  />
                  <span className="astw:text-sm astw:text-muted-foreground">
                    Notifications {switchChecked ? "enabled" : "disabled"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <SectionLabel>Slider</SectionLabel>
                <Slider.Root defaultValue={[33]} />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <SectionLabel>Radio Group</SectionLabel>
                <RadioGroup
                  value={radioValue}
                  onValueChange={(value) => setRadioValue(value as string)}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {[
                      { value: "option1", label: "Small" },
                      { value: "option2", label: "Medium" },
                      { value: "option3", label: "Large" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <Radio value={opt.value} />
                        <span className="astw:text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <SectionLabel>Checkbox Group</SectionLabel>
                <CheckboxGroup>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Checkbox
                        checked={checkboxA}
                        onCheckedChange={(val) => setCheckboxA(val as boolean)}
                      />
                      <span className="astw:text-sm">
                        Accept terms and conditions
                      </span>
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Checkbox
                        checked={checkboxB}
                        onCheckedChange={(val) => setCheckboxB(val as boolean)}
                      />
                      <span className="astw:text-sm">
                        Subscribe to newsletter
                      </span>
                    </label>
                  </div>
                </CheckboxGroup>
              </div>
            </div>
          </Section>

          {/* ================================================================
              TOGGLE & TOGGLE GROUP
              ================================================================ */}
          <Section title="Toggle & ToggleGroup">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div>
                <SectionLabel>Individual Toggles</SectionLabel>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <Toggle variant="outline" size="sm">
                    <BoldIcon />
                  </Toggle>
                  <Toggle variant="outline" size="sm">
                    <ItalicIcon />
                  </Toggle>
                  <Toggle variant="outline" size="sm">
                    <UnderlineIcon />
                  </Toggle>
                </div>
              </div>
              <div>
                <SectionLabel>Toggle Group</SectionLabel>
                <div style={{ marginTop: "0.5rem" }}>
                  <ToggleGroup>
                    <Toggle value="bold" variant="outline" size="sm">
                      <BoldIcon />
                    </Toggle>
                    <Toggle value="italic" variant="outline" size="sm">
                      <ItalicIcon />
                    </Toggle>
                    <Toggle value="underline" variant="outline" size="sm">
                      <UnderlineIcon />
                    </Toggle>
                  </ToggleGroup>
                </div>
              </div>
            </div>
          </Section>

          {/* ================================================================
              TOOLBAR
              ================================================================ */}
          <Section title="Toolbar">
            <Toolbar.Root>
              <Toolbar.Group>
                <Toolbar.Button>
                  <BoldIcon />
                </Toolbar.Button>
                <Toolbar.Button>
                  <ItalicIcon />
                </Toolbar.Button>
                <Toolbar.Button>
                  <UnderlineIcon />
                </Toolbar.Button>
              </Toolbar.Group>
              <Toolbar.Separator />
              <Toolbar.Group>
                <Toolbar.Button>
                  <AlignLeftIcon />
                </Toolbar.Button>
                <Toolbar.Button>
                  <AlignCenterIcon />
                </Toolbar.Button>
                <Toolbar.Button>
                  <AlignRightIcon />
                </Toolbar.Button>
              </Toolbar.Group>
              <Toolbar.Separator />
              <Toolbar.Link href="#">Help</Toolbar.Link>
            </Toolbar.Root>
          </Section>

          {/* ================================================================
              TABLE
              ================================================================ */}
          <Section title="Table">
            <Table.Root>
              <Table.Caption>A list of recent invoices.</Table.Caption>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Invoice</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Method</Table.Head>
                  <Table.Head className="astw:text-right">Amount</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {invoices.map((inv) => (
                  <Table.Row key={inv.id}>
                    <Table.Cell className="astw:font-medium">
                      {inv.id}
                    </Table.Cell>
                    <Table.Cell>{inv.status}</Table.Cell>
                    <Table.Cell>{inv.method}</Table.Cell>
                    <Table.Cell className="astw:text-right">
                      {inv.amount}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
              <Table.Footer>
                <Table.Row>
                  <Table.Cell colSpan={3}>Total</Table.Cell>
                  <Table.Cell className="astw:text-right">$1,750.00</Table.Cell>
                </Table.Row>
              </Table.Footer>
            </Table.Root>
          </Section>

          {/* ================================================================
              SCROLL AREA
              ================================================================ */}
          <Section title="ScrollArea">
            <ScrollArea.Root className="astw:h-48 astw:w-64 astw:rounded-md astw:border astw:border-border">
              <div className="astw:p-4">
                <h4 className="astw:mb-4 astw:text-sm astw:font-medium">
                  Tags
                </h4>
                {tags.map((tag) => (
                  <div key={tag}>
                    <div className="astw:text-sm">{tag}</div>
                    <Separator className="astw:my-2" />
                  </div>
                ))}
              </div>
            </ScrollArea.Root>
          </Section>

          {/* ================================================================
              DESCRIPTION CARD
              ================================================================ */}
          <Section title="DescriptionCard">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <DescriptionCard
                data={mockOrder}
                title="Status Overview"
                columns={4}
                fields={[
                  {
                    key: "status",
                    label: "Status",
                    type: "badge",
                    meta: {
                      badgeVariantMap: {
                        DRAFT: "success",
                        CONFIRMED: "success",
                        CLOSED: "success",
                        CANCELED: "outline-error",
                      },
                    },
                  },
                  {
                    key: "billingStatus",
                    label: "Billing",
                    type: "badge",
                    meta: {
                      badgeVariantMap: {
                        NOT_BILLED: "outline-neutral",
                        PARTIALLY_BILLED: "outline-warning",
                        BILLED: "outline-success",
                      },
                    },
                  },
                  {
                    key: "deliveryStatus",
                    label: "Delivery",
                    type: "badge",
                    meta: {
                      badgeVariantMap: {
                        NOT_RECEIVED: "outline-neutral",
                        PARTIALLY_RECEIVED: "outline-warning",
                        RECEIVED: "outline-success",
                      },
                    },
                  },
                ]}
              />

              <DescriptionCard
                data={mockOrder}
                title="Order Details"
                columns={4}
                fields={[
                  {
                    key: "docNumber",
                    label: "PO Number",
                    meta: { copyable: true },
                  },
                  {
                    key: "externalReference",
                    label: "External Ref",
                    meta: { copyable: true },
                  },
                  { key: "supplierName", label: "Supplier" },
                  { type: "divider" },
                  {
                    key: "expectedDeliveryDate",
                    label: "Expected Delivery",
                    type: "date",
                    meta: { dateFormat: "medium" },
                  },
                  {
                    key: "confirmedAt",
                    label: "Confirmed",
                    type: "date",
                    meta: { dateFormat: "medium" },
                  },
                  {
                    key: "createdAt",
                    label: "Created",
                    type: "date",
                    meta: { dateFormat: "relative" },
                  },
                  { key: "shipToLocation.name", label: "Warehouse" },
                  { type: "divider" },
                  {
                    key: "shipToLocation.address",
                    label: "Shipping Address",
                    type: "address",
                    meta: { copyable: true },
                  },
                  {
                    key: "note",
                    label: "Notes",
                    meta: { truncateLines: 3 },
                  },
                ]}
              />

              <DescriptionCard
                data={mockOrder}
                title="Financial Summary"
                columns={4}
                fields={[
                  {
                    key: "subtotal",
                    label: "Subtotal",
                    type: "money",
                    meta: { currencyKey: "currency.code" },
                  },
                  {
                    key: "tax",
                    label: "Tax",
                    type: "money",
                    meta: { currencyKey: "currency.code" },
                  },
                  {
                    key: "total",
                    label: "Total",
                    type: "money",
                    meta: { currencyKey: "currency.code" },
                  },
                  { key: "currency.code", label: "Currency" },
                ]}
              />
            </div>
          </Section>

          {/* ================================================================
              LAYOUT
              ================================================================ */}
          <Section title="Layout (2 Columns)">
            <Layout
              columns={2}
              title="Order Detail"
              actions={[
                <Button key="cancel" variant="secondary" size="sm">
                  Cancel
                </Button>,
                <Button key="save" size="sm">
                  Save
                </Button>,
              ]}
            >
              <Layout.Column>
                <DescriptionCard
                  data={mockOrder}
                  title="General"
                  columns={3}
                  fields={[
                    {
                      key: "docNumber",
                      label: "PO Number",
                      meta: { copyable: true },
                    },
                    { key: "supplierName", label: "Supplier" },
                    {
                      key: "status",
                      label: "Status",
                      type: "badge",
                      meta: {
                        badgeVariantMap: { CONFIRMED: "success" },
                      },
                    },
                  ]}
                />
              </Layout.Column>
              <Layout.Column>
                <DescriptionCard
                  data={mockOrder}
                  title="Financials"
                  columns={3}
                  fields={[
                    {
                      key: "subtotal",
                      label: "Subtotal",
                      type: "money",
                      meta: { currencyKey: "currency.code" },
                    },
                    {
                      key: "tax",
                      label: "Tax",
                      type: "money",
                      meta: { currencyKey: "currency.code" },
                    },
                    {
                      key: "total",
                      label: "Total",
                      type: "money",
                      meta: { currencyKey: "currency.code" },
                    },
                  ]}
                />
              </Layout.Column>
            </Layout>
          </Section>
        </div>
      </Layout.Column>
    </Layout>
  );
};

export { ComponentsIcon };

export const componentsShowcaseResource = defineResource({
  path: "components-showcase",
  meta: {
    title: "Components Showcase",
    icon: <ComponentsIcon />,
  },
  component: ComponentsShowcasePage,
});
