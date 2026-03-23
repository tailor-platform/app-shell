import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Avatar } from "./avatar";

afterEach(() => {
  cleanup();
});

describe("Avatar", () => {
  describe("snapshots", () => {
    it("fallback only", () => {
      const { container } = render(
        <Avatar.Root>
          <Avatar.Fallback>AB</Avatar.Fallback>
        </Avatar.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("size sm", () => {
      const { container } = render(
        <Avatar.Root size="sm">
          <Avatar.Fallback>CD</Avatar.Fallback>
        </Avatar.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("size lg", () => {
      const { container } = render(
        <Avatar.Root size="lg">
          <Avatar.Fallback>EF</Avatar.Fallback>
        </Avatar.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("shows fallback text when no image is provided", () => {
    render(
      <Avatar.Root>
        <Avatar.Fallback>XY</Avatar.Fallback>
      </Avatar.Root>,
    );
    expect(screen.getByText("XY")).toBeDefined();
  });

  it("shows fallback when image fails to load", async () => {
    render(
      <Avatar.Root>
        <Avatar.Image src="https://example.invalid/avatar-missing.png" alt="" />
        <Avatar.Fallback>ZZ</Avatar.Fallback>
      </Avatar.Root>,
    );
    expect(await screen.findByText("ZZ")).toBeDefined();
  });
});
