import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { Stepper } from "./stepper";
import type { StepperStep } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const STEPS: StepperStep[] = [
  { id: "supplier", label: "Supplier", status: "complete" },
  { id: "lines", label: "Lines", status: "current", description: "Add at least one line" },
  { id: "approval", label: "Approval", status: "skipped" },
  { id: "review", label: "Review", status: "upcoming" },
];

const renderStepper = (ui: React.ReactElement, locale = "en") =>
  render(ui, { wrapper: createAppShellWrapper(locale) });

const filledConnectors = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-slot="stepper-connector"]')).map((c) =>
    c.className.includes("astw:bg-primary"),
  );

const stepEls = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-slot="stepper-step"]'));

describe("Stepper", () => {
  // ==========================================================================
  // Snapshots
  // ==========================================================================

  describe("snapshots", () => {
    it("horizontal", () => {
      const { container } = renderStepper(<Stepper aria-label="New order" steps={STEPS} />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("vertical", () => {
      const { container } = renderStepper(
        <Stepper aria-label="New order" orientation="vertical" steps={STEPS} />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  // ==========================================================================
  // Structure and status
  // ==========================================================================

  it("renders an ordered list of steps with their status", () => {
    renderStepper(<Stepper aria-label="New order" steps={STEPS} />);
    const list = screen.getByRole("list", { name: "New order" });
    expect(list.tagName).toBe("OL");
    expect(stepEls().map((el) => el.getAttribute("data-status"))).toEqual([
      "complete",
      "current",
      "skipped",
      "upcoming",
    ]);
  });

  it("marks only the current step with aria-current", () => {
    renderStepper(<Stepper steps={STEPS} />);
    const current = stepEls().filter((el) => el.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain("Lines");
  });

  it("tells screen readers where the other steps stand", () => {
    renderStepper(<Stepper steps={STEPS} />);
    const [supplier, lines, approval, review] = stepEls();
    expect(supplier.textContent).toContain("Completed");
    expect(lines.textContent).not.toContain("Completed");
    expect(approval.textContent).toContain("Skipped");
    expect(review.textContent).toContain("Not started");
  });

  it("numbers steps and shows a check on completed ones", () => {
    renderStepper(<Stepper steps={STEPS} />);
    const markers = Array.from(document.querySelectorAll('[data-slot="stepper-marker"]'));
    expect(markers[0].querySelector("svg")).not.toBeNull();
    expect(markers.slice(1).map((m) => m.textContent)).toEqual(["2", "3", "4"]);
  });

  it("fills the line up to the furthest step reached", () => {
    renderStepper(<Stepper steps={STEPS} />);
    // Lines is current, so only supplier→lines is filled; the skipped step after it was never reached
    expect(filledConnectors()).toEqual([true, false, false]);
  });

  it("fills through a skipped step that lies before the furthest step reached", () => {
    renderStepper(
      <Stepper
        steps={[
          { id: "qg1", label: "QG1", status: "complete" },
          { id: "qg2", label: "QG2", status: "skipped" },
          { id: "qg3", label: "QG3", status: "current" },
          { id: "qg4", label: "QG4", status: "upcoming" },
        ]}
      />,
    );
    expect(filledConnectors()).toEqual([true, true, false]);
  });

  it("names the list with a translated default", () => {
    renderStepper(<Stepper steps={STEPS} />);
    expect(screen.getByRole("list", { name: "Progress" })).toBeDefined();
    cleanup();
    renderStepper(<Stepper steps={STEPS} />, "ja");
    expect(screen.getByRole("list", { name: "進捗" })).toBeDefined();
  });

  it("types onStepClick with the step ids", () => {
    const steps = [
      { id: "supplier", label: "Supplier", status: "complete" },
      { id: "review", label: "Review", status: "current" },
    ] satisfies StepperStep<"supplier" | "review">[];
    renderStepper(
      <Stepper
        steps={steps}
        onStepClick={(id) => {
          expectTypeOf(id).toEqualTypeOf<"supplier" | "review">();
        }}
      />,
    );
  });

  it("renders the badge and description slots", () => {
    renderStepper(
      <Stepper
        steps={[
          {
            id: "qg1",
            label: "QG1",
            status: "current",
            badge: <span>Next</span>,
            description: "Due 12 Nov",
          },
        ]}
      />,
    );
    expect(screen.getByText("Next")).toBeDefined();
    expect(screen.getByText("Due 12 Nov")).toBeDefined();
  });

  // ==========================================================================
  // Narrow containers
  // ==========================================================================

  it("adds a 'Step n of total' caption for narrow containers when horizontal", () => {
    const { rerender } = renderStepper(<Stepper steps={STEPS} />);
    const caption = document.querySelector('[data-slot="stepper-caption"]');
    expect(caption?.textContent).toBe("Step 2 of 4Lines");
    expect(caption?.getAttribute("aria-hidden")).toBe("true");

    rerender(<Stepper orientation="vertical" steps={STEPS} />);
    expect(document.querySelector('[data-slot="stepper-caption"]')).toBeNull();
  });

  it("translates the caption and status text", () => {
    renderStepper(<Stepper steps={STEPS} />, "ja");
    expect(document.querySelector('[data-slot="stepper-caption"]')?.textContent).toBe(
      "ステップ 2 / 4Lines",
    );
    expect(stepEls()[0].textContent).toContain("完了");
  });

  // ==========================================================================
  // Clicking
  // ==========================================================================

  it("makes only completed steps clickable when onStepClick is set", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    renderStepper(<Stepper steps={STEPS} onStepClick={onStepClick} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);
    expect(onStepClick).toHaveBeenCalledWith("supplier");
  });

  it("renders no buttons without onStepClick", () => {
    renderStepper(<Stepper steps={STEPS} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  // ==========================================================================
  // Narrow containers: markers carry a tooltip and the click target
  // ==========================================================================

  describe("in a narrow container", () => {
    const stubWidth = (width: number) => {
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width);
    };

    it("moves the click target from the hidden label to the marker", async () => {
      stubWidth(320);
      const user = userEvent.setup();
      const onStepClick = vi.fn();
      renderStepper(<Stepper steps={STEPS} onStepClick={onStepClick} />);

      // One focus stop, and it's the visible marker — not the visually hidden label
      const button = await screen.findByRole("button", { name: /^Supplier ?, Completed$/ });
      expect(screen.getAllByRole("button")).toHaveLength(1);
      expect(button.querySelector('[data-slot="stepper-marker"]')).not.toBeNull();

      await user.click(button);
      expect(onStepClick).toHaveBeenCalledWith("supplier");
    });

    it("names each step in a tooltip on its marker", async () => {
      stubWidth(320);
      const user = userEvent.setup();
      renderStepper(<Stepper steps={STEPS} />);

      const triggers = await waitFor(() => {
        const found = document.querySelectorAll<HTMLElement>(
          '[data-slot="stepper-marker-trigger"]',
        );
        expect(found).toHaveLength(4);
        return found;
      });

      await user.hover(triggers[3]);
      const tooltip = await waitFor(() => {
        const content = document.querySelector('[data-slot="tooltip-content"]');
        expect(content).not.toBeNull();
        return content!;
      });
      expect(tooltip.textContent).toContain("Review");
      expect(tooltip.textContent).toContain("Not started");
    });

    it("keeps the label as the click target and adds no tooltips when wide", () => {
      stubWidth(800);
      renderStepper(<Stepper steps={STEPS} onStepClick={() => {}} />);
      expect(document.querySelector('[data-slot="stepper-marker-trigger"]')).toBeNull();
      const button = screen.getByRole("button", { name: /^Supplier ?, Completed$/ });
      expect(button.querySelector('[data-slot="stepper-marker"]')).toBeNull();
    });

    it("never goes compact when vertical", () => {
      stubWidth(320);
      renderStepper(<Stepper orientation="vertical" steps={STEPS} />);
      expect(document.querySelector('[data-slot="stepper-marker-trigger"]')).toBeNull();
    });
  });
});
