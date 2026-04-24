import {
  defineResource,
  Layout,
  ActivityCard,
  Badge,
  Button,
  Link,
} from "@tailor-platform/app-shell";

export const activityCardDemoActivities = [
  {
    id: "1",
    actor: { name: "Hanna" },
    description: "changed the status from DRAFT to CONFIRMED",
    timestamp: new Date("2025-03-21T09:00:00"),
  },
  {
    id: "2",
    actor: { name: "Pradeep Kumar" },
    description: "created this PO",
    timestamp: new Date("2025-03-21T15:16:00"),
  },
  {
    id: "3",
    actor: { name: "Pradeep Kumar" },
    description: "added a note",
    timestamp: new Date("2025-03-21T15:16:00"),
  },
  {
    id: "4",
    actor: { name: "Hanna" },
    description: "updated delivery date",
    timestamp: new Date("2025-03-20T14:00:00"),
  },
  {
    id: "5",
    actor: { name: "Pradeep Kumar" },
    description: "created this PO",
    timestamp: new Date("2025-03-20T15:16:00"),
  },
  {
    id: "6",
    description: "sent confirmation email",
    timestamp: new Date("2025-03-20T10:00:00"),
  },
  {
    id: "7",
    actor: { name: "Hanna" },
    description: "approved the order",
    timestamp: new Date("2025-03-19T11:30:00"),
  },
  {
    id: "8",
    actor: { name: "Pradeep Kumar" },
    description: "added a note",
    timestamp: new Date("2025-03-19T09:00:00"),
  },
];

// Compound API demo data (mixed kinds like supplier-portal)
interface CompoundDemoItem {
  id: string;
  timestamp: Date;
  kind: "update" | "approval";
  message?: string;
  label?: string;
  reason?: string;
}

const compoundDemoActivities: CompoundDemoItem[] = [
  {
    id: "c1",
    timestamp: new Date("2025-03-21T09:00:00"),
    kind: "approval",
    label: "Approved",
  },
  {
    id: "c2",
    timestamp: new Date("2025-03-21T08:00:00"),
    kind: "update",
    message: "Updated delivery schedule",
  },
  {
    id: "c3",
    timestamp: new Date("2025-03-20T15:00:00"),
    kind: "approval",
    label: "Rejected",
    reason: "Missing required documents",
  },
  {
    id: "c4",
    timestamp: new Date("2025-03-20T10:00:00"),
    kind: "update",
    message: "Submitted for review",
  },
  {
    id: "c5",
    timestamp: new Date("2025-03-20T09:00:00"),
    kind: "update",
    message: "Assigned to procurement team",
  },
  {
    id: "c6",
    timestamp: new Date("2025-03-19T14:00:00"),
    kind: "update",
    message: "Created purchase order",
  },
];

// Filled-circle icons that match Avatar's visual style (28×28 with bg)
const ApprovedIcon = () => (
  <div
    style={{
      width: 28,
      height: 28,
      borderRadius: "50%",
      backgroundColor: "var(--primary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </div>
);

const RejectedIcon = () => (
  <div
    style={{
      width: 28,
      height: 28,
      borderRadius: "50%",
      backgroundColor: "var(--destructive)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </div>
);

function formatDate(ts: Date): string {
  return ts.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const ActivityCardDemoPage = () => (
  <Layout>
    <Layout.Header title="ActivityCard Demo" />
    <Layout.Column>
      <p style={{ color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
        Timeline of recent activities on a document (e.g. PO, SO, GR). Click &quot;N more
        activities&quot; to open the full list in a dialog.
      </p>
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {/* Standalone API (pre-assembled) */}
        <div style={{ maxWidth: 360, flex: "1 1 320px" }}>
          <h2
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              color: "var(--muted-foreground)",
            }}
          >
            Standalone API
          </h2>
          <ActivityCard
            title="Updates"
            maxVisible={6}
            overflowLabel="more"
            groupBy="day"
            items={activityCardDemoActivities}
          />
        </div>

        {/* Compound API (custom rendering) */}
        <div style={{ maxWidth: 360, flex: "1 1 320px" }}>
          <h2
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              color: "var(--muted-foreground)",
            }}
          >
            Compound API
          </h2>
          <ActivityCard.Root items={compoundDemoActivities} title="アップデート" groupBy="day">
            <ActivityCard.Items<CompoundDemoItem>>
              {(item) =>
                item.kind === "approval" ? (
                  <ActivityCard.Item
                    key={item.id}
                    indicator={item.label === "Rejected" ? <RejectedIcon /> : <ApprovedIcon />}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>{item.label}</p>
                      <Badge variant={item.label === "Rejected" ? "error" : "default"}>
                        {item.label === "Rejected" ? "Action required" : "Complete"}
                      </Badge>
                    </div>
                    {item.reason && (
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--muted-foreground)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.reason}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {formatDate(item.timestamp)}
                    </p>
                    {item.label === "Rejected" && (
                      <div style={{ marginTop: "0.25rem" }}>
                        <Button size="xs" variant="outline">
                          Resubmit
                        </Button>
                      </div>
                    )}
                  </ActivityCard.Item>
                ) : (
                  <ActivityCard.Item key={item.id}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>{item.message}</p>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {formatDate(item.timestamp)}
                    </p>
                    {item.message === "Updated delivery schedule" && (
                      <Link
                        to="#"
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--primary)",
                          textDecoration: "underline",
                        }}
                      >
                        View changes
                      </Link>
                    )}
                    {item.message === "Assigned to procurement team" && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.25rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        <Badge variant="neutral">procurement</Badge>
                        <Badge variant="outline-info">team-alpha</Badge>
                      </div>
                    )}
                  </ActivityCard.Item>
                )
              }
            </ActivityCard.Items>
          </ActivityCard.Root>
        </div>
      </div>
    </Layout.Column>
  </Layout>
);

export const activityCardDemoResource = defineResource({
  path: "activity-card-demo",
  meta: { title: "ActivityCard Demo" },
  component: ActivityCardDemoPage,
});
