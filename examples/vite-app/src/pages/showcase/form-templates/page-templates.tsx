import type { MouseEvent } from "react";
import {
  Button,
  Checkbox,
  Combobox,
  DatePicker,
  Field,
  Fieldset,
  Form,
  FormLayout,
  Input,
  ItemList,
  Layout,
  Select,
  Table,
  Text,
  Textarea,
  useAppShellScrollContainer,
  useNavigate,
} from "@tailor-platform/app-shell";
import { AddressFields, BillingFields, BUYERS, DeliveryFields, SupplierFields } from "./fields";

// Page templates: the form owns the route. Save sits in `Layout.Header` and
// reaches the form through `form="<id>"`; long forms add a sticky action bar.

const BACK = "/showcase/form-templates";

// 🔽 T3 — Page form. Sections are cards; the section nav is opt-in.
// Most sections are long enough to scroll past; Approval stays short.
// 🧪 Dummy Data: Replace with real data later
const SECTIONS = [
  { id: "supplier", title: "Supplier", description: "Who you are buying from and on what terms." },
  { id: "delivery", title: "Delivery", description: "Where and when the goods arrive." },
  { id: "billing", title: "Billing", description: "Which entity is invoiced, and how." },
  { id: "approval", title: "Approval", description: "Who signs off before the PO is sent." },
  { id: "ownership", title: "Ownership & notes", description: "Internal ownership and notes." },
];
const anchorIdFor = (id: string) => `page-form-section-${id}`;
const sectionProps = (index: number) => ({
  id: anchorIdFor(SECTIONS[index].id),
  title: SECTIONS[index].title,
  description: SECTIONS[index].description,
});

// 🧪 Dummy Data: Replace with real data later
const ENTITIES = ["Denim Tears Inc. (US)", "Denim Tears KK (Japan)", "Denim Tears Ltd. (UK)"];
// 🧪 Dummy Data: Replace with real data later
const TAX_CODES = ["Standard 10%", "Reduced 8%", "Exempt", "Reverse charge"];
// 🧪 Dummy Data: Replace with real data later
const MATCHING = ["2-way (PO + invoice)", "3-way (PO + receipt + invoice)"];

