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

/**
 * Purchase-order fulfilment, built on the generic DocumentProgressCard — the
 * recommended recipe from the docs. Derives the percentage and decomposes
 * received into "kept" + "returned" in the consumer, keeping the card generic.
 */
const PurchaseOrderFulfilment = ({
  title = "Fulfilment rate",
  received,
  returned,
  yetToReceive,
  returnedCountsAsComplete = true,
}: {
  title?: string;
  received: number;
  returned: number;
  yetToReceive: number;
  returnedCountsAsComplete?: boolean;
}) => {
  const effectiveReturned = Math.min(Math.max(returned, 0), Math.max(received, 0));
  const total = Math.max(received, 0) + Math.max(yetToReceive, 0);
  const complete = returnedCountsAsComplete ? received : received - effectiveReturned;
  const percent = total > 0 ? Math.round((complete / total) * 100) : 0;

  return (
    <DocumentProgressCard
      title={title}
      percent={percent}
      total={total}
      segments={[
        { label: "Received items", value: received - effectiveReturned, color: "indigo" },
        { label: "Returned items", value: effectiveReturned, color: "pink" },
      ]}
      legend={[
        { label: "Received items", value: received, color: "indigo" },
        { label: "Returned items", value: returned, color: "pink" },
        { label: "Yet to receive", value: yetToReceive, color: "neutral" },
      ]}
    />
  );
};

const DocumentProgressPage = () => {
  return (
    <Layout>
      <Layout.Header title="Document Progress Card" />

      <Layout.Column>
        <h2 className="mb-1 text-lg font-semibold">Arbitrary status segments</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Domain-agnostic — any set of status segments plus an explicit percentage.
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

        <h2 className="mt-8 mb-1 text-lg font-semibold">Recipe: purchase-order fulfilment</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Received / returned / yet-to-receive, derived in the consumer (see{" "}
          <code>PurchaseOrderFulfilment</code> in this file and the component docs).
        </p>
        <Grid minChildWidth={320} gap={4}>
          {/* Matches the Figma baseline — nothing received yet */}
          <PurchaseOrderFulfilment received={0} returned={0} yetToReceive={40} />

          {/* Partially received with some returns */}
          <PurchaseOrderFulfilment received={12} returned={2} yetToReceive={28} />

          {/* Same data, but returns subtracted from progress */}
          <PurchaseOrderFulfilment
            title="Fulfilment rate (net of returns)"
            received={12}
            returned={2}
            yetToReceive={28}
            returnedCountsAsComplete={false}
          />

          {/* Fully received */}
          <PurchaseOrderFulfilment received={40} returned={0} yetToReceive={0} />
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
