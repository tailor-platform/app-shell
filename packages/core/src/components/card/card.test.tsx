import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Card } from "./card";

afterEach(() => {
  cleanup();
});

describe("Card", () => {
  describe("snapshots", () => {
    it("basic card with header and content", () => {
      const { container } = render(
        <Card.Root>
          <Card.Header title="Title" description="Description" />
          <Card.Content>Content</Card.Content>
        </Card.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("card with custom className", () => {
      const { container } = render(
        <Card.Root className="custom-class">
          <Card.Content>Content</Card.Content>
        </Card.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders title and description", () => {
    render(
      <Card.Root>
        <Card.Header title="My Title" description="My Description" />
      </Card.Root>,
    );
    expect(screen.getByText("My Title")).toBeDefined();
    expect(screen.getByText("My Description")).toBeDefined();
  });

  it("renders content", () => {
    render(
      <Card.Root>
        <Card.Content>Card body</Card.Content>
      </Card.Root>,
    );
    expect(screen.getByText("Card body")).toBeDefined();
  });

  describe("Content padding", () => {
    it("pads content by default", () => {
      render(
        <Card.Root>
          <Card.Content>Body</Card.Content>
        </Card.Root>,
      );
      const content = screen.getByText("Body");
      expect(content.dataset.padding).toBe("default");
      expect(content.className).toContain("astw:px-6");
    });

    it('renders edge-to-edge with padding="none"', () => {
      render(
        <Card.Root>
          <Card.Content padding="none">Body</Card.Content>
        </Card.Root>,
      );
      const content = screen.getByText("Body");
      expect(content.dataset.padding).toBe("none");
      expect(content.className).not.toMatch(/astw:(px|pb|first:pt)-6/);
      // Corners are carried, not clipped: a consumer's overflow still applies.
      expect(content.className).toContain("astw:last:rounded-b-[inherit]");
      expect(content.className).not.toContain("overflow");
    });

    it("strips a nested DataTable's own border", () => {
      render(
        <Card.Root>
          <Card.Content padding="none">Body</Card.Content>
        </Card.Root>,
      );
      expect(screen.getByText("Body").className).toContain(
        "astw:[&>[data-slot=data-table]]:border-0",
      );
    });
  });
});
