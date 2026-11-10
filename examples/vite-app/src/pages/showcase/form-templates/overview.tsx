import * as React from "react";
import {
  Badge,
  Button,
  Card,
  FormLayout,
  Grid,
  Layout,
  Table,
  Text,
  useNavigate,
} from "@tailor-platform/app-shell";
import { ComplexExamples } from "./complex-examples";
import { DeliveryFields, NewSupplierFields, SupplierFields } from "./fields";
import { FieldTypes } from "./field-types";
import { ModalForm, SheetForm } from "./overlay-templates";
import { WizardDialog } from "./wizard-template";

type Template = {
  id: string;
  name: string;
  when: string;
  container: string;
  columns: string;
  action: React.ReactNode;
};

// 🧪 Dummy Data: Replace with real data later
const ROUTES = {
  page: "/showcase/form-templates/page",
  document: "/showcase/form-templates/document",
  wizard: "/showcase/form-templates/wizard",
};

// ✅ Reusable Component: Can be moved to components/ui/
function TemplateCard({ template }: { template: Template }) {
  return (
    <Card.Root className="h-full">
      <Card.Header
        title={
          <span className="flex items-center gap-2">
            <Badge variant="subtle-neutral">{template.id}</Badge>
            {template.name}
          </span>
        }
        description={template.when}
      />
      <Card.Content className="mt-auto flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-md">
          <dt className="text-muted-foreground">Container</dt>
          <dd>{template.container}</dd>
          <dt className="text-muted-foreground">Columns</dt>
          <dd>{template.columns}</dd>
        </dl>
        <div className="flex flex-wrap gap-2">{template.action}</div>
      </Card.Content>
    </Card.Root>
  );
}

export function FormTemplatesOverview() {
  const navigate = useNavigate();

  const templates: Template[] = [
    {
      id: "T1",
      name: "Modal form",
      when: "Create or edit without leaving the page. Pick the size by the form's length; add plain sections once it has groups.",
      container: 'Dialog size="sm" – "xl"',
      columns: "Up to 2",
      action: (
        <>
          <ModalForm
            size="md"
            title="New supplier"
            description="Add a supplier you can order from."
            submitLabel="Create supplier"
            trigger={<Button variant="outline">Open md · 6 fields</Button>}
          >
            <FormLayout columns={2}>
              <NewSupplierFields />
            </FormLayout>
          </ModalForm>
          <ModalForm
            size="lg"
            title="Edit PO-10000041"
            description="Update supplier and delivery terms."
            submitLabel="Save changes"
            trigger={<Button variant="outline">Open lg · 12 fields</Button>}
          >
            <FormLayout columns={2}>
              <FormLayout.Section variant="plain" title="Supplier">
                <SupplierFields />
              </FormLayout.Section>
              <FormLayout.Section variant="plain" title="Delivery">
                <DeliveryFields />
              </FormLayout.Section>
            </FormLayout>
          </ModalForm>
        </>
      ),
    },
    {
      id: "T2",
      name: "Side sheet",
      when: "Edit part of a record while the list or detail stays in view.",
      container: 'Sheet size="lg"',
      columns: "Up to 2",
      action: (
        <SheetForm
          title="Delivery details"
          description="PO-10000041 · Acme Industrial Supplies"
          submitLabel="Save"
          trigger={<Button variant="outline">Open sheet</Button>}
        >
          <FormLayout columns={2}>
            <DeliveryFields />
          </FormLayout>
        </SheetForm>
      ),
    },
    {
      id: "T3",
      name: "Page form",
      when: "The form needs its own URL. Card sections, a sticky action bar, and an optional section nav — on by default from three sections.",
      container: 'Layout maxWidth="lg" (or "xl" with the nav)',
      columns: "Up to 2 per section",
      action: (
        <>
          <Button variant="outline" onClick={() => navigate(`${ROUTES.page}?nav=1`)}>
            With section nav
          </Button>
          <Button variant="outline" onClick={() => navigate(`${ROUTES.page}?nav=0`)}>
            Without
          </Button>
        </>
      ),
    },
    {
      id: "T4",
      name: "Document form",
      when: "Header fields plus line items: PO, GR, invoice. Sections follow the document's view page.",
      container: 'Layout maxWidth="xl"',
      columns: "Up to 4 for the header",
      action: (
        <Button variant="outline" onClick={() => navigate(ROUTES.document)}>
          Open document
        </Button>
      ),
    },
    {
      id: "T5",
      name: "Wizard",
      when: "Ordered steps, each checked before the next — the later steps depend on the earlier answers. Three to seven steps, with a review at the end.",
      container: 'Dialog size="lg", or a page with a vertical Stepper',
      columns: "Up to 2 per step",
      action: (
        <>
          <WizardDialog trigger={<Button variant="outline">In a dialog</Button>} />
          <Button variant="outline" onClick={() => navigate(ROUTES.wizard)}>
            On a page
          </Button>
        </>
      ),
    },
  ];

  return (
    <Layout>
      <Layout.Header title="Form templates" />
      <Layout.Column>
        <Text variant="body-md" className="text-muted-foreground max-w-3xl">
          Every template uses the same purchase-order fields. Only the container and the maximum
          column count change: FormLayout reflows by the width of its container, so one field
          definition fits a dialog, a sheet and a page.
        </Text>

        {/* 🔽 Template catalogue */}
        <Grid columns={{ initial: 1, md: 2 }} gap={4}>
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </Grid>

        {/* 🔽 Choosing a template */}
        <Card.Root>
          <Card.Header
            title="Choosing a template"
            description="Start from the first row that matches."
          />
          <Card.Content padding="none">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>If the form…</Table.Head>
                  <Table.Head>Use</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {/* 🧪 Dummy Data: Replace with real data later */}
                {[
                  ["Has line items (a document with header and lines)", "T4 Document form"],
                  ["Has ordered steps that depend on earlier answers", "T5 Wizard"],
                  ["Edits one card of a record that's already on screen", "Edit in place (E6)"],
                  ["Needs its own URL, or is long enough to scroll a page", "T3 Page form"],
                  ["Edits part of a record shown beside it", "T2 Side sheet"],
                  ["Everything else", "T1 Modal form, sized to fit"],
                ].map(([condition, use]) => (
                  <Table.Row key={use}>
                    <Table.Cell>{condition}</Table.Cell>
                    <Table.Cell className="font-semibold">{use}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Content>
        </Card.Root>

        {/* 🔽 Field types */}
        <FieldTypes />

        {/* 🔽 Complex examples */}
        <div className="mt-8 flex flex-col gap-2 border-t pt-8">
          <Text.h2 variant="heading-lg">Complex examples</Text.h2>
          <Text variant="body-md" className="text-muted-foreground max-w-3xl">
            How far FormLayout stretches: container-driven reflow, dense records, nested groups,
            conditional fields, a summary panel, editable line items, and editing in place.
          </Text>
        </div>
        <ComplexExamples />
      </Layout.Column>
    </Layout>
  );
}
