import { Text, Timeline } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Timeline.Root start={0} end={100}>
      <Timeline.Viewport
        axis={{
          guides: [{ at: 0 }, { at: 50 }, { at: 100 }],
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
        <Timeline.Row height={40}>
          <Timeline.Interval start={10} end={35} insetY={4}>
            <div className="flex h-full items-center justify-center rounded-md bg-primary text-label-md text-primary-foreground">
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
    { name: "Planning", start: 5, end: 25 },
    { name: "Implementation", start: 30, end: 70 },
    { name: "Release", start: 80, end: 98 },
  ];

  return (
    <div className="space-y-3">
      <Text.p>Scroll horizontally to see Release at the far end of the fixed-width canvas.</Text.p>
      <Timeline.Root start={0} end={100} className="max-w-xl">
        <Timeline.Viewport
          canvasWidth={1400}
          axis={{
            guides: [{ at: 25 }, { at: 50 }, { at: 75 }],
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
          {tasks.map((task) => (
            <Timeline.Row key={task.name} height={44}>
              <Timeline.Interval start={task.start} end={task.end} insetY={6}>
                <div className="flex h-full items-center rounded bg-primary px-3 text-primary-foreground">
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
  const tasks = Array.from({ length: 10 }, (_, index) => ({
    name: `Task ${index + 1}`,
    start: 5 + index * 3,
    end: 45 + index * 4,
  }));

  return (
    <div className="space-y-3">
      <Text.p>
        Scroll inside the timeline. The sprint labels stay at the top while the task rows move.
      </Text.p>
      <Timeline.Root start={0} end={100}>
        <Timeline.Viewport
          stickyAxis
          style={{ height: 220, overflowY: "auto" }}
          axis={{
            className: "bg-background",
            guides: [{ at: 50 }],
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
          {tasks.map((task) => (
            <Timeline.Row key={task.name} height={42}>
              <Timeline.Interval start={task.start} end={task.end} insetY={5}>
                <div className="flex h-full items-center rounded bg-secondary px-3 text-secondary-foreground">
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
      <Timeline.Root start={0} end={100}>
        <Timeline.Viewport
          axis={{
            guides: [{ at: 20 }, { at: 40 }, { at: 60 }, { at: 80 }],
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
            bands: [{ start: 60, end: 80, color: "var(--warning-surface)" }],
            markers: [{ at: 45, color: "var(--primary)", label: "Today", placement: "both" }],
          }}
        >
          <Timeline.Row height={52}>
            <Timeline.Interval start={10} end={55} insetY={12}>
              <div className="flex h-full items-center rounded bg-secondary px-3 text-secondary-foreground">
                Build
              </div>
            </Timeline.Interval>
          </Timeline.Row>
          <Timeline.Row height={52}>
            <Timeline.Interval start={65} end={95} insetY={12}>
              <div className="flex h-full items-center rounded bg-primary px-3 text-primary-foreground">
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
    <Timeline.Root start={0} end={100}>
      <Timeline.Viewport
        linkDefaults={{ style: { color: "var(--muted-foreground)" }, strokeWidth: 1.5 }}
      >
        <Timeline.Row height={40}>
          <Timeline.Interval id="task-a" start={10} end={40} insetY={4}>
            <div className="flex h-full items-center justify-center rounded-md bg-primary text-label-md text-primary-foreground">
              Task A
            </div>
          </Timeline.Interval>
        </Timeline.Row>
        <Timeline.Row height={40}>
          <Timeline.Interval id="task-b" start={50} end={80} insetY={4}>
            <div className="flex h-full items-center justify-center rounded-md bg-secondary text-label-md text-secondary-foreground">
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
    <Timeline.Root start={0} end={100}>
      <Timeline.Viewport axis={{ guides: [{ at: 50, bodyClassName: "bg-border" }] }}>
        <Timeline.Row height={40} background={{ style: { background: "var(--muted)" } }}>
          <Timeline.Interval start={10} end={35} insetY={4}>
            <div className="flex h-full items-center justify-center rounded-md bg-primary text-label-md text-primary-foreground">
              Planning
            </div>
          </Timeline.Interval>
        </Timeline.Row>
      </Timeline.Viewport>
    </Timeline.Root>
  );
}
