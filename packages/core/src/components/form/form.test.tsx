import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Controller, useForm } from "react-hook-form";
import { Form } from "./form";
import { Field } from "../field";

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

  it("routes server errors to matching Field.Error", () => {
    const { rerender } = render(
      <Form>
        <Field.Root name="url">
          <Field.Label>URL</Field.Label>
          <Field.Control type="url" />
          <Field.Error>Server says invalid</Field.Error>
        </Field.Root>
      </Form>,
    );
    expect(screen.queryByText("Server says invalid")).toBeNull();

    rerender(
      <Form errors={{ url: "Server says invalid" }}>
        <Field.Root name="url">
          <Field.Label>URL</Field.Label>
          <Field.Control type="url" />
          <Field.Error>Server says invalid</Field.Error>
        </Field.Root>
      </Form>,
    );
    expect(screen.getByText("Server says invalid")).not.toBeNull();
  });

  it("works with react-hook-form handleSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    function TestForm() {
      const form = useForm<{ email: string }>({ defaultValues: { email: "" } });

      return (
        <Form onSubmit={form.handleSubmit(onSubmit)}>
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field.Root name={field.name} {...fieldState}>
                <Field.Label>Email</Field.Label>
                <Field.Control {...field} type="email" />
                {fieldState.error && (
                  <Field.Error match={true}>{fieldState.error.message}</Field.Error>
                )}
              </Field.Root>
            )}
          />
          <button type="submit">Submit</button>
          <button type="button" onClick={() => form.reset()}>
            Reset
          </button>
        </Form>
      );
    }

    render(<TestForm />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        { email: "ada@example.com" },
        expect.objectContaining({ _reactName: "onSubmit" }),
      );
    });

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect((screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement).value).toBe("");
  });
});
