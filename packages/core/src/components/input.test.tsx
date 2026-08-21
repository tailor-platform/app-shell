import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderRHFForm } from "../../tests/rhf-test-utils";
import { Input } from "./input";

afterEach(() => {
  cleanup();
});

describe("Input", () => {
  describe("snapshots", () => {
    it("default text input", () => {
      const { container } = render(<Input type="text" placeholder="Enter text" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("email input", () => {
      const { container } = render(<Input type="email" placeholder="Email" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("password input", () => {
      const { container } = render(<Input type="password" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("file input", () => {
      const { container } = render(<Input type="file" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("disabled input", () => {
      const { container } = render(<Input disabled placeholder="Disabled" />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with custom className", () => {
      const { container } = render(<Input className="custom-class" />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  describe("RHF integration", () => {
    it("uses defaultValues, submits changes, and resets", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderRHFForm({
        defaultValues: { email: "ada@example.com" },
        name: "email",
        onSubmit,
        render: ({ field }) => (
          <>
            <label htmlFor="email-input">Email</label>
            <Input {...field} id="email-input" type="email" />
          </>
        ),
      });

      const input = screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement;
      expect(input.value).toBe("ada@example.com");

      await user.clear(input);
      await user.type(input, "grace@example.com");
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ email: "grace@example.com" });
      });

      await user.click(screen.getByRole("button", { name: "Reset" }));
      expect(input.value).toBe("ada@example.com");
    });

    it("surfaces RHF validation errors after blur", async () => {
      const user = userEvent.setup();

      renderRHFForm({
        defaultValues: { email: "" },
        name: "email",
        mode: "onBlur",
        rules: { required: "Email is required" },
        render: ({ field, fieldState }) => (
          <>
            <label htmlFor="email-input">Email</label>
            <Input {...field} id="email-input" type="email" />
            {fieldState.error && <p>{fieldState.error.message}</p>}
          </>
        ),
      });

      await user.click(screen.getByRole("textbox", { name: "Email" }));
      await user.tab();

      expect(await screen.findByText("Email is required")).toBeDefined();
    });
  });
});
