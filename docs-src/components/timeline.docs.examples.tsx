import { Text, Timeline } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Timeline.Root
      start={0}
      end={100}
      className="overflow-hidden rounded-md border border-border bg-background"
    >
      <Timeline.Viewport
        axis={{
          className: "border-b border-border bg-muted",
          guides: [0, 50, 100].map((at) => ({
            at,
            axisClassName: "bg-border",
            bodyClassName: "bg-border",
          })),
          levels: [
            {
              kind: "spans",
              items: [
                { start: 0, end: 50, label: "Phase 1" },
                { start: 50, end: 100, label: "Phase 2" },
              ],
            },
          ],
        }}
      >
        <Timeline.Row height={40} background={{ className: "bg-blue-500/5" }}>
          <Timeline.Interval start={10} end={35} insetY={4}>
            <div className="flex h-full items-center justify-center rounded-md bg-blue-600 text-label-md text-white">
              Planning
            </div>
          </Timeline.Interval>
        </Timeline.Row>
      </Timeline.Viewport>
    </Timeline.Root>
  );
}

export function HorizontalScrolling() {
  const tasks = [
    { name: "Planning", start: 5, end: 25, color: "bg-blue-600" },
    { name: "Implementation", start: 30, end: 70, color: "bg-emerald-700" },
    { name: "Release", start: 80, end: 98, color: "bg-violet-600" },
  ];

  return (
    <div className="space-y-3">
      <Text.p>Scroll horizontally to see Release at the far end of the fixed-width canvas.</Text.p>
      <Timeline.Root
        start={0}
        end={100}
        className="max-w-xl overflow-hidden rounded-md border border-border bg-background"
      >
        <Timeline.Viewport
          canvasWidth={1400}
          axis={{
            className: "border-b border-border bg-muted",
            guides: [25, 50, 75].map((at) => ({
              at,
              axisClassName: "bg-border",
              bodyClassName: "bg-border",
            })),
            levels: [
              {
                kind: "spans",
                items: [
                  { start: 0, end: 25, label: "Week 1" },
                  { start: 25, end: 50, label: "Week 2" },
                  { start: 50, end: 75, label: "Week 3" },
                  { start: 75, end: 100, label: "Week 4" },
                ],
              },
            ],
          }}
        >
          {tasks.map((task, index) => (
            <Timeline.Row
              key={task.name}
              height={44}
              className="border-b border-border last:border-b-0"
              background={index % 2 === 1 ? { className: "bg-blue-500/10" } : undefined}
            >
              <Timeline.Interval start={task.start} end={task.end} insetY={6}>
                <div className={`flex h-full items-center rounded px-3 text-white ${task.color}`}>
                  {task.name}
                </div>
              </Timeline.Interval>
            </Timeline.Row>
          ))}
        </Timeline.Viewport>
      </Timeline.Root>
    </div>
  );
}

export function StickyAxis() {
  const colors = ["bg-blue-600", "bg-emerald-700", "bg-amber-700", "bg-violet-600", "bg-rose-600"];
  const tasks = Array.from({ length: 10 }, (_, index) => ({
    name: `Task ${index + 1}`,
    start: 5 + index * 3,
    end: 45 + index * 4,
    color: colors[index % colors.length],
  }));

  return (
    <div className="space-y-3">
      <Text.p>
        Scroll inside the timeline. The sprint labels stay at the top while the task rows move.
      </Text.p>
      <Timeline.Root
        start={0}
        end={100}
        className="overflow-hidden rounded-md border border-border bg-background"
      >
        <Timeline.Viewport
          stickyAxis
          style={{ height: 220, overflowY: "auto" }}
          axis={{
            className: "border-b border-border bg-muted",
            guides: [{ at: 50, axisClassName: "bg-border", bodyClassName: "bg-border" }],
            levels: [
              {
                kind: "spans",
                items: [
                  { start: 0, end: 50, label: "Sprint 1" },
                  { start: 50, end: 100, label: "Sprint 2" },
                ],
              },
            ],
          }}
        >
          {tasks.map((task, index) => (
            <Timeline.Row
              key={task.name}
              height={42}
              className="border-b border-border last:border-b-0"
              background={index % 2 === 1 ? { className: "bg-blue-500/10" } : undefined}
            >
              <Timeline.Interval start={task.start} end={task.end} insetY={5}>
                <div className={`flex h-full items-center rounded px-3 text-white ${task.color}`}>
                  {task.name}
                </div>
              </Timeline.Interval>
            </Timeline.Row>
          ))}
        </Timeline.Viewport>
      </Timeline.Root>
    </div>
  );
}

