import { defineResource, Layout, MetricCard } from "@tailor-platform/app-shell";
import type { SVGProps } from "react";

export const ZapIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 14a1 1 0 0 1-.8-1.6l9-11A1 1 0 0 1 14 2v7h6a1 1 0 0 1 .8 1.6l-9 11A1 1 0 0 1 10 22v-7z" />
    </svg>
  );
};

const MetricCardDemoPage = () => (
  <Layout>
    <Layout.Header title="MetricCard Demo" />
    <Layout.Column>
      <p className="astw:text-sm astw:text-muted-foreground astw:mb-4">
        Dashboard KPI cards: title, value, optional trend and description.
      </p>
      <div className="astw:flex astw:flex-row astw:flex-wrap astw:gap-4">
        <div className="astw:min-w-[200px] astw:flex-1">
          <MetricCard
            title="Net total"
            value="$1,500.00"
            trend={{ direction: "up", value: "+5%" }}
            description="vs last month"
          />
        </div>
        <div className="astw:min-w-[200px] astw:flex-1">
          <MetricCard
            title="Discount total"
            value="$120.00"
            trend={{ direction: "down", value: "-2%" }}
            description="vs last month"
          />
        </div>
        <div className="astw:min-w-[200px] astw:flex-1">
          <MetricCard
            title="Orders"
            value="42"
            trend={{ direction: "neutral", value: "0%" }}
            description="this week"
            icon={<ZapIcon style={{ width: 14, height: 14 }} />}
          />
        </div>
        <div className="astw:min-w-[200px] astw:flex-1">
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
