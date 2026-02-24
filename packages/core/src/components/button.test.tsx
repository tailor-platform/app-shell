import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";
import { Link, MemoryRouter } from "react-router";

afterEach(() => {
  cleanup();
});

describe("Button", () => {
  it("renders as button by default", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDefined();
    expect(button.tagName).toBe("BUTTON");
    expect(button.textContent).toBe("Click me");
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Click me</Button>);

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders different variants", () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByRole("button").className).toContain("bg-primary");

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole("button").className).toContain("bg-destructive");

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole("button").className).toContain("border");

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button").className).toContain("bg-secondary");

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button").className).toContain("hover:bg-accent");

    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole("button").className).toContain("underline-offset");
  });

  it("renders different sizes", () => {
    const { rerender } = render(<Button size="default">Default</Button>);
    expect(screen.getByRole("button").className).toContain("h-9");

    rerender(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button").className).toContain("h-8");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button").className).toContain("h-10");

    rerender(<Button size="icon">Icon</Button>);
    expect(screen.getByRole("button").className).toContain("size-9");
  });

  it("accepts custom className", () => {
    render(<Button className="custom-class">Click me</Button>);

    expect(screen.getByRole("button").className).toContain("custom-class");
  });

  it("can be disabled", () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveProperty("disabled", true);
  });

  it("renders as custom element with render prop", () => {
    render(
      <MemoryRouter>
        <Button render={<Link to="/test" />}>Link Button</Button>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link");
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/test");
    // Should have button styles applied to the link
    expect(link.className).toContain("inline-flex");
  });
});
