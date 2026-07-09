import { Grid, MetricCard } from "@tailor-platform/app-shell";

export function GridMetricsExample() {
  return (
    <Grid columns={{ initial: 1, md: 2, xl: 4 }} gap={4}>
      <MetricCard title="Net total" value="$1,500" trend={{ direction: "up", value: "+5%" }} />
      <MetricCard title="Open orders" value="42" />
      <MetricCard title="Overdue" value="7" />
      <MetricCard title="Suppliers" value="18" />
    </Grid>
  );
}
