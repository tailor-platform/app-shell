import * as React from "react";
import { Card, Layout, Timeline, defineResource } from "@tailor-platform/app-shell";

type TimeLike = Date | number | string;

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

const projectStart = toMs("2025-01-01");
const projectEnd = toMs("2025-03-31");
const projectBoundaries = buildEvenBoundaries(projectStart, projectEnd, 6);
const projectTimeboxes = buildTimeboxes(projectBoundaries, (time) => (
  <span style={{ paddingInline: 8, fontSize: 12, color: "var(--muted-foreground)" }}>
    {time.toLocaleDateString("en", { month: "short", day: "numeric" })}
  </span>
));
const taskDependencies = [
  { from: "design", to: "backend" },
  { from: "backend", to: "frontend" },
  { from: "frontend", to: "testing" },
  { from: "testing", to: "deploy" },
];
const tasks = [
  { id: "design", label: "Design", start: "2025-01-01", end: "2025-01-20", color: "#3b82f6" },
  { id: "backend", label: "Backend", start: "2025-01-15", end: "2025-02-15", color: "#10b981" },
  { id: "frontend", label: "Frontend", start: "2025-02-01", end: "2025-03-01", color: "#f59e0b" },
  { id: "testing", label: "Testing", start: "2025-02-20", end: "2025-03-15", color: "#ef4444" },
  { id: "deploy", label: "Deploy", start: "2025-03-15", end: "2025-03-25", color: "#8b5cf6" },
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
              description="Basic timeline rows with dependency links and a viewport-owned axis."
            />
            <Card.Content>
              <div style={{ display: "flex", width: "100%" }}>
                <div style={{ width: 120, flexShrink: 0, paddingTop: 28 }}>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        fontSize: 14,
                      }}
                    >
                      {task.label}
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
                      linkDefaults={{ className: "astw:text-foreground/60", strokeWidth: 1.5 }}
                    >
                      {tasks.map((task, index) => (
                        <Timeline.Row
                          key={task.id}
                          height={40}
                          background={
                            index % 2 === 1 ? { style: { background: "var(--muted)" } } : null
                          }
                        >
                          <Timeline.Interval
                            id={task.id}
                            start={toMs(task.start)}
                            end={toMs(task.end)}
                            insetY={8}
                          >
                            <SolidBar color={task.color} />
                          </Timeline.Interval>
                        </Timeline.Row>
                      ))}

                      {taskDependencies.map((dependency) => (
                        <Timeline.Link
                          key={`${dependency.from}-${dependency.to}`}
                          from={dependency.from}
                          to={dependency.to}
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
