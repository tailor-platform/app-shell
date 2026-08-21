import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Timeline } from "./timeline";

afterEach(() => {
  cleanup();
});

function mockBodySize(width: number, height: number) {
  const clientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  const clientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");

  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      if ((this as HTMLElement).dataset.slot === "timeline-body") return width;
      return clientWidth?.get?.call(this) ?? 0;
    },
  });

  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      if ((this as HTMLElement).dataset.slot === "timeline-body") return height;
      return clientHeight?.get?.call(this) ?? 0;
    },
  });

  return () => {
    if (clientWidth) {
      Object.defineProperty(HTMLElement.prototype, "clientWidth", clientWidth);
    } else {
      delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
    }

    if (clientHeight) {
      Object.defineProperty(HTMLElement.prototype, "clientHeight", clientHeight);
    } else {
      delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
    }
  };
}

function WrappedRow({
  id,
  label,
  start,
  end,
  background,
}: {
  id: string;
  label: string;
  start: number;
  end: number;
  background?: boolean;
}) {
  return (
    <Timeline.Row
      height={40}
      background={background ? { style: { background: "var(--muted)" } } : null}
    >
      <Timeline.Interval id={id} start={start} end={end} insetY={8}>
        <div>{label}</div>
      </Timeline.Interval>
    </Timeline.Row>
  );
}

