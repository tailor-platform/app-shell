import { Link, Button, Layout, Badge } from "@tailor-platform/app-shell";
import { paths } from "../routes.generated";

const HomePage = () => {
  return (
    <Layout>
      <Layout.Header title="Welcome to App Shell" />
      <Layout.Column>
        <p className="mb-4 text-muted-foreground">
          This is the root page, defined at{" "}
          <code className="bg-muted px-2 py-0.5 rounded">src/pages/page.tsx</code>
        </p>
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

export default HomePage;
