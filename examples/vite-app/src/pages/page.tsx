import { Link, Button, Layout, Badge, AppShellPageProps } from "@tailor-platform/app-shell";
import { paths } from "../routes.generated";
import { labels, useT } from "../i18n-labels";
import { LayoutDashboard } from "lucide-react";

const HomePage = () => {
  const t = useT();
  return (
    <Layout>
      <Layout.Header title={t("pageTitle")} />
      <Layout.Column>
        <p className="mb-4 text-muted-foreground">
          {t("pageDescription")}{" "}
          <code className="bg-muted px-2 py-0.5 rounded">src/pages/page.tsx</code>
        </p>
        <p className="mb-4">{t("greeting", { name: "World" })}</p>
        <div className="flex gap-2">
          <Badge variant="success">Active</Badge>
          <Badge variant="outline-info">v1.0</Badge>
        </div>
        <div className="flex gap-3 mt-6">
          <Button render={<Link to={paths.for("/dashboard")} />}>Go to Dashboard</Button>
          <Button variant="outline" render={<Link to={paths.for("/settings")} />}>
            Go to Settings
          </Button>
        </div>
      </Layout.Column>
    </Layout>
  );
};

HomePage.appShellPageProps = {
  meta: {
    title: labels.t("navRoot"),
    icon: <LayoutDashboard />,
  },
} satisfies AppShellPageProps;

export default HomePage;
