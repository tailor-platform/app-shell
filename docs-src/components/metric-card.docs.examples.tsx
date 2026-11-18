import { ShoppingCart } from "lucide-react";
import { Grid, MetricCard } from "@tailor-platform/app-shell";

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

export function TrendDirections() {
  return (
    <Grid minChildWidth={180} gap={4}>
      <MetricCard
        title="Revenue"
        value="$2,400"
        trend={{ direction: "up", value: "+12%" }}
        description="vs last month"
      />
      <MetricCard
        title="Costs"
        value="$800"
        trend={{ direction: "down", value: "-5%" }}
        description="vs last quarter"
      />
      <MetricCard title="Balance" value="$0" trend={{ direction: "neutral", value: "0%" }} />
    </Grid>
  );
}

export function WithIcon() {
  return (
    <MetricCard
      title="Total orders"
      value="142"
      icon={<ShoppingCart aria-hidden />}
      description="this week"
    />
  );
}
