import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Fieldset } from "./fieldset";

afterEach(() => {
  cleanup();
});

describe("Fieldset", () => {
  describe("snapshots", () => {
    it("basic fieldset with legend", () => {
      const { container } = render(
        <Fieldset.Root>
          <Fieldset.Legend>Billing details</Fieldset.Legend>
          <div>Field content</div>
        </Fieldset.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("fieldset with custom className", () => {
      const { container } = render(
        <Fieldset.Root className="custom-fieldset">
          <Fieldset.Legend className="custom-legend">Section</Fieldset.Legend>
        </Fieldset.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders legend text", () => {
    render(
      <Fieldset.Root>
        <Fieldset.Legend>Group Label</Fieldset.Legend>
      </Fieldset.Root>,
    );
    expect(screen.getByText("Group Label")).toBeDefined();
  });
});
