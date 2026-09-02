import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRHFForm } from "../../../tests/rhf-test-utils";
import { Field } from "../field";
import { Textarea } from "./textarea";

afterEach(() => {
  cleanup();
});

describe("Textarea", () => {
  describe("snapshots", () => {
    it("default", () => {
      const { container } = render(<Textarea placeholder="Add a note" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with rows", () => {
      const { container } = render(<Textarea rows={6} />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("disabled", () => {
      const { container } = render(<Textarea disabled placeholder="Disabled" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with custom className", () => {
      const { container } = render(<Textarea className="custom-class" />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders a textarea element, not an input", () => {
    render(<Textarea aria-label="Note" />);
    expect(screen.getByRole("textbox", { name: "Note" }).tagName).toBe("TEXTAREA");
  });

  it("forwards rows, the height knob callers actually have", () => {
    render(<Textarea aria-label="Note" rows={6} />);
    expect(screen.getByRole("textbox", { name: "Note" }).getAttribute("rows")).toBe("6");
  });

  it("has no fixed height so multi-line content is visible", () => {
    render(<Textarea aria-label="Note" />);
    const className = screen.getByRole("textbox", { name: "Note" }).className;
    // The single-line `h-9` from `inputBaseClasses` would clip the box to 36px.
    expect(className).not.toContain("astw:h-9");
    expect(className).toContain("astw:min-h-16");
    expect(className).toContain("astw:resize-y");
  });

  it("does not use field-sizing-content, which would make the browser ignore rows", () => {
    render(<Textarea aria-label="Note" rows={6} />);
    expect(screen.getByRole("textbox", { name: "Note" }).className).not.toContain(
      "field-sizing-content",
    );
  });

  it("stays full-width, which is why cols is not part of the API", () => {
    render(<Textarea aria-label="Note" />);
    // `w-full` always beats the width `cols` asks for, so accepting `cols`
    // would mean accepting a prop that can never take effect.
    expect(screen.getByRole("textbox", { name: "Note" }).className).toContain("astw:w-full");
  });

  it("accepts typed input when uncontrolled", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Note" />);

    const textarea = screen.getByRole("textbox", { name: "Note" }) as HTMLTextAreaElement;
    await user.type(textarea, "first line");

    expect(textarea.value).toBe("first line");
  });

  it("calls onChange when controlled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea aria-label="Note" value="" onChange={onChange} />);

    await user.type(screen.getByRole("textbox", { name: "Note" }), "a");

    expect(onChange).toHaveBeenCalled();
  });

  it("does not accept input when disabled", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Note" disabled />);

    const textarea = screen.getByRole("textbox", { name: "Note" }) as HTMLTextAreaElement;
    await user.type(textarea, "nope");

    expect(textarea.value).toBe("");
  });

  describe("Field integration", () => {
    it("is labelled by a sibling Field.Label", () => {
      render(
        <Field.Root name="description">
          <Field.Label>Description</Field.Label>
          <Textarea />
        </Field.Root>,
      );
      expect(screen.getByRole("textbox", { name: "Description" }).tagName).toBe("TEXTAREA");
    });

    it("inherits the invalid state from a surrounding Field.Root", () => {
      render(
        <Field.Root name="description" error={{ message: "Required" }}>
          <Field.Label>Description</Field.Label>
          <Textarea />
        </Field.Root>,
      );
      expect(
        screen.getByRole("textbox", { name: "Description" }).hasAttribute("data-invalid"),
      ).toBe(true);
    });

    it("inherits the disabled state from a surrounding Field.Root", () => {
      render(
        <Field.Root name="description" disabled>
          <Field.Label>Description</Field.Label>
          <Textarea />
        </Field.Root>,
      );
      expect(
        (screen.getByRole("textbox", { name: "Description" }) as HTMLTextAreaElement).disabled,
      ).toBe(true);
    });

    it("is described by a sibling Field.Description", () => {
      render(
        <Field.Root name="description">
          <Field.Label>Description</Field.Label>
          <Textarea />
          <Field.Description>Visible to the whole team.</Field.Description>
        </Field.Root>,
      );

      const textarea = screen.getByRole("textbox", { name: "Description" });
      const describedBy = textarea.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy!)?.textContent).toBe("Visible to the whole team.");
    });
  });

  describe("RHF integration", () => {
    it("uses defaultValues, submits changes, and resets", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderRHFForm({
        defaultValues: { description: "initial" },
        name: "description",
        onSubmit,
        render: ({ field, fieldState }) => (
          <Field.Root name={field.name} {...fieldState}>
            <Field.Label>Description</Field.Label>
            <Textarea {...field} />
          </Field.Root>
        ),
      });

      const textarea = screen.getByRole("textbox", { name: "Description" }) as HTMLTextAreaElement;
      expect(textarea.value).toBe("initial");

      await user.clear(textarea);
      await user.type(textarea, "updated");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ description: "updated" });
      });

      await user.click(screen.getByRole("button", { name: "Reset" }));
      expect(textarea.value).toBe("initial");
    });

    it("surfaces RHF validation errors after blur", async () => {
      const user = userEvent.setup();

      renderRHFForm({
        defaultValues: { description: "" },
        name: "description",
        mode: "onBlur",
        rules: { required: "Description is required" },
        render: ({ field, fieldState }) => (
          <Field.Root name={field.name} {...fieldState}>
            <Field.Label>Description</Field.Label>
            <Textarea {...field} />
            <Field.Error match={fieldState.invalid}>{fieldState.error?.message}</Field.Error>
          </Field.Root>
        ),
      });

      await user.click(screen.getByRole("textbox", { name: "Description" }));
      await user.tab();

      expect(await screen.findByText("Description is required")).toBeDefined();
    });
  });
});
