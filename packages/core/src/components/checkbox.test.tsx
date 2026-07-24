import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Checkbox } from "./checkbox";
import { Field } from "./field";

afterEach(() => {
  cleanup();
});

describe("Checkbox", () => {
  describe("snapshots", () => {
    it("unchecked", () => {
      const { container } = render(<Checkbox aria-label="Accept" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("checked", () => {
      const { container } = render(<Checkbox aria-label="Accept" defaultChecked />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("indeterminate", () => {
      const { container } = render(<Checkbox aria-label="Select all" indeterminate />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("disabled", () => {
      const { container } = render(<Checkbox aria-label="Accept" disabled />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with label", () => {
      const { container } = render(<Checkbox label="Subscribe to updates" />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders a checkbox role", () => {
    render(<Checkbox aria-label="Accept" />);
    const checkbox = screen.getByRole("checkbox", { name: "Accept" });
    expect(checkbox).toBeDefined();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
  });

  it("renders the label text", () => {
    render(<Checkbox label="Subscribe to updates" />);
    expect(screen.getByText("Subscribe to updates")).toBeDefined();
    // Label is associated so it resolves the checkbox's accessible name.
    expect(screen.getByRole("checkbox", { name: "Subscribe to updates" })).toBeDefined();
  });

  it("toggles when uncontrolled", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Accept" />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("false");

    await user.click(checkbox);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });

  it("calls onCheckedChange with a boolean when controlled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accept" checked={false} onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("checkbox"));

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0][0]).toBe(true);
  });

  it("toggles when the label text is clicked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Accept" checked={false} onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByText("Accept"));

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0][0]).toBe(true);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Accept" disabled onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(checkbox.hasAttribute("data-disabled")).toBe(true);
  });

  it("exposes the mixed state when indeterminate", () => {
    render(<Checkbox aria-label="Select all" indeterminate />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("mixed");
    expect(checkbox.hasAttribute("data-indeterminate")).toBe(true);
  });

  it("applies a custom className to the box when unlabelled", () => {
    render(<Checkbox aria-label="Accept" className="astw:custom-box" />);
    expect(screen.getByRole("checkbox").className).toContain("astw:custom-box");
  });

  describe("Field integration", () => {
    it("inherits the invalid state from a surrounding Field.Root", () => {
      render(
        <Field.Root name="terms" error={{ message: "Required" }}>
          <Checkbox label="Accept the terms" />
        </Field.Root>,
      );
      // Base UI propagates the field's invalid state onto nested controls, so
      // the box lights up destructive without a bespoke `error` prop.
      expect(screen.getByRole("checkbox").hasAttribute("data-invalid")).toBe(true);
    });

    it("inherits the disabled state from a surrounding Field.Root", () => {
      render(
        <Field.Root name="terms" disabled>
          <Checkbox label="Accept the terms" />
        </Field.Root>,
      );
      expect(screen.getByRole("checkbox").hasAttribute("data-disabled")).toBe(true);
    });
  });
});
