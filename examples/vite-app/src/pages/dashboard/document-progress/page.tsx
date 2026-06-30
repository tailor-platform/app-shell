import {
  Layout,
  Grid,
  DocumentProgressCard,
  ProcurementFulfilmentProgressCard,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";

const GaugeIcon = () => (
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
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </svg>
);

const DocumentProgressPage = () => {
  return (
    <Layout>
      <Layout.Header title="Document Progress Card" />

      <Layout.Column>
        <h2 className="mb-1 text-lg font-semibold">DocumentProgressCard (generic)</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Domain-agnostic — arbitrary status segments plus an explicit percentage.
        </p>
        <Grid minChildWidth={320} gap={4}>
          {/* Arbitrary lifecycle: shipped / returned / pending */}
          <DocumentProgressCard
            title="Shipment status"
            percent={60}
            segments={[
              { label: "Shipped", value: 30, color: "green" },
              { label: "Returned", value: 3, color: "red" },
              { label: "Pending", value: 17, color: "neutral" },
            ]}
          />

          {/* More than three statuses — stretches to any workflow */}
          <DocumentProgressCard
            title="Order lifecycle"
            percent={45}
            segments={[
              { label: "Fulfilled", value: 45, color: "green" },
              { label: "Backordered", value: 20, color: "amber" },
              { label: "Cancelled", value: 10, color: "red" },
              { label: "Open", value: 25, color: "neutral" },
            ]}
          />

          {/* No percentage — just a composition bar + legend */}
          <DocumentProgressCard
            title="Invoice batch"
            segments={[
              { label: "Paid", value: 18, color: "green" },
              { label: "Overdue", value: 4, color: "red" },
              { label: "Draft", value: 8, color: "neutral" },
            ]}
          />

          {/* Unfilled remainder via total */}
          <DocumentProgressCard
            title="Approvals"
            percent={40}
            total={20}
            segments={[{ label: "Approved", value: 8, color: "indigo" }]}
          />
        </Grid>

        <h2 className="mt-8 mb-1 text-lg font-semibold">
          ProcurementFulfilmentProgressCard (opinionated)
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Purchase-order fulfilment — received / returned / yet-to-receive with a derived
          percentage.
        </p>
        <Grid minChildWidth={320} gap={4}>
          {/* Matches the Figma baseline — nothing received yet */}
          <ProcurementFulfilmentProgressCard
            received={{ value: 0 }}
            returned={{ value: 0 }}
            yetToReceive={{ value: 40 }}
          />

          {/* Partially received with some returns */}
          <ProcurementFulfilmentProgressCard
            received={{ value: 12 }}
            returned={{ value: 2 }}
            yetToReceive={{ value: 28 }}
          />

          {/* Same data, but returns subtracted from progress */}
          <ProcurementFulfilmentProgressCard
            title="Fulfilment rate (net of returns)"
            received={{ value: 12 }}
            returned={{ value: 2 }}
            yetToReceive={{ value: 28 }}
            returnedCountsAsComplete={false}
          />

          {/* Fully received */}
          <ProcurementFulfilmentProgressCard
            received={{ value: 40 }}
            returned={{ value: 0 }}
            yetToReceive={{ value: 0 }}
          />
        </Grid>
      </Layout.Column>
    </Layout>
  );
};

DocumentProgressPage.appShellPageProps = {
  meta: {
    title: "Document Progress",
    icon: <GaugeIcon />,
  },
} satisfies AppShellPageProps;

export default DocumentProgressPage;
