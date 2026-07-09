import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Timeline } from "./timeline";

afterEach(() => {
  cleanup();
});

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
    const clientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
    const clientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");

    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 200;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return 80;
      },
    });

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
    }
  });

  it("renders row backgrounds in a separate layer", () => {
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
