import { Timeline } from "@tailor-platform/app-shell";

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
