import {
  Layout,
  Grid,
  DocumentProgressCard,
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
        <p className="mb-4">
          A presentational card for a transactional document's fulfilment state — a derived
          completion percentage, a stacked progress bar, and a received / returned / yet-to-receive
          legend.
        </p>
        <Grid minChildWidth={320} gap={4}>
          {/* Matches the Figma baseline — nothing received yet */}
          <DocumentProgressCard
            received={{ value: 0 }}
            returned={{ value: 0 }}
            yetToReceive={{ value: 40 }}
          />

          {/* Partially received with some returns */}
          <DocumentProgressCard
            received={{ value: 12 }}
            returned={{ value: 2 }}
            yetToReceive={{ value: 28 }}
          />

          {/* Same data, but returns subtracted from progress */}
          <DocumentProgressCard
            title="Fulfilment rate (net of returns)"
            received={{ value: 12 }}
            returned={{ value: 2 }}
            yetToReceive={{ value: 28 }}
            returnedCountsAsComplete={false}
          />

          {/* Fully received */}
          <DocumentProgressCard
            received={{ value: 40 }}
            returned={{ value: 0 }}
            yetToReceive={{ value: 0 }}
          />

          {/* Relabelled + custom colors for a different document lifecycle */}
          <DocumentProgressCard
            title="Shipment status"
            received={{ value: 30, label: "Shipped", color: "green" }}
            returned={{ value: 3, label: "Returned", color: "red" }}
            yetToReceive={{ value: 17, label: "Pending", color: "neutral" }}
          />

          {/* Heavily returned order */}
          <DocumentProgressCard
            title="Returns-heavy order"
            received={{ value: 50 }}
            returned={{ value: 20 }}
            yetToReceive={{ value: 10 }}
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
