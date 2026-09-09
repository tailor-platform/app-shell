import { useState, type ReactNode } from "react";
import {
  defineResource,
  Layout,
  Card,
  Badge,
  Button,
  Grid,
  MetricCard,
  type GridProps,
} from "@tailor-platform/app-shell";

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2
    className="text-sm font-semibold text-muted-foreground"
    style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}
  >
    {children}
  </h2>
);

// 🧪 Dummy Data: Replace with real data later
const kpis = [
  {
    title: "Open Orders",
    value: "1,284",
    trend: { direction: "up", value: "+8.2%" },
    description: "vs last month",
  },
  {
    title: "Revenue (MTD)",
    value: "$642,108",
    trend: { direction: "up", value: "+3.1%" },
    description: "vs last month",
  },
  {
    title: "Avg. Fulfillment",
    value: "1.9 days",
    trend: { direction: "down", value: "−0.3d" },
    description: "vs last month",
  },
  {
    title: "Backorders",
    value: "37",
    trend: { direction: "down", value: "−12" },
    description: "this week",
  },
] as const;

// 🧪 Dummy Data: Replace with real data later
const warehouses = [
  { id: "WH-OSA", name: "Osaka DC", region: "Kansai", utilization: "82%", status: "Operational" },
  { id: "WH-NRT", name: "Narita Hub", region: "Kanto", utilization: "67%", status: "Operational" },
  {
    id: "WH-FUK",
    name: "Fukuoka DC",
    region: "Kyushu",
    utilization: "91%",
    status: "Near capacity",
  },
  {
    id: "WH-SPK",
    name: "Sapporo DC",
    region: "Hokkaido",
    utilization: "54%",
    status: "Operational",
  },
  { id: "WH-NGO", name: "Nagoya DC", region: "Chubu", utilization: "73%", status: "Operational" },
];

const GroupLabel = ({ children }: { children: ReactNode }) => (
  <span
    className="text-xs font-semibold text-muted-foreground"
    style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}
  >
    {children}
  </span>
);

// ✅ Reusable Component: a labelled range slider with a live value readout.
function SliderControl({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5" style={{ opacity: disabled ? 0.4 : 1 }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs font-medium text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "hsl(var(--primary))", cursor: "pointer" }}
      />
    </div>
  );
}

// ✅ Reusable Component: a segmented control built from Buttons (for enum props).
function SegmentedControl<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col">
        <span className="text-xs font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Button
            key={opt}
            size="xs"
            variant={opt === value ? "default" : "outline"}
            onClick={() => onChange(opt)}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}

type SizingMode = "columns" | "auto-fit" | "fixed";