export function PageForm({
  // Not a rule: a default you can override. A nav earns its space once there
  // are enough sections to jump between.
  sectionNav = SECTIONS.length >= 3,
}: {
  sectionNav?: boolean;
}) {
  const navigate = useNavigate();
  const scrollRef = useAppShellScrollContainer();

  // Scroll the content area, not the browser's default anchor jump: that also
  // scrolls the shell's outer frame, shifting the header and sidebar out of place.
  const jumpTo = (event: MouseEvent, anchorId: string) => {
    const container = scrollRef.current;
    const target = document.getElementById(anchorId);
    if (!container || !target) return;
    event.preventDefault();
    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      16;
    container.scrollTo({ top, behavior: "smooth" });
    window.history.replaceState(window.history.state, "", `#${anchorId}`);
  };

  const form = (
    <Form id="page-form" onFormSubmit={() => navigate(BACK)}>
      <FormLayout columns={2}>
        {/* 🔽 Supplier — long */}
        <FormLayout.Section {...sectionProps(0)}>
          <SupplierFields />
          <Field.Root name="contactName">
            <Field.Label>Supplier contact</Field.Label>
            <Field.Control placeholder="Aiko Tanaka" />
          </Field.Root>
          <Field.Root name="contactEmail">
            <Field.Label>Contact email</Field.Label>
            <Field.Control type="email" placeholder="aiko@kansai-textile.jp" />
            <Field.Error match="typeMismatch">Enter a valid email address.</Field.Error>
          </Field.Root>
          <Field.Root name="quoteNumber">
            <Field.Label>Quote number</Field.Label>
            <Field.Control placeholder="Q-2026-0417" />
          </Field.Root>
          <Field.Root name="quoteValidUntil">
            <Field.Label>Quote valid until</Field.Label>
            <DatePicker />
          </Field.Root>
          <Field.Root name="supplierNote" span="full">
            <Field.Label>Note to supplier</Field.Label>
            <Textarea rows={3} placeholder="Printed on the purchase order" />
          </Field.Root>
        </FormLayout.Section>

        {/* 🔽 Delivery — long, with an address group */}
        <FormLayout.Section {...sectionProps(1)}>
          <DeliveryFields withInstructions={false} />
          <Fieldset.Root span={2} className="flex flex-col gap-3">
            <Fieldset.Legend>Delivery address</Fieldset.Legend>
            <AddressFields prefix="delivery" />
          </Fieldset.Root>
          <Field.Root name="deliveryInstructions" span="full">
            <Field.Label>Delivery instructions</Field.Label>
            <Textarea rows={3} placeholder="Dock hours, contact on arrival, pallet limits…" />
          </Field.Root>
          <Field.Root name="partialShipments" span="full">
            <Checkbox label="Accept partial shipments" defaultChecked />
          </Field.Root>
        </FormLayout.Section>

        {/* 🔽 Billing — long, with an address group */}
        <FormLayout.Section {...sectionProps(2)}>
          <Field.Root name="billTo">
            <Field.Label required>Bill to</Field.Label>
            <Select items={ENTITIES} defaultValue={ENTITIES[0]} required />
          </Field.Root>
          <Field.Root name="billingEmail">
            <Field.Label>Invoices from supplier to</Field.Label>
            <Field.Control type="email" placeholder="ap@denimtears.com" />
            <Field.Error match="typeMismatch">Enter a valid email address.</Field.Error>
          </Field.Root>
          <Field.Root name="taxCode">
            <Field.Label>Tax code</Field.Label>
            <Select items={TAX_CODES} defaultValue="Standard 10%" />
          </Field.Root>
          <Field.Root name="matching">
            <Field.Label>Invoice matching</Field.Label>
            <Select items={MATCHING} defaultValue={MATCHING[1]} />
            <Field.Description>3-way holds payment until the goods are received.</Field.Description>
          </Field.Root>
          <Fieldset.Root span={2} className="flex flex-col gap-3">
            <Fieldset.Legend>Billing address</Fieldset.Legend>
            <AddressFields prefix="billing" />
          </Fieldset.Root>
        </FormLayout.Section>

        {/* 🔽 Approval — deliberately short */}
        <FormLayout.Section {...sectionProps(3)}>
          <Field.Root name="approver">
            <Field.Label required>Approver</Field.Label>
            <Combobox items={BUYERS} placeholder="Search people" required />
            <Field.Error match="valueMissing">Choose an approver.</Field.Error>
          </Field.Root>
          <Field.Root name="approveBy">
            <Field.Label>Approve by</Field.Label>
            <DatePicker />
          </Field.Root>
        </FormLayout.Section>

        {/* 🔽 Ownership & notes */}
        <FormLayout.Section {...sectionProps(4)}>
          <BillingFields />
        </FormLayout.Section>
        <FormLayout.Actions
          sticky
          start={
            <Text variant="body-md" className="text-muted-foreground">
              Draft · not saved yet
            </Text>
          }
        >
          <Button type="button" variant="outline" onClick={() => navigate(BACK)}>
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </FormLayout.Actions>
      </FormLayout>
    </Form>
  );

  return (
    // The nav takes a column of its own, so the page widens to keep the form's width
    <Layout maxWidth={sectionNav ? "xl" : "lg"}>
      <Layout.Header
        title="New purchase order"
        actions={[
          <Button key="cancel" variant="outline" onClick={() => navigate(BACK)}>
            Cancel
          </Button>,
          <Button key="save" type="submit" form="page-form">
            Create
          </Button>,
        ]}
      />
      {/* Layout counts its direct Layout.Column children to build the grid,
          so the columns can't sit inside a fragment. */}
      {sectionNav && (
        // 🔽 Section nav — sticky beside the form on wide screens
        <Layout.Column area="left" className="lg:sticky lg:top-4 lg:self-start">
          <ItemList.Root aria-label="Form sections">
            {SECTIONS.map((section) => (
              <ItemList.Item
                key={section.id}
                render={
                  // oxlint-disable-next-line jsx-a11y/anchor-has-content -- content is provided by ItemList.Item's children
                  <a
                    href={`#${anchorIdFor(section.id)}`}
                    onClick={(event) => jumpTo(event, anchorIdFor(section.id))}
                  />
                }
              >
                {section.title}
              </ItemList.Item>
            ))}
          </ItemList.Root>
        </Layout.Column>
      )}
      <Layout.Column area={sectionNav ? "main" : undefined}>{form}</Layout.Column>
    </Layout>
  );
}

