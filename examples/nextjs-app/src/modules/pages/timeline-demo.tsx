import * as React from "react";
import { Card, Layout, Timeline, defineResource } from "@tailor-platform/app-shell";

type TimeLike = Date | number | string;
type LinkAnchor = "start" | "center" | "end";

type TaskSegment = {
  id: string;
  label: string;
  start: TimeLike;
  end: TimeLike;
  color: string;
};

type TaskRowData = {
  id: string;
  label: string;
  segments: TaskSegment[];
};

type TaskDependency = {
  from: string;
  to: string;
  fromAnchor?: LinkAnchor;
  toAnchor?: LinkAnchor;
};

const toMs = (value: TimeLike) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
    return new Date(value).getTime();
  }
  return value.getTime();
};

function buildEvenBoundaries(start: number, end: number, count: number) {
  return Array.from({ length: count + 1 }, (_, index) => start + ((end - start) * index) / count);
}

function buildTimeboxes(boundaries: number[], format: (time: Date) => React.ReactNode) {
  return boundaries.slice(0, -1).map((start, index) => ({
    key: index,
    start,
    end: boundaries[index + 1],
    label: format(new Date(start)),
  }));
}

function SolidBar({ label, color }: { label?: React.ReactNode; color: string }) {
  return (
    <div
      style={{
        height: "100%",
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        borderRadius: 8,
        background: color,
        color: "white",
        padding: "0 10px",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function TaskRow({ row, index }: { row: TaskRowData; index: number }) {
  return (
    <Timeline.Row
      key={row.id}
      height={40}
      background={index % 2 === 1 ? { style: { background: "var(--muted)" } } : null}
    >
      {row.segments.map((segment) => (
        <Timeline.Interval
          key={segment.id}
          id={segment.id}
          start={toMs(segment.start)}
          end={toMs(segment.end)}
          insetY={8}
        >
          <SolidBar label={segment.label} color={segment.color} />
        </Timeline.Interval>
      ))}
    </Timeline.Row>
  );
}

const projectStart = toMs("2025-01-01");
const projectEnd = toMs("2025-03-31");
const projectBoundaries = buildEvenBoundaries(projectStart, projectEnd, 6);
const projectTimeboxes = buildTimeboxes(projectBoundaries, (time) => (
  <span style={{ paddingInline: 8, fontSize: 12, color: "var(--muted-foreground)" }}>
    {time.toLocaleDateString("en", { month: "short", day: "numeric" })}
  </span>
));
const taskRows: TaskRowData[] = [
  {
    id: "design",
    label: "Design",
    segments: [
      {
        id: "design",
        label: "Design",
        start: "2025-01-01",
        end: "2025-01-20",
        color: "#3b82f6",
      },
    ],
  },
  {
    id: "backend",
    label: "Backend",
    segments: [
      {
        id: "backend",
        label: "API Build",
        start: "2025-01-15",
        end: "2025-02-15",
        color: "#10b981",
      },
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    segments: [
      {
        id: "frontend-foundation",
        label: "Foundation",
        start: "2025-02-01",
        end: "2025-02-20",
        color: "#f59e0b",
      },
    ],
  },
  {
    id: "documentation",
    label: "Documentation",
    segments: [
      {
        id: "documentation",
        label: "Docs",
        start: "2025-02-20",
        end: "2025-03-06",
        color: "#f97316",
      },
    ],
  },
  {
    id: "testing",
    label: "Testing",
    segments: [
      {
        id: "testing",
        label: "QA",
        start: "2025-02-20",
        end: "2025-03-15",
        color: "#ef4444",
      },
    ],
  },
  {
    id: "deploy",
    label: "Deploy",
    segments: [
      {
        id: "deploy",
        label: "Rollout",
        start: "2025-03-15",
        end: "2025-03-25",
        color: "#8b5cf6",
      },
    ],
  },
];
const taskDependencies: TaskDependency[] = [
  { from: "design", to: "backend" },
  { from: "backend", to: "frontend-foundation" },
  { from: "frontend-foundation", to: "documentation" },
  { from: "frontend-foundation", to: "testing" },
  { from: "documentation", to: "deploy" },
  { from: "testing", to: "deploy" },
];

const jobStart = toMs("2025-06-01T00:00:00");
const jobEnd = toMs("2025-06-01T00:10:00");
const jobBoundaries = buildEvenBoundaries(jobStart, jobEnd, 20);
const jobTimeboxes = buildTimeboxes(jobBoundaries, (time) => (
  <span style={{ paddingInline: 8, fontSize: 12, color: "var(--muted-foreground)" }}>
    {time.toLocaleTimeString("en", { minute: "2-digit", second: "2-digit" })}
  </span>
));
const jobs = [
  {
    id: "etl",
    label: "ETL Pipeline",
    start: "2025-06-01T00:00:30",
    end: "2025-06-01T00:03:45",
    color: "#3b82f6",
  },
  {
    id: "transform",
    label: "Transform",
    start: "2025-06-01T00:02:00",
    end: "2025-06-01T00:05:30",
    color: "#10b981",
  },
  {
    id: "load",
    label: "Load to DB",
    start: "2025-06-01T00:05:30",
    end: "2025-06-01T00:07:00",
    color: "#f59e0b",
  },
  {
    id: "notify",
    label: "Send Notification",
    start: "2025-06-01T00:07:00",
    end: "2025-06-01T00:07:30",
    color: "#8b5cf6",
  },
];

export const timelineDemoResource = defineResource({
  path: "timeline-demo",
  meta: {
    title: "Timeline Demo",
  },
  component: () => {
    return (
      <Layout>
        <Layout.Header title="Timeline Examples" />
        <Layout.Column>
          <Card.Root>
            <Card.Header
              title="Task Dependencies"
              description="Wrapped rows plus branching dependencies where Foundation fans out into Documentation and QA before rollout."
            />
            <Card.Content>
              <div style={{ display: "flex", width: "100%" }}>
                <div style={{ width: 120, flexShrink: 0, paddingTop: 28 }}>
                  {taskRows.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        fontSize: 14,
                      }}
                    >
                      {row.label}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <Timeline.Root start={projectStart} end={projectEnd}>
                    <Timeline.Viewport
                      axis={{
                        guides: projectBoundaries.map((at) => ({
                          at,
                          axisStyle: { background: "var(--border)" },
                          bodyStyle: { background: "var(--border)" },
                        })),
                        levels: [
                          {
                            kind: "spans",
                            items: projectTimeboxes,
                          },
                        ],
                      }}
                      linkDefaults={{
                        style: { color: "var(--muted-foreground)" },
                        strokeWidth: 1.5,
                      }}
                    >
                      {taskRows.map((row, index) => (
                        <TaskRow key={row.id} row={row} index={index} />
                      ))}

                      {taskDependencies.map((dependency) => (
                        <Timeline.Link
                          key={`${dependency.from}-${dependency.to}`}
                          from={dependency.from}
                          to={dependency.to}
                          fromAnchor={dependency.fromAnchor}
                          toAnchor={dependency.toAnchor}
                        />
                      ))}
                    </Timeline.Viewport>
                  </Timeline.Root>
                </div>
              </div>
            </Card.Content>
          </Card.Root>

          <Card.Root>
            <Card.Header
              title="Job Execution Timeline"
              description="Scrollable execution trace with a viewport-owned axis and explicit canvas width."
            />
            <Card.Content>
              <Timeline.Root start={jobStart} end={jobEnd}>
                <Timeline.Viewport
                  canvasWidth={1200}
                  axis={{
                    guides: jobBoundaries.map((at) => ({
                      at,
                      axisStyle: { background: "var(--border)" },
                      bodyStyle: { background: "var(--border)" },
                    })),
                    levels: [
                      {
                        kind: "spans",
                        items: jobTimeboxes,
                      },
                    ],
                  }}
                >
                  {jobs.map((job) => (
                    <Timeline.Row key={job.id} height={40}>
                      <Timeline.Interval
                        id={job.id}
                        start={toMs(job.start)}
                        end={toMs(job.end)}
                        insetY={8}
                      >
                        <SolidBar label={job.label} color={job.color} />
                      </Timeline.Interval>
                    </Timeline.Row>
                  ))}
                </Timeline.Viewport>
              </Timeline.Root>
            </Card.Content>
          </Card.Root>
        </Layout.Column>
      </Layout>
    );
  },
});
