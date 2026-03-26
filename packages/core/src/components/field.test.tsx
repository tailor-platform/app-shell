import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
});