// 🔽 Interactive playground — tweak every Grid prop and see it live.
function GridPlayground() {
  const [sizingMode, setSizingMode] = useState<SizingMode>("columns");
  const [columns, setColumns] = useState(3);
  const [minChildWidth, setMinChildWidth] = useState(200);
  const [fixedWidth, setFixedWidth] = useState(96);
  const [gap, setGap] = useState(4);
  const [align, setAlign] = useState<NonNullable<GridProps["align"]>>("stretch");
  const [justify, setJustify] = useState<NonNullable<GridProps["justify"]>>("start");
  const [itemCount, setItemCount] = useState(7);

  const fixedTemplate = `repeat(${columns}, ${fixedWidth}px)`;
  const gridProps: GridProps = {
    gap,
    align,
    justify,
    ...(sizingMode === "auto-fit"
      ? { minChildWidth }
      : sizingMode === "fixed"
        ? { columns: fixedTemplate }
        : { columns }),
  };

  const sizingLine =
    sizingMode === "auto-fit"
      ? `  minChildWidth={${minChildWidth}}`
      : sizingMode === "fixed"
        ? `  columns="${fixedTemplate}"`
        : `  columns={${columns}}`;

  const code = [
    "<Grid",
    sizingLine,
    `  gap={${gap}}`,
    align !== "stretch" ? `  align="${align}"` : null,
    justify !== "start" ? `  justify="${justify}"` : null,
    ">",
    "  {/* …items… */}",
    "</Grid>",
  ]
    .filter(Boolean)
    .join("\n");

  const tileClass =
    "flex items-center justify-center rounded-md bg-muted text-sm font-medium text-muted-foreground";

  return (
    <Grid columns={{ initial: 1, lg: 2 }} gap={6}>
      {/* Controls */}
      <Card.Root>
        <Card.Header title="Controls" description="Adjust props and watch the grid update" />
        <Card.Content className="flex flex-col gap-4">
          <GroupLabel>Grid props</GroupLabel>
          <SegmentedControl<SizingMode>
            label="Sizing mode"
            hint="columns = fluid 1fr · auto-fit = fill by min width · fixed = fixed-width tracks"
            value={sizingMode}
            options={["columns", "auto-fit", "fixed"]}
            onChange={setSizingMode}
          />
          <SliderControl
            label="columns"
            hint="Number of equal columns"
            value={columns}
            min={1}
            max={8}
            onChange={setColumns}
            disabled={sizingMode === "auto-fit"}
          />
          <SliderControl
            label="minChildWidth"
            hint="Min width per item; the grid fits as many as possible per row"
            value={minChildWidth}
            min={120}
            max={360}
            step={10}
            unit="px"
            onChange={setMinChildWidth}
            disabled={sizingMode !== "auto-fit"}
          />
          <SliderControl
            label="fixed column width"
            hint="Width of each track in 'fixed' mode (leaves free space for justify)"
            value={fixedWidth}
            min={56}
            max={160}
            step={8}
            unit="px"
            onChange={setFixedWidth}
            disabled={sizingMode !== "fixed"}
          />
          <SliderControl
            label="gap"
            hint="Spacing between cells in 4px units (gap=4 → 16px)"
            value={gap}
            min={0}
            max={12}
            onChange={setGap}
          />
          <SegmentedControl<NonNullable<GridProps["align"]>>
            label="align (align-items)"
            hint="Vertical alignment of each item within its (taller) row"
            value={align}
            options={["stretch", "start", "center", "end", "baseline"]}
            onChange={setAlign}
          />
          {/* The preview rows are fixed taller than the tiles (via gridAutoRows
              below), so the alignment of the equal-height tiles is visible. */}
          <SegmentedControl<NonNullable<GridProps["justify"]>>
            label="justify (justify-content)"
            hint="Distributes columns in leftover space — switch Sizing mode to 'fixed' to see it."
            value={justify}
            options={["start", "center", "end", "between", "around", "evenly"]}
            onChange={setJustify}
          />

          <div className="mt-2 flex flex-col gap-4">
            <GroupLabel>Preview settings (demo only — not a Grid prop)</GroupLabel>
            <SliderControl
              label="preview tiles"
              hint="How many placeholder tiles to render in the preview"
              value={itemCount}
              min={1}
              max={16}
              onChange={setItemCount}
            />
          </div>
        </Card.Content>
      </Card.Root>

      {/* Live preview + generated code */}
      <div className="flex flex-col gap-4">
        <Card.Root>
          <Card.Header title="Preview" />
          <Card.Content style={{ overflowX: "auto" }}>
            {/* gridAutoRows makes every row 5rem tall — taller than the 2.5rem
                tiles — so `align` has vertical room to position them. */}
            <Grid {...gridProps} style={{ gridAutoRows: "5rem" }}>
              {Array.from({ length: itemCount }, (_, i) => (
                <div key={i} className={tileClass} style={{ minHeight: "2.5rem" }}>
                  {i + 1}
                </div>
              ))}
            </Grid>
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header title="Generated JSX" />
          <Card.Content>
            <pre
              className="overflow-x-auto rounded-md bg-muted p-4 text-xs"
              style={{ lineHeight: 1.6 }}
            >
              <code>{code}</code>
            </pre>
          </Card.Content>
        </Card.Root>
      </div>
    </Grid>
  );
}

// 🔽 Static, side-by-side illustration of what `flow` (grid-auto-flow) does.
const flowCellBase = "flex items-center justify-center rounded-md text-xs font-medium";
const plainCell = `${flowCellBase} bg-muted text-muted-foreground`;
const wideCell = `${flowCellBase} bg-primary text-primary-foreground`;
const cellStyle = { minHeight: "2.25rem" };

const plainTile = (n: number) => (
  <div key={n} className={plainCell} style={cellStyle}>
    {n}
  </div>
);
const wideTile = (n: number) => (
  <Grid.Item key={n} colSpan={2} className={wideCell} style={cellStyle}>
    {n} · span 2
  </Grid.Item>
);

const FlowExample = ({
  label,
  caption,
  children,
}: {
  label: string;
  caption: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <span className="text-xs font-medium">{label}</span>
    {children}
    <span className="text-xs text-muted-foreground">{caption}</span>
  </div>
);

function FlowSection() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        <code>flow</code> (grid-auto-flow) controls two separate things: the{" "}
        <strong>direction</strong> items are placed, and whether gaps are{" "}
        <strong>backfilled</strong>. Most layouts never need it — the default <code>row</code> is
        almost always right.
      </p>

      <div className="flex flex-col gap-3">
        <GroupLabel>Direction — row vs. column</GroupLabel>
        <Grid columns={{ initial: 1, md: 2 }} gap={6}>
          <FlowExample
            label={'flow="row" (default)'}
            caption="Fills left → right, then wraps to the next row."
          >
            <Grid columns={3} gap={2} flow="row">
              {[1, 2, 3, 4, 5, 6].map(plainTile)}
            </Grid>
          </FlowExample>
          <FlowExample
            label={'flow="column"'}
            caption="Fills top → bottom, then moves to the next column."
          >
            <Grid columns={3} rows={2} gap={2} flow="column">
              {[1, 2, 3, 4, 5, 6].map(plainTile)}
            </Grid>
          </FlowExample>
        </Grid>
      </div>

      <div className="flex flex-col gap-3">
        <GroupLabel>Packing — row vs. row-dense (with spanning items)</GroupLabel>
        <Grid columns={{ initial: 1, md: 2 }} gap={6}>
          <FlowExample
            label={'flow="row"'}
            caption="Item 2 can't fit beside item 1, so it wraps — leaving a gap (top-right)."
          >
            <Grid columns={3} gap={2} flow="row">
              {wideTile(1)}
              {wideTile(2)}
              {[3, 4, 5].map(plainTile)}
            </Grid>
          </FlowExample>
          <FlowExample
            label={'flow="row-dense"'}
            caption="Dense packing backfills that gap — item 3 jumps up to fill it."
          >
            <Grid columns={3} gap={2} flow="row-dense">
              {wideTile(1)}
              {wideTile(2)}
              {[3, 4, 5].map(plainTile)}
            </Grid>
          </FlowExample>
        </Grid>
      </div>
    </div>
  );
}