export function BackgroundBandsAndMarkers() {
  return (
    <div className="space-y-3">
      <Text.p>The shaded release freeze spans days 60–80. Today is marked at day 45.</Text.p>
      <Timeline.Root
        start={0}
        end={100}
        className="overflow-hidden rounded-md border border-border bg-background"
      >
        <Timeline.Viewport
          axis={{
            className: "border-b border-border bg-muted",
            guides: [20, 40, 60, 80].map((at) => ({
              at,
              axisClassName: "bg-border",
              bodyClassName: "bg-border",
            })),
            levels: [
              {
                kind: "spans",
                items: [
                  { start: 0, end: 60, label: "Development" },
                  { start: 60, end: 80, label: "Release freeze" },
                  { start: 80, end: 100, label: "Release" },
                ],
              },
            ],
          }}
          decorations={{
            bands: [{ start: 60, end: 80, className: "bg-amber-500/15" }],
            markers: [{ at: 45, color: "#e11d48", label: "Today", placement: "both" }],
          }}
        >
          <Timeline.Row height={52} className="border-b border-border">
            <Timeline.Interval start={10} end={55} insetY={12}>
              <div className="flex h-full items-center rounded bg-emerald-700 px-3 text-white">
                Build
              </div>
            </Timeline.Interval>
          </Timeline.Row>
          <Timeline.Row height={52} background={{ className: "bg-blue-500/5" }}>
            <Timeline.Interval start={65} end={95} insetY={12}>
              <div className="flex h-full items-center rounded bg-violet-600 px-3 text-white">
                Verify and release
              </div>
            </Timeline.Interval>
          </Timeline.Row>
        </Timeline.Viewport>
      </Timeline.Root>
    </div>
  );
}

export function DependencyLinks() {
  return (
    <Timeline.Root
      start={0}
      end={100}
      className="overflow-hidden rounded-md border border-border bg-background"
    >
      <Timeline.Viewport
        axis={{
          guides: [25, 50, 75].map((at) => ({ at, bodyClassName: "bg-border" })),
        }}
        linkDefaults={{ style: { color: "var(--muted-foreground)" }, strokeWidth: 1.5 }}
      >
        <Timeline.Row height={40} className="border-b border-border">
          <Timeline.Interval id="task-a" start={10} end={40} insetY={4}>
            <div className="flex h-full items-center justify-center rounded-md bg-blue-600 text-label-md text-white">
              Task A
            </div>
          </Timeline.Interval>
        </Timeline.Row>
        <Timeline.Row height={40} background={{ className: "bg-blue-500/10" }}>
          <Timeline.Interval id="task-b" start={50} end={80} insetY={4}>
            <div className="flex h-full items-center justify-center rounded-md bg-emerald-700 text-label-md text-white">
              Task B
            </div>
          </Timeline.Interval>
        </Timeline.Row>
        <Timeline.Link from="task-a" to="task-b" />
      </Timeline.Viewport>
    </Timeline.Root>
  );
}

export function RowBackground() {
  return (
    <Timeline.Root
      start={0}
      end={100}
      className="overflow-hidden rounded-md border border-border bg-background"
    >
      <Timeline.Viewport axis={{ guides: [{ at: 50, bodyClassName: "bg-border" }] }}>
        <Timeline.Row height={40} background={{ className: "bg-blue-500/10" }}>
          <Timeline.Interval start={10} end={35} insetY={4}>
            <div className="flex h-full items-center justify-center rounded-md bg-blue-600 text-label-md text-white">
              Planning
            </div>
          </Timeline.Interval>
        </Timeline.Row>
      </Timeline.Viewport>
    </Timeline.Root>
  );
}
