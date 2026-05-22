import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../tests/test-utils";
import { BadgeList, resolveBadgeVariant, resolveBadgeLabel } from "./badge-list";

afterEach(() => {
  cleanup();
});

const wrapper = createAppShellWrapper();

describe("resolveBadgeVariant", () => {
  it("returns variant from map", () => {
    expect(resolveBadgeVariant("urgent", { badgeVariantMap: { urgent: "error" } })).toBe("error");
  });

  it("falls back to case-insensitive lookup", () => {
    expect(resolveBadgeVariant("URGENT", { badgeVariantMap: { urgent: "error" } })).toBe("error");
  });

  it("returns defaultBadgeVariant when not in map", () => {
    expect(resolveBadgeVariant("unknown", { defaultBadgeVariant: "warning" })).toBe("warning");
  });

  it("returns 'outline-neutral' when no options", () => {
    expect(resolveBadgeVariant("anything", undefined)).toBe("outline-neutral");
  });
});

describe("resolveBadgeLabel", () => {
  it("returns label from map", () => {
    expect(resolveBadgeLabel("draft", { badgeLabelMap: { draft: "Draft Order" } })).toBe(
      "Draft Order",
    );
  });

  it("returns undefined when not in map", () => {
    expect(resolveBadgeLabel("missing", { badgeLabelMap: { draft: "Draft" } })).toBeUndefined();
  });

  it("returns undefined when no options", () => {
    expect(resolveBadgeLabel("anything", undefined)).toBeUndefined();
  });
});

describe("BadgeList", () => {
  it("renders a single badge for a string value", () => {
    const { container } = render(<BadgeList value="active" />, { wrapper });
    expect(container.textContent).toBe("active");
  });

  it("renders multiple badges from array", () => {
    const { container } = render(<BadgeList value={["a", "b", "c"]} />, {
      wrapper,
    });
    expect(container.textContent).toContain("a");
    expect(container.textContent).toContain("b");
    expect(container.textContent).toContain("c");
  });

  it("returns null for empty array", () => {
    const { container } = render(<BadgeList value={[]} />, { wrapper });
    expect(container.textContent).toBe("");
  });

  it("returns null for null value", () => {
    const { container } = render(<BadgeList value={null} />, { wrapper });
    expect(container.textContent).toBe("");
  });

  it("filters out null and empty string values", () => {
    const { container } = render(<BadgeList value={["a", null, "", "b"]} />, {
      wrapper,
    });
    expect(container.textContent).toContain("a");
    expect(container.textContent).toContain("b");
  });

  it("applies badgeLabelMap for display labels", () => {
    const { container } = render(
      <BadgeList value="draft" options={{ badgeLabelMap: { draft: "Draft Order" } }} />,
      { wrapper },
    );
    expect(container.textContent).toBe("Draft Order");
  });

  it("uses custom resolveLabel function", () => {
    const { container } = render(
      <BadgeList value={["hello_world"]} resolveLabel={(v) => v.toUpperCase()} />,
      { wrapper },
    );
    expect(container.textContent).toContain("HELLO_WORLD");
  });

  it("renders maxVisible badges with +N overflow", () => {
    const { container } = render(<BadgeList value={["a", "b", "c", "d", "e"]} maxVisible={2} />, {
      wrapper,
    });
    expect(container.textContent).toContain("a");
    expect(container.textContent).toContain("b");
    expect(container.textContent).toContain("+3");
    expect(container.textContent).not.toContain("c");
    expect(container.textContent).not.toContain("d");
    expect(container.textContent).not.toContain("e");
  });

  it("does not show overflow when count is within maxVisible", () => {
    const { container } = render(<BadgeList value={["a", "b"]} maxVisible={5} />, { wrapper });
    expect(container.textContent).toContain("a");
    expect(container.textContent).toContain("b");
    expect(container.textContent).not.toContain("+");
  });

  it("shows overflow badges in popover on hover", async () => {
    const user = userEvent.setup();
    render(<BadgeList value={["a", "b", "c", "d"]} maxVisible={2} />, {
      wrapper,
    });

    const trigger = screen.getByText("+2");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("c")).toBeDefined();
      expect(screen.getByText("d")).toBeDefined();
    });
  });

  it("applies badgeClassName to each badge", () => {
    const { container } = render(<BadgeList value={["x"]} badgeClassName="astw:w-fit" />, {
      wrapper,
    });
    const badge = container.querySelector("[class*='w-fit']");
    expect(badge).not.toBeNull();
  });
});