describe("Timeline", () => {
  it("renders axis levels and decorations from owner props", () => {
    const { container } = render(
      <Timeline.Root start={0} end={100}>
        <Timeline.Viewport
          axis={{
            guides: [
              {
                at: 50,
                axisStyle: { background: "var(--border)" },
                bodyStyle: { background: "var(--border)" },
              },
            ],
            levels: [
              {
                kind: "spans",
                items: [{ start: 0, end: 50, label: "First half" }],
              },
              {
                kind: "ticks",
                items: [{ at: 50, label: "Middle" }],
              },
            ],
          }}
          decorations={{
            bands: [{ start: 10, end: 30 }],
            markers: [{ at: 60, label: "Today", placement: "both" }],
          }}
        >
          <Timeline.Row height={40}>
            <Timeline.Interval start={10} end={30}>
              <div>Item</div>
            </Timeline.Interval>
          </Timeline.Row>
        </Timeline.Viewport>
      </Timeline.Root>,
    );

    expect(screen.getByText("First half")).toBeDefined();
    expect(screen.getByText("Middle")).toBeDefined();
    expect(screen.getByText("Today")).toBeDefined();
    expect(container.querySelectorAll('[data-slot="timeline-band"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-slot="timeline-axis-guide"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-slot="timeline-marker"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-slot="timeline-body-line"]')).toHaveLength(1);
  });

  it("renders body marker labels for the default placement", () => {
    render(
      <Timeline.Root start={0} end={100}>
        <Timeline.Viewport decorations={{ markers: [{ at: 60, label: "Now" }] }}>
          <Timeline.Row height={40}>
            <Timeline.Interval start={10} end={30}>
              <div>Item</div>
            </Timeline.Interval>
          </Timeline.Row>
        </Timeline.Viewport>
      </Timeline.Root>,
    );

    expect(screen.getByText("Now")).toBeDefined();
  });

  it("positions interval nodes by timeline range", () => {
    const { container } = render(
      <Timeline.Root start={0} end={100}>
        <Timeline.Viewport>
          <Timeline.Row height={40}>
            <Timeline.Interval start={10} end={30} insetY={8}>
              <div>Interval</div>
            </Timeline.Interval>
          </Timeline.Row>
        </Timeline.Viewport>
      </Timeline.Root>,
    );

    const interval = container.querySelector('[data-slot="timeline-interval"]') as HTMLDivElement;
    const row = container.querySelector('[data-slot="timeline-row"]') as HTMLDivElement;

    expect(interval.style.left).toBe("10%");
    expect(interval.style.width).toBe("20%");
    expect(interval.style.top).toBe("8px");
    expect(interval.style.bottom).toBe("8px");
    expect(row.style.height).toBe("40px");
  });

  it("draws links from interval metadata instead of measured item DOM", async () => {
    const restore = mockBodySize(200, 80);

    try {
      const { container } = render(
        <Timeline.Root start={0} end={100}>
          <Timeline.Viewport>
            <Timeline.Row height={40}>
              <Timeline.Interval id="a" start={10} end={30} insetY={8}>
                <div>A</div>
              </Timeline.Interval>
            </Timeline.Row>
            <Timeline.Row height={40}>
              <Timeline.Interval id="b" start={60} end={80} insetY={8}>
                <div>B</div>
              </Timeline.Interval>
            </Timeline.Row>
            <Timeline.Link from="a" to="b" />
          </Timeline.Viewport>
        </Timeline.Root>,
      );

      await waitFor(() => {
        const link = container.querySelector('[data-slot="timeline-link"] path[stroke]');
        expect(link?.getAttribute("d")).toBe("M 60 20 L 76 20 L 76 60 L 112 60");
      });
    } finally {
      restore();
    }
  });

  it("routes overlapping same-row links outside the interval bodies", async () => {
    const restore = mockBodySize(200, 40);

    try {
      const { container } = render(
        <Timeline.Root start={0} end={100}>
          <Timeline.Viewport>
            <Timeline.Row height={40}>
              <Timeline.Interval id="a" start={10} end={50} insetY={8}>
                <div>A</div>
              </Timeline.Interval>
              <Timeline.Interval id="b" start={30} end={60} insetY={8}>
                <div>B</div>
              </Timeline.Interval>
            </Timeline.Row>
            <Timeline.Link from="b" to="a" />
          </Timeline.Viewport>
        </Timeline.Root>,
      );

      await waitFor(() => {
        const link = container.querySelector('[data-slot="timeline-link"] path[stroke]');
        expect(link?.getAttribute("d")).toBe("M 120 20 L 136 20 L 136 -8 L 4 -8 L 4 20 L 12 20");
      });
    } finally {
      restore();
    }
  });

  it("avoids routing through another row's connection head", async () => {
    const restore = mockBodySize(200, 120);

    try {
      const { container } = render(
        <Timeline.Root start={0} end={100}>
          <Timeline.Viewport>
            <Timeline.Row height={40}>
              <Timeline.Interval id="source" start={20} end={40} insetY={8}>
                <div>Foundation</div>
              </Timeline.Interval>
            </Timeline.Row>
            <Timeline.Row height={40}>
              <Timeline.Interval id="docs" start={40} end={70} insetY={8}>
                <div>Docs</div>
              </Timeline.Interval>
            </Timeline.Row>
            <Timeline.Row height={40}>
              <Timeline.Interval id="qa" start={40} end={70} insetY={8}>
                <div>QA</div>
              </Timeline.Interval>
            </Timeline.Row>
            <Timeline.Link from="source" to="qa" />
          </Timeline.Viewport>
        </Timeline.Root>,
      );

      await waitFor(() => {
        const link = container.querySelector('[data-slot="timeline-link"] path[stroke]');
        expect(link?.getAttribute("d")).toBe("M 80 20 L 96 20 L 96 80 L 64 80 L 64 100 L 72 100");
      });
    } finally {
      restore();
    }
  });

  it("supports wrapped row components", async () => {
    const restore = mockBodySize(200, 80);

    try {
      const { container } = render(
        <Timeline.Root start={0} end={100}>
          <Timeline.Viewport>
            <WrappedRow id="a" label="Wrapped A" start={10} end={30} background />
            <WrappedRow id="b" label="Wrapped B" start={60} end={80} />
            <Timeline.Link from="a" to="b" />
          </Timeline.Viewport>
        </Timeline.Root>,
      );

      await waitFor(() => {
        expect(screen.getByText("Wrapped A")).toBeDefined();
        expect(screen.getByText("Wrapped B")).toBeDefined();
        const link = container.querySelector('[data-slot="timeline-link"] path[stroke]');
        expect(link?.getAttribute("d")).toBe("M 60 20 L 76 20 L 76 60 L 112 60");
      });

      expect(container.querySelectorAll('[data-slot="timeline-row-background"]')).toHaveLength(1);
    } finally {
      restore();
    }
  });

  it("renders row backgrounds in a separate layer", async () => {
    const { container } = render(
      <Timeline.Root start={0} end={100}>
        <Timeline.Viewport>
          <Timeline.Row height={40} background={{ style: { background: "var(--muted)" } }}>
            <div>Row A</div>
          </Timeline.Row>
          <Timeline.Row height={40} style={{ borderBottom: "1px solid var(--border)" }}>
            <div>Row B</div>
          </Timeline.Row>
        </Timeline.Viewport>
      </Timeline.Root>,
    );

    await waitFor(() => {
      const rows = container.querySelectorAll('[data-slot="timeline-row"]');
      const backgrounds = container.querySelectorAll('[data-slot="timeline-row-background"]');
      expect(rows).toHaveLength(2);
      expect(backgrounds).toHaveLength(1);
      expect(rows[0].textContent).toContain("Row A");
      expect(rows[1].textContent).toContain("Row B");
      expect((backgrounds[0] as HTMLDivElement).style.background).toContain("var(--muted)");
      expect((rows[1] as HTMLDivElement).style.borderBottom).toContain("var(--border)");
    });
  });
});
