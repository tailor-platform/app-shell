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
      expect(container.querySelector("[data-touched]")).toBeDefined();
    });

    it("maps isDirty to dirty", () => {
      const { container } = render(
        <Field.Root name="test" isDirty>
          <Field.Control />
        </Field.Root>,
      );
      expect(container.querySelector("[data-dirty]")).toBeDefined();
    });

    it("sets invalid when error is provided", () => {
      const { container } = render(
        <Field.Root name="test" error={{ message: "Required" }}>
          <Field.Control />
        </Field.Root>,
      );
      expect(container.querySelector("[data-invalid]")).toBeDefined();
    });
  });
});
