import { Link, Button, Layout, Badge } from "@tailor-platform/app-shell";
import { paths } from "../routes.generated";

const HomePage = () => {
  return (
    <Layout>
      <Layout.Header title="Welcome to App Shell" />
      <Layout.Column>
        <p className="astw:mb-4 astw:text-muted-foreground">
          This is the root page, defined at{" "}
          <code className="astw:bg-muted astw:px-2 astw:py-0.5 astw:rounded">
            src/pages/page.tsx
          </code>
        </p>
        <div className="astw:flex astw:gap-2">
          <Badge variant="success">Active</Badge>
          <Badge variant="outline-info">v1.0</Badge>
        </div>
        <div className="astw:flex astw:gap-3 astw:mt-6">
          <Button render={<Link to={paths.for("/dashboard")} />}>
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            render={<Link to={paths.for("/settings")} />}
          >
            Go to Settings
          </Button>
        </div>
      </Layout.Column>
    </Layout>
  );
};

export default HomePage;
