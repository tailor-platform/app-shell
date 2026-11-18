import { DocumentProgressCard } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <DocumentProgressCard
      title="Shipment status"
      percent={60}
      segments={[
        { label: "Shipped", value: 30, color: "green" },
        { label: "Returned", value: 3, color: "red" },
        { label: "Pending", value: 17, color: "neutral" },
      ]}
    />
  );
}

export function CustomLegend() {
  return (
    <DocumentProgressCard
      title="Receiving status"
      percent={30}
      total={40}
      segments={[
        { label: "Net received", value: 10, color: "indigo" },
        { label: "Returned", value: 2, color: "pink" },
      ]}
      legend={[
        { label: "Received items", value: 12, color: "indigo" },
        { label: "Returned items", value: 2, color: "pink" },
        { label: "Yet to receive", value: 28, color: "neutral" },
      ]}
    />
  );
}

export function PurchaseOrderFulfilment() {
  function Fulfilment({
    received,
    returned,
    yetToReceive,
    returnedCountsAsComplete = true,
  }: {
    received: number;
    returned: number;
    yetToReceive: number;
    returnedCountsAsComplete?: boolean;
  }) {
    // Returned is a subset of received; clamp so the breakdown cannot exceed it.
    const effectiveReturned = Math.min(Math.max(returned, 0), Math.max(received, 0));
    const total = Math.max(received, 0) + Math.max(yetToReceive, 0);
    const complete = returnedCountsAsComplete ? received : received - effectiveReturned;
    const percent = total > 0 ? Math.round((complete / total) * 100) : 0;

    return (
      <DocumentProgressCard
        title={
          returnedCountsAsComplete ? "Returns count as fulfilled" : "Returns reduce fulfilment"
        }
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
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Fulfilment received={12} returned={2} yetToReceive={28} />
      <Fulfilment received={12} returned={2} yetToReceive={28} returnedCountsAsComplete={false} />
    </div>
  );
}
