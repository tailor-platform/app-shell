import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Input } from "./input";

afterEach(() => {
  cleanup();
});

describe("Input", () => {
  describe("snapshots", () => {
    it("default text input", () => {
      const { container } = render(
        <Input type="text" placeholder="Enter text" />,
      );
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
});
