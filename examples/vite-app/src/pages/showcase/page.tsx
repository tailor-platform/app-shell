import {
  Link,
  Layout,
  Card,
  Badge,
  Button,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { Sparkles } from "lucide-react";

const sections = [
  {
    title: "Showcase routes moved from the old Next.js example",
    items: [
      ["Color tokens", "/showcase/colors"],
      ["Primitive Components", "/showcase/primitives"],
      ["Dropdown Components", "/showcase/dropdown"],
      ["Form Components", "/showcase/forms"],
      ["Zod + RHF Form", "/showcase/forms/zod-rhf"],
      ["CSV Importer", "/showcase/csv-importer"],
      ["MetricCard", "/showcase/metric-card"],
      ["ActivityCard", "/showcase/activity-card"],
      ["Layout Demos", "/showcase/layouts"],
      ["Grid", "/showcase/grid"],
      ["Timeline", "/showcase/timeline"],
    ],
  },
  {
    title: "Showcase absorbed by existing Vite pages",
    items: [
      ["DescriptionCard + ActionPanel", "/dashboard/orders/INV-1000"],
      ["DatePicker + DateRangePicker", "/date-picker"],
      ["DataTable", "/data-table"],
      ["Alert tokens", "/alert-tokens"],
    ],
  },
] as const;

const ShowcaseHomePage = () => {
  return (
    <Layout>
      <Layout.Header
        title="Showcase"
        actions={[
          <Badge key="migrated" variant="outline-info">
            Vite example
          </Badge>,
        ]}
      />
      <Layout.Column>
        <p className="mb-6 max-w-3xl text-muted-foreground">
          The old Next.js example was doing two jobs: framework integration and component showcase.
          Showcase lives here now. Next.js compatibility is covered separately by E2E smoke tests.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <Card.Root key={section.title}>
              <Card.Header title={section.title} />
              <Card.Content>
                <div className="flex flex-col gap-3">
                  {section.items.map(([label, to]) => (
                    <Button
                      key={to}
                      variant="outline"
                      className="justify-start"
                      render={<Link to={to} />}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </Card.Content>
            </Card.Root>
          ))}
        </div>
      </Layout.Column>
    </Layout>
  );
};

ShowcaseHomePage.appShellPageProps = {
  meta: {
    title: "Showcase",
    icon: <Sparkles size={16} />,
  },
} satisfies AppShellPageProps;

export default ShowcaseHomePage;
