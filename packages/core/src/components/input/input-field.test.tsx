import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { Field } from "../field";
import { Form } from "../form";
import { useForm, type UseFormReturn } from "react-hook-form";
import { Input } from "./input";

afterEach(cleanup);

function SubmitForm({
  children,
  onFormSubmit,
  noValidate,
}: {
  children: React.ReactNode;
  onFormSubmit: (values: Record<string, unknown>) => void;
  noValidate?: boolean;
}) {
  return (
    <Form noValidate={noValidate} onFormSubmit={onFormSubmit}>
      {children}
      <button type="submit">Submit</button>
    </Form>
  );
}

describe("Input inside Field.Root", () => {
  it("links the label, description and error", () => {
    render(
      <Field.Root name="email" invalid>
        <Field.Label>Email</Field.Label>
        <Input />
        <Field.Description>Work address</Field.Description>
        <Field.Error match={true}>Required</Field.Error>
      </Field.Root>,
    );
    const input = screen.getByLabelText("Email");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain(screen.getByText("Work address").id);
    expect(describedBy).toContain(screen.getByText("Required").id);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("takes the field's name and disabled state", () => {
    render(
      <Field.Root name="field-name" disabled>
        <Input name="own-name" data-testid="input" />
      </Field.Root>,
    );
    const input = screen.getByTestId("input") as HTMLInputElement;
    expect(input.name).toBe("field-name");
    expect(input.disabled).toBe(true);
  });

  it("keeps its own name when the field has none", () => {
    render(
      <Field.Root>
        <Input name="own-name" data-testid="input" />
      </Field.Root>,
    );
    expect(screen.getByTestId("input").getAttribute("name")).toBe("own-name");
  });

  it("keeps an explicit id and the label that points at it", () => {
    render(
      <Field.Root name="query">
        <Field.Label htmlFor="combo">Find</Field.Label>
        <Input id="combo" />
      </Field.Root>,
    );
    expect(screen.getByLabelText("Find").id).toBe("combo");
    expect(screen.getByText("Find").getAttribute("for")).toBe("combo");
  });

  it("submits its value through Form, controlled or not", async () => {
    const onFormSubmit = vi.fn();
    const onChange = vi.fn();
    function Controlled() {
      const [value, setValue] = React.useState("");
      return (
        <Input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setValue(event.target.value);
          }}
        />
      );
    }
    render(
      <SubmitForm onFormSubmit={onFormSubmit}>
        <Field.Root name="title">
          <Field.Label>Title</Field.Label>
          <Input defaultValue="hello" />
        </Field.Root>
        <Field.Root name="note">
          <Field.Label>Note</Field.Label>
          <Controlled />
        </Field.Root>
      </SubmitForm>,
    );
    await userEvent.type(screen.getByLabelText("Note"), "ab");
    await userEvent.click(screen.getByText("Submit"));
    expect(onChange).toHaveBeenLastCalledWith("ab");
    expect(onFormSubmit.mock.calls[0][0]).toEqual({ title: "hello", note: "ab" });
  });

  it("blocks submit on a type mismatch, even with noValidate", async () => {
    const onFormSubmit = vi.fn();
    render(
      <SubmitForm noValidate onFormSubmit={onFormSubmit}>
        <Field.Root name="email">
          <Field.Label>Email</Field.Label>
          <Input type="email" />
        </Field.Root>
      </SubmitForm>,
    );
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.click(screen.getByText("Submit"));
    expect(onFormSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
  });

  it("gives a file to onChange and a placeholder path to onFormSubmit", async () => {
    const onFormSubmit = vi.fn();
    const onFile = vi.fn();
    render(
      <SubmitForm onFormSubmit={onFormSubmit}>
        <Field.Root name="upload">
          <Field.Label>Upload</Field.Label>
          <Input type="file" onChange={(event) => onFile(event.target.files?.[0])} />
        </Field.Root>
      </SubmitForm>,
    );
    const input = screen.getByLabelText("Upload") as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "photo.png", { type: "image/png" }));
    expect(onFile.mock.calls[0][0]).toBeInstanceOf(File);
    await userEvent.click(screen.getByText("Submit"));
    expect(onFormSubmit.mock.calls[0][0]).toEqual({ upload: "C:\\fakepath\\photo.png" });
    act(() => {
      input.value = "";
    });
    expect(input.value).toBe("");
  });

  it("gives every Input in one field the same id, so only the last value submits", async () => {
    // Documents the break for list controls that render several Inputs in one field.
    const onFormSubmit = vi.fn();
    render(
      <SubmitForm onFormSubmit={onFormSubmit}>
        <Field.Root name="tags">
          <Input data-testid="first" defaultValue="one" />
          <Input data-testid="second" defaultValue="two" />
        </Field.Root>
      </SubmitForm>,
    );
    expect(screen.getByTestId("first").id).toBe(screen.getByTestId("second").id);
    await userEvent.click(screen.getByText("Submit"));
    expect(onFormSubmit.mock.calls[0][0]).toEqual({ tags: "two" });
  });
});

describe("Input with React Hook Form register", () => {
  it("keeps register's name, ref and onChange inside a Field.Root", async () => {
    const form: { current?: UseFormReturn<{ endpoint: string }> } = {};
    function Harness() {
      const methods = useForm<{ endpoint: string }>({ defaultValues: { endpoint: "" } });
      form.current = methods;
      return (
        <Field.Root name="endpoint">
          <Field.Label>Endpoint</Field.Label>
          <Input {...methods.register("endpoint")} />
        </Field.Root>
      );
    }
    render(<Harness />);
    await userEvent.type(screen.getByLabelText("Endpoint"), "https://x.test");
    expect(form.current?.getValues("endpoint")).toBe("https://x.test");
    expect(screen.getByLabelText("Endpoint").getAttribute("name")).toBe("endpoint");
  });
});

describe("Input rendered by Field.Control", () => {
  it("stays a single control and warns once per page", async () => {
    const onFormSubmit = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <SubmitForm onFormSubmit={onFormSubmit}>
        <Field.Root name="title">
          <Field.Label>Title</Field.Label>
          <Field.Control render={<Input />} defaultValue="hello" />
          <Field.Description>Shown on the card</Field.Description>
        </Field.Root>
        <Field.Root name="subtitle">
          <Field.Control render={<Input />} defaultValue="world" />
        </Field.Root>
      </SubmitForm>,
    );
    expect(container.querySelectorAll("input")).toHaveLength(2);
    const input = screen.getByLabelText("Title");
    expect(input.getAttribute("data-slot")).toBe("field-control");
    expect(input.getAttribute("aria-describedby")).toBe(screen.getByText("Shown on the card").id);
    await userEvent.click(screen.getByText("Submit"));
    expect(onFormSubmit.mock.calls[0][0]).toEqual({ title: "hello", subtitle: "world" });
    const deprecations = warn.mock.calls.filter(([message]) =>
      String(message).includes("render={<Input />}"),
    );
    expect(deprecations).toHaveLength(1);
    warn.mockRestore();
  });
});

describe("Input outside Field.Root", () => {
  it("keeps its own name and disabled state", () => {
    render(<Input name="search" data-testid="input" />);
    const input = screen.getByTestId("input") as HTMLInputElement;
    expect(input.name).toBe("search");
    expect(input.disabled).toBe(false);
  });
});