const GridDemoPage = () => (
  <Layout>
    <Layout.Header title="Grid Demo" />
    <Layout.Column>
      <p className="text-sm text-muted-foreground mb-6">
        A generic CSS-Grid layout primitive: equal or custom-width columns, responsive reflow, gap
        control, auto-fit, and <code>Grid.Item</code> spanning.
      </p>

      <div className="flex flex-col gap-16">
        {/* 🔽 Responsive KPI grid — reflows 1 → 2 → 4 columns */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Responsive columns · 1 → 2 → 4</SectionTitle>
          <Grid columns={{ initial: 1, sm: 2, lg: 4 }} gap={4}>
            {kpis.map((kpi) => (
              <MetricCard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                trend={kpi.trend}
                description={kpi.description}
              />
            ))}
          </Grid>
        </section>

        {/* 🔽 Auto-fit gallery — as many ≥240px cards as fit, no breakpoints */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Auto-fit · minChildWidth={240}</SectionTitle>
          <Grid minChildWidth={240} gap={4}>
            {warehouses.map((wh) => (
              <Card.Root key={wh.id}>
                <Card.Header title={wh.name} description={`${wh.id} · ${wh.region}`} />
                <Card.Content className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Utilization {wh.utilization}
                  </span>
                  <Badge
                    variant={wh.status === "Near capacity" ? "outline-warning" : "outline-success"}
                  >
                    {wh.status}
                  </Badge>
                </Card.Content>
              </Card.Root>
            ))}
          </Grid>
        </section>

        {/* 🔽 Custom column widths — fixed sidebar + fluid main */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Custom widths · &quot;280px 1fr&quot;</SectionTitle>
          <Grid columns="280px 1fr" gap={6}>
            <Card.Root>
              <Card.Header title="Filters" description="Fixed 280px column" />
              <Card.Content className="text-sm text-muted-foreground">
                Region, status, and date-range controls would live here.
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Header title="Results" description="Flexible 1fr column" />
              <Card.Content className="text-sm text-muted-foreground">
                The main content area expands to fill the remaining space.
              </Card.Content>
            </Card.Root>
          </Grid>
        </section>

        {/* 🔽 Spanning with Grid.Item */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Spanning · Grid.Item colSpan / rowSpan</SectionTitle>
          <Grid columns={4} gap={4}>
            <Grid.Item colSpan={{ initial: "full", md: 2 }}>
              <Card.Root className="h-full">
                <Card.Header title="Featured" description="colSpan 2" />
                <Card.Content className="text-sm text-muted-foreground">
                  Spans two columns from the md breakpoint.
                </Card.Content>
              </Card.Root>
            </Grid.Item>
            <Card.Root>
              <Card.Content className="pt-6 text-sm text-muted-foreground">
                Single cell
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Content className="pt-6 text-sm text-muted-foreground">
                Single cell
              </Card.Content>
            </Card.Root>
            <Grid.Item colSpan="full">
              <Card.Root>
                <Card.Content className="pt-6 text-sm text-muted-foreground">
                  Full-width footer row (colSpan=&quot;full&quot;)
                </Card.Content>
              </Card.Root>
            </Grid.Item>
          </Grid>
        </section>

        {/* 🔽 Understanding flow */}
        <section className="flex flex-col gap-4">
          <SectionTitle>Understanding flow (grid-auto-flow)</SectionTitle>
          <FlowSection />
        </section>

        {/* 🔽 Interactive playground */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Interactive playground</SectionTitle>
          <p className="text-sm text-muted-foreground">
            Change any prop below and watch the grid react in real time. The generated JSX updates
            to match.
          </p>
          <GridPlayground />
        </section>
      </div>
    </Layout.Column>
  </Layout>
);

export const gridDemoResource = defineResource({
  path: "grid-demo",
  meta: { title: "Grid Demo" },
  component: GridDemoPage,
});
