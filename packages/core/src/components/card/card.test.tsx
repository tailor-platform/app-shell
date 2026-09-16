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
});
