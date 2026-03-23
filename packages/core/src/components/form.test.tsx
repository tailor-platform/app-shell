import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Form } from "./form";
import { Field } from "./field";

afterEach(() => {
  cleanup();
});

describe("Form", () => {
  describe("snapshots", () => {
    it("basic form with a field", () => {
      const { container } = render(
        <Form>
          <Field.Root name="url">
            <Field.Label>Homepage</Field.Label>
            <Field.Control type="url" />
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("form with custom className", () => {
      const { container } = render(
        <Form className="custom-form">
          <div>Content</div>
        </Form>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("form with noValidate", () => {
      const { container } = render(
        <Form noValidate>
          <Field.Root name="email">
            <Field.Control type="email" required />
          </Field.Root>
        </Form>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders children", () => {
    render(
      <Form>
        <span>Form content</span>
      </Form>,
    );
    expect(screen.getByText("Form content")).toBeDefined();
  });

  it("renders as a form element", () => {
    const { container } = render(
      <Form>
        <span>Content</span>
      </Form>,
    );
    expect(container.querySelector("form")).toBeDefined();
  });

  it("sets noValidate on the form element", () => {
    const { container } = render(
      <Form noValidate>
        <span>Content</span>
      </Form>,
    );
    const form = container.querySelector("form");
    expect(form?.noValidate).toBe(true);
  });

  it("forwards ref to the form element", () => {
    const ref = { current: null } as React.RefObject<HTMLFormElement | null>;
    render(
      <Form ref={ref}>
        <span>Content</span>
      </Form>,
    );
    expect(ref.current).toBeInstanceOf(HTMLFormElement);
  });
});
