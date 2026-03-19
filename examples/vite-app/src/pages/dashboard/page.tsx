import {
  Link,
  Button,
  Layout,
  Badge,
  Tooltip,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { paths } from "../../routes.generated";

const ZapIcon = () => (
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
    <path d="M4 14a1 1 0 0 1-.8-1.6l9-11A1 1 0 0 1 14 2v7h6a1 1 0 0 1 .8 1.6l-9 11A1 1 0 0 1 10 22v-7z" />
  </svg>
);

const DashboardPage = () => {
  return (
    <Layout>
      <Layout.Header
        title="Dashboard"
        actions={[
          <Tooltip.Root key="tooltip">
            <Tooltip.Trigger render={<Badge variant="outline-success" />}>
              System Online
            </Tooltip.Trigger>
            <Tooltip.Content>All services are operational</Tooltip.Content>
          </Tooltip.Root>,
        ]}
      />
      <Layout.Column>
        <p className="mb-4">
          Welcome to the file-based routing demo! This page is located at{" "}
          <code className="bg-muted px-2 py-0.5 rounded">src/pages/dashboard/page.tsx</code>
        </p>
        <div className="flex gap-3">
          <Button render={<Link to={paths.for("/dashboard/orders")} />}>View Orders</Button>
          <Button variant="outline" render={<Link to={paths.for("/settings")} />}>
            Go to Settings
          </Button>
        </div>
      </Layout.Column>
    </Layout>
  );
};

DashboardPage.appShellPageProps = {
  meta: {
    title: "Dashboard",
    icon: <ZapIcon />,
  },
} satisfies AppShellPageProps;

export default DashboardPage;
