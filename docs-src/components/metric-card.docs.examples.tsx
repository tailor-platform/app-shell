import { MetricCard } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <MetricCard
      title="Net total payment"
      value="$1,500.00"
      trend={{ direction: "up", value: "+5%" }}
      description="vs last month"
    />
  );
}
