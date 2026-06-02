import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Alert, AlertTitle, AlertDescription } from "./alert";

afterEach(() => {
  cleanup();
});

describe("Alert", () => {
  describe("snapshots", () => {
    it("default variant", () => {
      const { container } = render(
        <Alert>
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>Description</AlertDescription>
        </Alert>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("success variant", () => {
      const { container } = render(
        <Alert variant="success">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Operation completed</AlertDescription>
        </Alert>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("error variant", () => {
      const { container } = render(
        <Alert variant="error">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("neutral variant", () => {
      const { container } = render(
        <Alert variant="neutral">
          <AlertTitle>Info</AlertTitle>
          <AlertDescription>Note this</AlertDescription>
        </Alert>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders with role=alert", () => {
    render(<Alert>Content</Alert>);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("renders title and description", () => {
    render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>,
    );
    expect(screen.getByText("Test Title")).toBeDefined();
    expect(screen.getByText("Test Description")).toBeDefined();
  });

  it("accepts custom className", () => {
    render(<Alert className="astw:mt-4">Content</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("astw:mt-4");
  });
});
