import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRHFForm } from "../../../tests/rhf-test-utils";
import { Checkbox } from "../checkbox";
import { Select } from "../select";
import { Tree } from "../tree";
import { Field } from "./field";

afterEach(() => {
  cleanup();
});

describe("Field", () => {
  describe("snapshots", () => {
    it("basic field with label and control", () => {
      const { container } = render(
        <Field.Root name="username">
          <Field.Label>Username</Field.Label>
          <Field.Control placeholder="Enter username" />
        </Field.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("field with description", () => {
      const { container } = render(
        <Field.Root name="email">
          <Field.Label>Email</Field.Label>
          <Field.Control type="email" />
          <Field.Description>We will never share your email.</Field.Description>
        </Field.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("field with error", () => {
      const { container } = render(
        <Field.Root name="url" error={{ message: "Please enter a valid URL." }}>
          <Field.Label>Homepage</Field.Label>
          <Field.Control type="url" />
          <Field.Error match={true}>Please enter a valid URL.</Field.Error>
        </Field.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("disabled field", () => {
      const { container } = render(
        <Field.Root name="disabled-field" disabled>
          <Field.Label>Disabled</Field.Label>
          <Field.Control />
        </Field.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("field with custom className", () => {
      const { container } = render(
        <Field.Root name="custom" className="custom-class">
          <Field.Label className="label-class">Custom</Field.Label>
          <Field.Control className="control-class" />
        </Field.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders label text", () => {
    render(
      <Field.Root name="test">
        <Field.Label>Test Label</Field.Label>
        <Field.Control />
      </Field.Root>,
    );
    expect(screen.getByText("Test Label")).toBeDefined();
  });

  it("shows a visual-only required marker on the label", () => {
    render(
      <Field.Root name="test">
        <Field.Label required>Name</Field.Label>
        <Field.Control required />
      </Field.Root>,
    );
    const marker = document.querySelector('[data-slot="field-required-marker"]');
    expect(marker!.getAttribute("aria-hidden")).toBe("true");
    expect(marker?.textContent).toBe("*");
    // The accessible name stays the label text; `required` on the control is what's announced.
    expect((screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement).required).toBe(true);
  });

  it("renders no required marker by default", () => {
    render(
      <Field.Root name="test">
        <Field.Label>Name</Field.Label>
        <Field.Control />
      </Field.Root>,
    );
    expect(document.querySelector('[data-slot="field-required-marker"]')).toBeNull();
  });

  it("sets data-span from span for FormLayout", () => {
    const { container } = render(
      <Field.Root name="test" span="full">
        <Field.Control />
      </Field.Root>,
    );
    expect(container.querySelector('[data-slot="field"]')!.getAttribute("data-span")).toBe("full");
  });

  it("renders description text", () => {
    render(
      <Field.Root name="test">
        <Field.Label>Test</Field.Label>
        <Field.Control />
        <Field.Description>Help text</Field.Description>
      </Field.Root>,
    );
    expect(screen.getByText("Help text")).toBeDefined();
  });

  it("renders error when error is provided", () => {
    render(
      <Field.Root name="test" error={{ message: "Error message" }}>
        <Field.Label>Test</Field.Label>
        <Field.Control />
        <Field.Error match={true}>Error message</Field.Error>
      </Field.Root>,
    );
    expect(screen.getByText("Error message")).toBeDefined();
  });

  describe("RHF integration", () => {
    it("maps isTouched to touched", () => {
      const { container } = render(
        <Field.Root name="test" isTouched>
          <Field.Control />
        </Field.Root>,
      );
      expect(container.querySelector("[data-touched]")).not.toBeNull();
    });

    it("maps isDirty to dirty", () => {
      const { container } = render(
        <Field.Root name="test" isDirty>
          <Field.Control />
        </Field.Root>,
      );
      expect(container.querySelector("[data-dirty]")).not.toBeNull();
    });

    it("sets invalid when error is provided", () => {
      const { container } = render(
        <Field.Root name="test" error={{ message: "Required" }}>
          <Field.Control />
        </Field.Root>,
      );
      expect(container.querySelector("[data-invalid]")).not.toBeNull();
    });

    it("works with Controller field and fieldState", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderRHFForm({
        defaultValues: { name: "" },
        name: "name",
        rules: { required: "Name is required" },
        onSubmit,
        render: ({ field, fieldState }) => (
          <Field.Root name={field.name} {...fieldState}>
            <Field.Label>Name</Field.Label>
            <Field.Control {...field} />
            <Field.Error match={fieldState.invalid}>{fieldState.error?.message}</Field.Error>
          </Field.Root>
        ),
      });

      await user.click(screen.getByRole("button", { name: "Submit" }));
      expect(await screen.findByText("Name is required")).toBeDefined();
      expect(onSubmit).not.toHaveBeenCalled();

      await user.type(screen.getByRole("textbox", { name: "Name" }), "Ada");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ name: "Ada" });
      });
    });
  });

  describe("Validity", () => {
    it("invokes render callback with validity state", () => {
      render(
        <Field.Root name="username">
          <Field.Control required minLength={8} />
          <Field.Validity>
            {(state) => (
              <ul data-testid="validity-list">
                <li data-testid="valid">{state.validity.valid ? "valid" : "invalid"}</li>
                <li data-testid="too-short">{state.validity.tooShort ? "yes" : "no"}</li>
              </ul>
            )}
          </Field.Validity>
        </Field.Root>,
      );
      const list = screen.getByTestId("validity-list");
      expect(list).toBeDefined();
      expect(screen.getByTestId("valid")).toBeDefined();
      expect(screen.getByTestId("too-short")).toBeDefined();
    });
  });

  describe("multiple errors", () => {
    it("renders multiple catch-all errors when field is invalid", () => {
      render(
        <Field.Root name="email" error={{ message: "Server error" }}>
          <Field.Label>Email</Field.Label>
          <Field.Control type="email" />
          <Field.Error match={true}>This field has an error.</Field.Error>
          <Field.Error match={true}>Please fix before continuing.</Field.Error>
        </Field.Root>,
      );
      expect(screen.getByText("This field has an error.")).toBeDefined();
      expect(screen.getByText("Please fix before continuing.")).toBeDefined();
    });

    it("renders catch-all error when no match is specified", () => {
      render(
        <Field.Root name="test" error={{ message: "Something went wrong" }}>
          <Field.Label>Test</Field.Label>
          <Field.Control />
          <Field.Error match="typeMismatch">Type error</Field.Error>
          <Field.Error match={true}>Something went wrong</Field.Error>
        </Field.Root>,
      );
      expect(screen.getByText("Something went wrong")).toBeDefined();
    });
  });

  describe("render misuse warning", () => {
    it("warns when a self-wired control is passed to render", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Field.Root name="country">
          <Field.Control render={<Select items={["Japan"]} />} />
        </Field.Root>,
      );
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain("render={<Select />}");
      expect(warn.mock.calls[0][0]).toContain("directly under <Field.Root>");
      warn.mockRestore();
    });

    it("names the compound member", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Field.Root name="country">
          <Field.Control render={<Select.Async fetcher={async () => []} />} />
        </Field.Root>,
      );
      expect(warn.mock.calls[0][0]).toContain("render={<Select.Async />}");
      warn.mockRestore();
    });

    it("warns for Tree", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Field.Root name="bins">
          <Field.Control
            render={
              <Tree selectionMode="checkbox" items={[]} mapItem={() => ({ key: "", label: "" })} />
            }
          />
        </Field.Root>,
      );
      expect(warn.mock.calls[0][0]).toContain("render={<Tree />}");
      warn.mockRestore();
    });

    it("warns once across re-renders", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { rerender } = render(<Field.Control render={<Checkbox />} />);
      rerender(<Field.Control render={<Checkbox />} />);
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it("stays silent for a plain control or a native element", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Field.Root name="bio">
          <Field.Control />
          <Field.Control render={<textarea />} />
        </Field.Root>,
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe("Field.Value", () => {
    it("shows a read-only value at a control's height", () => {
      render(
        <Field.Root>
          <Field.Label>Supplier</Field.Label>
          <Field.Value>Kansai Textile Co.</Field.Value>
        </Field.Root>,
      );
      const value = screen.getByText("Kansai Textile Co.");
      expect(value.getAttribute("data-slot")).toBe("field-value");
      expect(value.className).toContain("astw:min-h-9");
      expect(document.querySelector("input")).toBeNull();
    });

    it("is named by the field's label", async () => {
      render(
        <Field.Root>
          <Field.Label>Supplier</Field.Label>
          <Field.Value>Kansai Textile Co.</Field.Value>
        </Field.Root>,
      );
      const value = await screen.findByRole("group", { name: "Supplier" });
      expect(value.textContent).toBe("Kansai Textile Co.");
      const label = screen.getByText("Supplier");
      expect(value.getAttribute("aria-labelledby")).toBe(label.id);
    });

    it("stays a plain element without a label", () => {
      render(
        <Field.Root>
          <Field.Value>Kansai Textile Co.</Field.Value>
        </Field.Root>,
      );
      const value = screen.getByText("Kansai Textile Co.");
      expect(value.hasAttribute("role")).toBe(false);
      expect(value.hasAttribute("aria-labelledby")).toBe(false);
    });

    it("takes an aria-label when there is no Field.Label", () => {
      render(<Field.Value aria-label="Supplier">Kansai Textile Co.</Field.Value>);
      expect(screen.getByRole("group", { name: "Supplier" }).textContent).toBe(
        "Kansai Textile Co.",
      );
    });
  });
});