// 🔽 T4 — Document form (header fields + line items)
// 🧪 Dummy Data: Replace with real data later
const LINES = [
  { sku: "DT-HD-BLK-M", name: "Cotton Wreath Hoodie — Black / M", qty: 120, price: 38.5 },
  { sku: "DT-HD-BLK-L", name: "Cotton Wreath Hoodie — Black / L", qty: 96, price: 38.5 },
  { sku: "DT-JN-IND-32", name: "Selvedge Jean — Indigo / 32", qty: 60, price: 54.0 },
];
const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
// Example-app utilities lose to the table's own alignment classes, so set it inline.
const RIGHT = { textAlign: "right" } as const;
const total = LINES.reduce((sum, line) => sum + line.qty * line.price, 0);

export function DocumentForm() {
  const navigate = useNavigate();
  return (
    <Layout maxWidth="xl">
      <Layout.Header
        title="New purchase order"
        actions={[
          <Button key="cancel" variant="outline" onClick={() => navigate(BACK)}>
            Cancel
          </Button>,
          <Button key="save" type="submit" form="document-form">
            Create
          </Button>,
        ]}
      />
      <Layout.Column>
        <Form id="document-form" onFormSubmit={() => navigate(BACK)}>
          <FormLayout columns={4}>
            {/* 🔽 Header fields — four across on wide screens */}
            <FormLayout.Section title="Order">
              <SupplierFields />
              <DeliveryFields withInstructions={false} />
            </FormLayout.Section>

            {/* 🔽 Line items — LineItems (as#676) replaces this Table once it ships */}
            <FormLayout.Section title="Lines" description="3 lines">
              {/* Out to the card's edges: the table pads its own first and last cells */}
              <FormLayout.Item span="full" className="-mx-6">
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Item</Table.Head>
                      <Table.Head className="w-32" style={RIGHT}>
                        Quantity
                      </Table.Head>
                      <Table.Head className="w-32" style={RIGHT}>
                        Unit price
                      </Table.Head>
                      <Table.Head className="w-36" style={RIGHT}>
                        Amount
                      </Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {LINES.map((line) => (
                      <Table.Row key={line.sku}>
                        <Table.Cell>
                          <div className="flex flex-col">
                            <span>{line.name}</span>
                            <span className="text-body-sm text-muted-foreground">{line.sku}</span>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Input
                            type="number"
                            defaultValue={line.qty}
                            aria-label={`Quantity for ${line.sku}`}
                            style={RIGHT}
                          />
                        </Table.Cell>
                        <Table.Cell className="tabular-nums" style={RIGHT}>
                          {money(line.price)}
                        </Table.Cell>
                        <Table.Cell className="tabular-nums" style={RIGHT}>
                          {money(line.qty * line.price)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                  <Table.Footer>
                    <Table.Row>
                      <Table.Cell colSpan={3} className="font-semibold" style={RIGHT}>
                        Total
                      </Table.Cell>
                      <Table.Cell className="font-semibold tabular-nums" style={RIGHT}>
                        {money(total)}
                      </Table.Cell>
                    </Table.Row>
                  </Table.Footer>
                </Table.Root>
              </FormLayout.Item>
            </FormLayout.Section>

            <FormLayout.Section title="Notes" columns={2}>
              <Field.Root name="supplierNote">
                <Field.Label>Note to supplier</Field.Label>
                <Field.Control placeholder="Printed on the PO" />
              </Field.Root>
              <Field.Root name="internalNote">
                <Field.Label>Internal note</Field.Label>
                <Field.Control placeholder="Only visible to your team" />
              </Field.Root>
            </FormLayout.Section>
          </FormLayout>
        </Form>
      </Layout.Column>
    </Layout>
  );
}
