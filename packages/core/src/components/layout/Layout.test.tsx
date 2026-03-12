import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Layout } from "./Layout";

afterEach(() => {
  cleanup();
});

describe("Layout", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for each layout variation
  // ==========================================================================

  describe("snapshots", () => {
    it("1-column layout", () => {
      const { container } = render(
        <Layout>
          <Layout.Column>Content</Layout.Column>
        </Layout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("2-column position-based layout", () => {
      const { container } = render(
        <Layout>
          <Layout.Column>Main</Layout.Column>
          <Layout.Column>Side</Layout.Column>
        </Layout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("3-column position-based layout", () => {
      const { container } = render(
        <Layout>
          <Layout.Column>Left</Layout.Column>
          <Layout.Column>Center</Layout.Column>
          <Layout.Column>Right</Layout.Column>
        </Layout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("2-column area-based layout (left + main)", () => {
      const { container } = render(
        <Layout>
          <Layout.Column area="left">Sidebar</Layout.Column>
          <Layout.Column area="main">Content</Layout.Column>
        </Layout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("2-column area-based layout (main + right)", () => {
      const { container } = render(
        <Layout>
          <Layout.Column area="main">Content</Layout.Column>
          <Layout.Column area="right">Panel</Layout.Column>
        </Layout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("3-column area-based layout", () => {
      const { container } = render(
        <Layout>
          <Layout.Column area="left">Left</Layout.Column>
          <Layout.Column area="main">Center</Layout.Column>
          <Layout.Column area="right">Right</Layout.Column>
        </Layout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("Layout.Header with title", () => {
      const { container } = render(
        <Layout>
          <Layout.Header title="Page Title" />
          <Layout.Column>Content</Layout.Column>
        </Layout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("Layout.Header with title, actions, and children", () => {
      const { container } = render(
        <Layout>
          <Layout.Header title="Edit" actions={[<button key="save">Save</button>]}>
            <div>Tabs</div>
          </Layout.Header>
          <Layout.Column>Content</Layout.Column>
        </Layout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("legacy title and actions props", () => {
      const { container } = render(
        <Layout title="Legacy Title" actions={[<button key="save">Save</button>]}>
          <Layout.Column>Content</Layout.Column>
        </Layout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("className passthrough", () => {
      const { container } = render(
        <Layout className="custom-class">
          <Layout.Column>Content</Layout.Column>
        </Layout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  // ==========================================================================
  // Behavioral tests — warnings, precedence, boundary enforcement
  // ==========================================================================

  it("prefers Layout.Header over legacy title/actions props", () => {
    render(
      <Layout title="Legacy" actions={[<button key="a">Legacy Action</button>]}>
        <Layout.Header title="New Title" actions={[<button key="new">New Action</button>]} />
        <Layout.Column>Content</Layout.Column>
      </Layout>,
    );
    expect(screen.getByText("New Title")).toBeDefined();
    expect(screen.getByText("New Action")).toBeDefined();
    expect(screen.queryByText("Legacy")).toBeNull();
    expect(screen.queryByText("Legacy Action")).toBeNull();
  });

  it("warns and falls back to position-based on partial area specification", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <Layout>
        <Layout.Column area="left">Left</Layout.Column>
        <Layout.Column>Main</Layout.Column>
      </Layout>,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("must be specified on all"));
    // Verify it fell back to position-based (same structure as area-less 2-col)
    expect(container.innerHTML).toMatchSnapshot();
    warnSpy.mockRestore();
  });

  it("warns and falls back to position-based on duplicate areas", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <Layout>
        <Layout.Column area="main">First</Layout.Column>
        <Layout.Column area="main">Second</Layout.Column>
      </Layout>,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Duplicate"));
    expect(container.innerHTML).toMatchSnapshot();
    warnSpy.mockRestore();
  });

  it("warns and renders only first 3 columns when more than 3 are provided", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Layout>
        <Layout.Column>One</Layout.Column>
        <Layout.Column>Two</Layout.Column>
        <Layout.Column>Three</Layout.Column>
        <Layout.Column>Four</Layout.Column>
      </Layout>,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Maximum of 3"));
    expect(screen.getByText("One")).toBeDefined();
    expect(screen.getByText("Two")).toBeDefined();
    expect(screen.getByText("Three")).toBeDefined();
    expect(screen.queryByText("Four")).toBeNull();
    warnSpy.mockRestore();
  });

  it("warns when unsupported children are provided", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Layout>
        <div>Rogue element</div>
        <Layout.Column>Content</Layout.Column>
      </Layout>,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Unsupported child type"));
    expect(screen.getByText("Content")).toBeDefined();
    warnSpy.mockRestore();
  });

  it("applies area-based width class for left column in 2-col layout", () => {
    render(
      <Layout>
        <Layout.Column area="left">Sidebar</Layout.Column>
        <Layout.Column area="main">Content</Layout.Column>
      </Layout>,
    );
    const sidebar = screen.getByText("Sidebar").closest("div");
    expect(sidebar?.className).toContain("w-[320px]");
  });

  it("applies area-based width class for right column in 3-col layout", () => {
    render(
      <Layout>
        <Layout.Column area="left">Left</Layout.Column>
        <Layout.Column area="main">Center</Layout.Column>
        <Layout.Column area="right">Right</Layout.Column>
      </Layout>,
    );
    const right = screen.getByText("Right").closest("div");
    expect(right?.className).toContain("w-[280px]");
    const left = screen.getByText("Left").closest("div");
    expect(left?.className).toContain("w-[320px]");
  });

  it("warns when deprecated columns prop doesn't match child count", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Layout columns={2}>
        <Layout.Column>Only one</Layout.Column>
      </Layout>,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("does not match"));
    warnSpy.mockRestore();
  });
});
