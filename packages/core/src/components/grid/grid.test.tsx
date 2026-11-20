import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Grid } from "./grid";

afterEach(() => {
  cleanup();
});

const getRoot = (container: HTMLElement) => container.firstElementChild as HTMLElement;

describe("Grid", () => {
  // ==========================================================================
  // Snapshots — DOM structure for representative configurations
  // ==========================================================================

  describe("snapshots", () => {
    it("equal columns", () => {
      const { container } = render(
        <Grid columns={3} gap={4}>
          <div>A</div>
          <div>B</div>
          <div>C</div>
        </Grid>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("custom column widths", () => {
      const { container } = render(
        <Grid columns="280px 1fr" gap={6}>
          <div>Side</div>
          <div>Main</div>
        </Grid>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("auto-fit via minChildWidth", () => {
      const { container } = render(
        <Grid minChildWidth={240} gap={4}>
          <div>A</div>
          <div>B</div>
        </Grid>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("responsive columns", () => {
      const { container } = render(
        <Grid columns={{ initial: 1, md: 2, xl: 4 }} gap={4}>
          <div>A</div>
        </Grid>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with Grid.Item spanning", () => {
      const { container } = render(
        <Grid columns={4} gap={4}>
          <Grid.Item colSpan={2}>Wide</Grid.Item>
          <div>Normal</div>
          <Grid.Item colSpan={{ initial: "full", md: 1 }} rowSpan={2}>
            Tall
          </Grid.Item>
        </Grid>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("alignment, flow, and per-axis gaps", () => {
      const { container } = render(
        <Grid columns={2} gapX={6} gapY={2} flow="row-dense" align="center" justify="between">
          <div>A</div>
        </Grid>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  // ==========================================================================
  // Behavioral — CSS variables, classes, precedence, passthrough
  // ==========================================================================

  it("renders children and the grid data-slot", () => {
    render(
      <Grid columns={2}>
        <div>Child one</div>
        <div>Child two</div>
      </Grid>,
    );
    expect(screen.getByText("Child one")).toBeDefined();
    expect(screen.getByText("Child two")).toBeDefined();
  });

  it("sets displayName on the root for DevTools / stack traces", () => {
    expect(Grid.displayName).toBe("Grid");
  });

  it("applies a 12px (gap=3) default gap when no gap prop is given", () => {
    const { container } = render(
      <Grid columns={2}>
        <div>A</div>
      </Grid>,
    );
    const root = getRoot(container);
    expect(root.style.getPropertyValue("--grid-gap-x")).toBe("calc(var(--spacing, 0.25rem) * 3)");
    expect(root.style.getPropertyValue("--grid-gap-y")).toBe("calc(var(--spacing, 0.25rem) * 3)");
  });

  it("sets the column template variable for a numeric column count", () => {
    const { container } = render(
      <Grid columns={3}>
        <div>A</div>
      </Grid>,
    );
    const root = getRoot(container);
    expect(root.getAttribute("data-slot")).toBe("grid");
    expect(root.style.getPropertyValue("--grid-cols")).toBe("repeat(3, minmax(0, 1fr))");
    expect(root.className).toContain("astw:grid-cols-[var(--grid-cols)]");
  });

  it("passes a string column value through verbatim", () => {
    const { container } = render(
      <Grid columns="280px 1fr">
        <div>A</div>
      </Grid>,
    );
    expect(getRoot(container).style.getPropertyValue("--grid-cols")).toBe("280px 1fr");
  });

  it("derives gap variables from spacing-scale units", () => {
    const { container } = render(
      <Grid columns={2} gap={4}>
        <div>A</div>
      </Grid>,
    );
    const root = getRoot(container);
    expect(root.style.getPropertyValue("--grid-gap-x")).toBe("calc(var(--spacing, 0.25rem) * 4)");
    expect(root.style.getPropertyValue("--grid-gap-y")).toBe("calc(var(--spacing, 0.25rem) * 4)");
  });

  it("lets gapX / gapY override the shared gap", () => {
    const { container } = render(
      <Grid columns={2} gap={4} gapX={8}>
        <div>A</div>
      </Grid>,
    );
    const root = getRoot(container);
    expect(root.style.getPropertyValue("--grid-gap-x")).toBe("calc(var(--spacing, 0.25rem) * 8)");
    expect(root.style.getPropertyValue("--grid-gap-y")).toBe("calc(var(--spacing, 0.25rem) * 4)");
  });

  it("minChildWidth sets an auto-fit template and overrides columns", () => {
    const { container } = render(
      <Grid columns={4} minChildWidth={240}>
        <div>A</div>
      </Grid>,
    );
    const root = getRoot(container);
    expect(root.style.gridTemplateColumns).toBe("repeat(auto-fit, minmax(240px, 1fr))");
    expect(root.style.getPropertyValue("--grid-cols")).toBe("");
  });

  it("accepts a string minChildWidth", () => {
    const { container } = render(
      <Grid minChildWidth="16rem">
        <div>A</div>
      </Grid>,
    );
    expect(getRoot(container).style.gridTemplateColumns).toBe(
      "repeat(auto-fit, minmax(16rem, 1fr))",
    );
  });

  it("emits a utility class per responsive breakpoint", () => {
    const { container } = render(
      <Grid columns={{ initial: 1, md: 2, xl: 4 }}>
        <div>A</div>
      </Grid>,
    );
    const root = getRoot(container);
    expect(root.className).toContain("astw:grid-cols-[var(--grid-cols)]");
    expect(root.className).toContain("astw:md:grid-cols-[var(--grid-cols-md)]");
    expect(root.className).toContain("astw:xl:grid-cols-[var(--grid-cols-xl)]");
    expect(root.style.getPropertyValue("--grid-cols")).toBe("repeat(1, minmax(0, 1fr))");
    expect(root.style.getPropertyValue("--grid-cols-md")).toBe("repeat(2, minmax(0, 1fr))");
    expect(root.style.getPropertyValue("--grid-cols-xl")).toBe("repeat(4, minmax(0, 1fr))");
  });

  it("maps flow / align / justify to utility classes", () => {
    const { container } = render(
      <Grid columns={2} flow="column-dense" align="center" justify="between">
        <div>A</div>
      </Grid>,
    );
    const root = getRoot(container);
    expect(root.className).toContain("astw:grid-flow-col-dense");
    expect(root.className).toContain("astw:items-center");
    expect(root.className).toContain("astw:justify-between");
  });

  it("merges className and forwards native div props", () => {
    const { container } = render(
      <Grid columns={2} className="custom-class" aria-label="layout grid" id="kpis">
        <div>A</div>
      </Grid>,
    );
    const root = getRoot(container);
    expect(root.className).toContain("custom-class");
    expect(root.className).toContain("astw:grid");
    expect(root.getAttribute("aria-label")).toBe("layout grid");
    expect(root.id).toBe("kpis");
  });

  // ==========================================================================
  // Grid.Item
  // ==========================================================================

  describe("Grid.Item", () => {
    it("spans columns via a numeric colSpan", () => {
      const { container } = render(
        <Grid columns={4}>
          <Grid.Item colSpan={2}>Wide</Grid.Item>
        </Grid>,
      );
      const item = container.querySelector('[data-slot="grid-item"]') as HTMLElement;
      expect(item.style.getPropertyValue("--gi-col")).toBe("span 2 / span 2");
      expect(item.className).toContain("astw:[grid-column:var(--gi-col)]");
    });

    it('spans the full row with colSpan="full"', () => {
      const { container } = render(
        <Grid columns={4}>
          <Grid.Item colSpan="full">Full</Grid.Item>
        </Grid>,
      );
      const item = container.querySelector('[data-slot="grid-item"]') as HTMLElement;
      expect(item.style.getPropertyValue("--gi-col")).toBe("1 / -1");
    });

    it("supports responsive colSpan with rowSpan", () => {
      const { container } = render(
        <Grid columns={4}>
          <Grid.Item colSpan={{ initial: "full", md: 1 }} rowSpan={2}>
            Tall
          </Grid.Item>
        </Grid>,
      );
      const item = container.querySelector('[data-slot="grid-item"]') as HTMLElement;
      expect(item.style.getPropertyValue("--gi-col")).toBe("1 / -1");
      expect(item.style.getPropertyValue("--gi-col-md")).toBe("span 1 / span 1");
      expect(item.style.getPropertyValue("--gi-row")).toBe("span 2 / span 2");
      expect(item.className).toContain("astw:md:[grid-column:var(--gi-col-md)]");
    });

    it("places items with colStart / colEnd", () => {
      const { container } = render(
        <Grid columns={4}>
          <Grid.Item colStart={2} colEnd={4}>
            Placed
          </Grid.Item>
        </Grid>,
      );
      const item = container.querySelector('[data-slot="grid-item"]') as HTMLElement;
      expect(item.style.getPropertyValue("--gi-col-start")).toBe("2");
      expect(item.style.getPropertyValue("--gi-col-end")).toBe("4");
    });
  });

  // ==========================================================================
  // maxColumns — container-responsive columns
  // ==========================================================================

  describe("maxColumns", () => {
    it("renders the grid inside an @container wrapper", () => {
      const { container } = render(
        <Grid maxColumns={3}>
          <div>A</div>
        </Grid>,
      );
      const wrapper = getRoot(container);
      expect(wrapper.getAttribute("data-slot")).toBe("grid-container");
      expect(wrapper.className).toContain("astw:@container");
      expect(wrapper.firstElementChild?.getAttribute("data-slot")).toBe("grid");
    });

    it("steps columns down from the max as the container narrows", () => {
      const { container } = render(
        <Grid maxColumns={3}>
          <div>A</div>
        </Grid>,
      );
      const grid = getRoot(container).firstElementChild as HTMLElement;
      expect(grid.className).toContain("astw:grid-cols-1");
      expect(grid.className).toContain("astw:@[400px]:grid-cols-2");
      expect(grid.className).toContain("astw:@[640px]:grid-cols-3");
      expect(grid.className).not.toContain("grid-cols-4");
    });

    it("overrides columns and minChildWidth", () => {
      const { container } = render(
        <Grid maxColumns={2} columns={5} minChildWidth={100}>
          <div>A</div>
        </Grid>,
      );
      const grid = getRoot(container).firstElementChild as HTMLElement;
      expect(grid.className).not.toContain("grid-cols-[var(--grid-cols)]");
      expect(grid.style.gridTemplateColumns).toBe("");
    });

    it("clamps numeric spans to the columns shown", () => {
      const { container } = render(
        <Grid maxColumns={2}>
          <Grid.Item colSpan={3}>Wide</Grid.Item>
        </Grid>,
      );
      const grid = getRoot(container).firstElementChild as HTMLElement;
      expect(grid.className).toContain("astw:@[400px]:[&>[data-col-span='3']]:col-span-2");
      expect(grid.className).not.toContain("col-span-3");
      expect(grid.querySelector("[data-slot=grid-item]")?.getAttribute("data-col-span")).toBe("3");
    });

    it("exposes full spans and skips responsive spans", () => {
      render(
        <Grid maxColumns={2}>
          <Grid.Item colSpan="full">Full</Grid.Item>
          <Grid.Item colSpan={{ initial: 1, md: 2 }}>Responsive</Grid.Item>
        </Grid>,
      );
      const [full, responsive] = screen.getAllByText(/Full|Responsive/);
      expect(full.getAttribute("data-col-span")).toBe("full");
      expect(responsive.getAttribute("data-col-span")).toBeNull();
    });

    it("stretches fields to fill their cell", () => {
      const { container } = render(
        <Grid maxColumns={2}>
          <div data-slot="field">A</div>
        </Grid>,
      );
      const grid = getRoot(container).firstElementChild as HTMLElement;
      expect(grid.className).toContain("astw:[&>[data-slot=field]]:items-stretch");
      expect(grid.className).toContain(
        "astw:[&>[data-slot=grid-item]>[data-slot=field]]:items-stretch",
      );
    });

    it("does not wrap the grid without maxColumns", () => {
      const { container } = render(
        <Grid columns={2}>
          <div>A</div>
        </Grid>,
      );
      expect(getRoot(container).getAttribute("data-slot")).toBe("grid");
    });
  });
});
