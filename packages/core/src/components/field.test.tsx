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
        <Field.Root name="url" invalid>
          <Field.Label>Homepage</Field.Label>
          <Field.Control type="url" />
          <Field.Error match>Please enter a valid URL.</Field.Error>
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

  it("renders error when invalid", () => {
    render(
      <Field.Root name="test" invalid>
        <Field.Label>Test</Field.Label>
        <Field.Control />
        <Field.Error match>Error message</Field.Error>
      </Field.Root>,
    );
    expect(screen.getByText("Error message")).toBeDefined();
  });
});
