import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FormLayout } from "./form-layout";
import { Field } from "../field";
import { Fieldset } from "../fieldset";

afterEach(() => {
  cleanup();
});

const getGrid = (container: HTMLElement) =>
  container.querySelector(
    '[data-slot="form-layout"] > [data-slot="form-layout-grid"]',
  ) as HTMLElement;

describe("FormLayout", () => {
  // ==========================================================================
  // Snapshots — DOM structure for representative configurations
  // ==========================================================================

  describe("snapshots", () => {
    it("fields in a two-column grid", () => {
      const { container } = render(
        <FormLayout columns={2}>
          <Field.Root name="name">
            <Field.Label required>Name</Field.Label>
            <Field.Control required />
          </Field.Root>
          <Field.Root name="notes" span="full">
            <Field.Label>Notes</Field.Label>
            <Field.Control />
          </Field.Root>
        </FormLayout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("card section with header and actions", () => {
      const { container } = render(
        <FormLayout columns={3}>
          <FormLayout.Section title="Delivery" description="Where goods arrive" action="Copy">
            <Field.Root name="warehouse">
              <Field.Label>Warehouse</Field.Label>
              <Field.Control />
            </Field.Root>
          </FormLayout.Section>
          <FormLayout.Actions sticky start="Draft">
            <button type="button">Cancel</button>
            <button type="submit">Save</button>
          </FormLayout.Actions>
        </FormLayout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("plain section", () => {
      const { container } = render(
        <FormLayout>
          <FormLayout.Section variant="plain" title="Supplier">
            <Field.Root name="supplier">
              <Field.Label>Supplier</Field.Label>
              <Field.Control />
            </Field.Root>
          </FormLayout.Section>
        </FormLayout>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  // ==========================================================================
  // Columns and spans
  // ==========================================================================

  it("defaults to two columns that step down by container width", () => {
    const { container } = render(
      <FormLayout>
        <div />
      </FormLayout>,
    );
    const grid = getGrid(container);
    expect(grid.className).toContain("astw:grid-cols-1");
    expect(grid.className).toContain("astw:@[400px]:grid-cols-2");
    expect(grid.className).not.toContain("grid-cols-3");
  });

  it("adds a step per column up to the requested maximum", () => {
    const { container } = render(
      <FormLayout columns={4}>
        <div />
      </FormLayout>,
    );
    const grid = getGrid(container);
    expect(grid.className).toContain("astw:@[640px]:grid-cols-3");
    expect(grid.className).toContain("astw:@[880px]:grid-cols-4");
  });

  it("only widens span 3 where three columns exist", () => {
    const { container: two } = render(
      <FormLayout columns={2}>
        <div />
      </FormLayout>,
    );
    expect(getGrid(two).className).not.toContain("col-span-3");
    cleanup();

    const { container: three } = render(
      <FormLayout columns={3}>
        <div />
      </FormLayout>,
    );
    expect(getGrid(three).className).toContain("astw:@[640px]:[&>[data-span='3']]:col-span-3");
  });

  it("makes a field holding a Textarea full width unless it sets its own span", () => {
    const { container } = render(
      <FormLayout>
        <Field.Root name="notes">
          <Field.Label>Notes</Field.Label>
          <textarea />
        </Field.Root>
        <Field.Root name="summary" span={2}>
          <Field.Label>Summary</Field.Label>
          <textarea />
        </Field.Root>
      </FormLayout>,
    );
    const grid = getGrid(container);
    // The rule lives on the grid and only matches fields without a `data-span`
    expect(grid.className).toContain(
      "astw:[&>[data-slot=field]:has(textarea):not([data-span])]:col-span-full",
    );
    const [notes, summary] = Array.from(grid.querySelectorAll('[data-slot="field"]'));
    expect(notes.hasAttribute("data-span")).toBe(false);
    expect(summary.getAttribute("data-span")).toBe("2");
  });

  it("forwards span to Field.Root, Fieldset.Root and FormLayout.Item", () => {
    const { container } = render(
      <FormLayout columns={3}>
        <Field.Root name="a" span={2}>
          <Field.Control />
        </Field.Root>
        <Fieldset.Root span="full">
          <Fieldset.Legend>Group</Fieldset.Legend>
        </Fieldset.Root>
        <FormLayout.Item span={3}>Custom</FormLayout.Item>
      </FormLayout>,
    );
    expect(container.querySelector('[data-slot="field"]')!.getAttribute("data-span")).toBe("2");
    expect(container.querySelector('[data-slot="fieldset"]')!.getAttribute("data-span")).toBe(
      "full",
    );
    expect(
      container.querySelector('[data-slot="form-layout-item"]')!.getAttribute("data-span"),
    ).toBe("3");
  });

  // ==========================================================================
  // Sections
  // ==========================================================================

  it("names the section's fieldset with its title", () => {
    render(
      <FormLayout>
        <FormLayout.Section title="Delivery">
          <Field.Root name="warehouse">
            <Field.Control />
          </Field.Root>
        </FormLayout.Section>
      </FormLayout>,
    );
    expect(screen.getByRole("group", { name: "Delivery" })).toBeDefined();
  });

  it("renders the section title as a heading inside the legend", () => {
    render(
      <FormLayout>
        <FormLayout.Section title="Delivery" />
      </FormLayout>,
    );
    const heading = screen.getByRole("heading", { name: "Delivery" });
    expect(heading.tagName).toBe("H3");
    expect(heading.parentElement!.getAttribute("data-slot")).toBe("form-layout-section-title");
  });

  it("describes the section's fieldset with its description", () => {
    render(
      <FormLayout>
        <FormLayout.Section title="Delivery" description="Where goods arrive" />
        <FormLayout.Section title="Notes" />
      </FormLayout>,
    );
    const delivery = screen.getByRole("group", { name: "Delivery" });
    const describedBy = delivery.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)!.textContent).toBe("Where goods arrive");
    expect(screen.getByRole("group", { name: "Notes" }).hasAttribute("aria-describedby")).toBe(
      false,
    );
  });

  it("draws a plain section's divider only after another plain section", () => {
    const { container } = render(
      <FormLayout>
        <FormLayout.Item span="full">Notice</FormLayout.Item>
        <FormLayout.Section variant="plain" title="A" />
        <FormLayout.Section variant="plain" title="B" />
      </FormLayout>,
    );
    const [a] = Array.from(container.querySelectorAll('[data-slot="form-layout-section"]'));
    // The border comes from a sibling selector, so neither section sets an
    // unconditional `border-t`.
    expect(a.className).not.toMatch(/(^|\s)astw:border-t(\s|$)/);
    expect(a.className).toContain(
      "astw:[[data-slot=form-layout-section][data-variant=plain]+&]:border-t",
    );
  });

  it("sections inherit the layout's columns unless they set their own", () => {
    const { container } = render(
      <FormLayout columns={4}>
        <FormLayout.Section title="A">
          <div />
        </FormLayout.Section>
        <FormLayout.Section title="B" columns={2}>
          <div />
        </FormLayout.Section>
      </FormLayout>,
    );
    const [a, b] = Array.from(
      container.querySelectorAll(
        '[data-slot="form-layout-section"] [data-slot="form-layout-grid"]',
      ),
    );
    expect(a.className).toContain("astw:@[880px]:grid-cols-4");
    expect(b.className).not.toContain("grid-cols-3");
  });

  it("disables every field in a disabled section", () => {
    render(
      <FormLayout>
        <FormLayout.Section title="Locked" disabled>
          <Field.Root name="a">
            <Field.Label>A</Field.Label>
            <Field.Control />
          </Field.Root>
        </FormLayout.Section>
      </FormLayout>,
    );
    expect((screen.getByLabelText("A") as HTMLInputElement).disabled).toBe(true);
  });

  it("puts the section id on the outer element for anchor links", () => {
    const { container } = render(
      <FormLayout>
        <FormLayout.Section id="section-delivery" title="Delivery" />
      </FormLayout>,
    );
    expect(container.querySelector("#section-delivery")!.getAttribute("data-slot")).toBe(
      "form-layout-section",
    );
  });

  // ==========================================================================
  // Actions
  // ==========================================================================

  it("renders start content before the buttons and only sticks when asked", () => {
    const { container, rerender } = render(
      <FormLayout>
        <FormLayout.Actions start="Draft">
          <button type="submit">Save</button>
        </FormLayout.Actions>
      </FormLayout>,
    );
    const actions = container.querySelector('[data-slot="form-layout-actions"]')!;
    expect(actions!.hasAttribute("data-sticky")).toBe(false);
    expect(actions.textContent).toBe("DraftSave");

    rerender(
      <FormLayout>
        <FormLayout.Actions sticky>
          <button type="submit">Save</button>
        </FormLayout.Actions>
      </FormLayout>,
    );
    expect(
      container.querySelector('[data-slot="form-layout-actions"]')!.hasAttribute("data-sticky"),
    ).toBe(true);
  });
});
