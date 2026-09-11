import { Button, Layout, Spinner, type AppShellPageProps } from "@tailor-platform/app-shell";

const SpinnerIcon = () => (
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
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

const SpinnerPage = () => {
  return (
    <Layout>
      <Layout.Header title="Spinner" />
      <Layout.Column>
        <p className="mb-6 max-w-2xl text-muted-foreground">
          Shared loading indicator exported from{" "}
          <code className="bg-muted rounded px-1.5 py-0.5">@tailor-platform/app-shell</code>. This
          page just gives it a few sizes and contexts so you can eyeball the motion.
        </p>

        <section className="mb-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sizes
          </h3>
          <div className="flex flex-wrap items-center gap-6 rounded-lg border p-4">
            <Spinner aria-label="Loading extra small" size="xs" />
            <Spinner aria-label="Loading small" size="sm" />
            <Spinner aria-label="Loading default" />
            <Spinner aria-label="Loading large" size="lg" />
          </div>
        </section>

        <section className="mb-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Color inherits from text
          </h3>
          <div className="flex flex-wrap items-center gap-6 rounded-lg border p-4 text-muted-foreground">
            <Spinner aria-label="Loading muted" />
            <div className="text-primary">
              <Spinner aria-label="Loading primary" />
            </div>
            <div className="text-destructive">
              <Spinner aria-label="Loading destructive" />
            </div>
            <div className="text-status-completed">
              <Spinner aria-label="Loading success" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Inline usage
          </h3>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <Button disabled>
              <Spinner aria-hidden />
              Saving
            </Button>
            <Button variant="outline" disabled>
              <Spinner aria-hidden />
              Syncing
            </Button>
          </div>
        </section>
      </Layout.Column>
    </Layout>
  );
};

SpinnerPage.appShellPageProps = {
  meta: {
    title: "Spinner",
    icon: <SpinnerIcon />,
  },
} satisfies AppShellPageProps;

export default SpinnerPage;
