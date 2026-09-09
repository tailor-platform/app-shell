import { defineResource, Layout, MetricCard } from "@tailor-platform/app-shell";
import { Zap as ZapIcon } from "lucide-react";

const MetricCardDemoPage = () => (
  <Layout>
    <Layout.Header title="MetricCard Demo" />
    <Layout.Column>
      <p className="text-sm text-muted-foreground mb-4">
        Dashboard KPI cards: title, value, optional trend and description.
      </p>
      <div className="flex flex-row flex-wrap gap-4">
        <div className="min-w-[200px] flex-1">
          <MetricCard
            title="Net total"
            value="$1,500.00"
            trend={{ direction: "up", value: "+5%" }}
            description="vs last month"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <MetricCard
            title="Discount total"
            value="$120.00"
            trend={{ direction: "down", value: "-2%" }}
            description="vs last month"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <MetricCard
            title="Orders"
            value="42"
            trend={{ direction: "neutral", value: "0%" }}
            description="this week"
            icon={<ZapIcon size={14} />}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <MetricCard title="Revenue (MTD)" value="$8,200" description="vs last month" />
        </div>
      </div>
    </Layout.Column>
  </Layout>
);

export const metricCardDemoResource = defineResource({
  path: "metric-card-demo",
  meta: { title: "MetricCard Demo" },
  component: MetricCardDemoPage,
});
