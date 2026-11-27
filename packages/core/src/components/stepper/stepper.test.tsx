import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { Stepper } from "./stepper";
import type { StepperProgress, StepperStep } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const STEPS: StepperStep[] = [
  { id: "supplier", label: "Supplier" },
  { id: "approval", label: "Approval" },
  { id: "lines", label: "Lines", description: "Add at least one line" },
  { id: "review", label: "Review" },
];

// Supplier done, approval skipped, on lines, review still to come
const PROGRESS: StepperProgress = {
  state: "started",
  passedSteps: ["complete", "skipped"],
};

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

  it("matches the snapshot", () => {
    const { container } = renderStepper(
      <Stepper aria-label="New order" steps={STEPS} progress={PROGRESS} />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  // ==========================================================================
  // Structure and status
  // ==========================================================================

  it("renders an ordered list of steps with their status", () => {
    renderStepper(<Stepper aria-label="New order" steps={STEPS} progress={PROGRESS} />);
    const list = screen.getByRole("list", { name: "New order" });
    expect(list.tagName).toBe("OL");
    expect(stepEls().map((el) => el.getAttribute("data-status"))).toEqual([
      "complete",
      "skipped",
      "current",
      "upcoming",
    ]);
  });

  it("marks only the current step with aria-current", () => {
    renderStepper(<Stepper steps={STEPS} progress={PROGRESS} />);
    const current = stepEls().filter((el) => el.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain("Lines");
  });

  it("tells screen readers where the other steps stand", () => {
    renderStepper(<Stepper steps={STEPS} progress={PROGRESS} />);
    const [supplier, approval, lines, review] = stepEls();
    expect(supplier.textContent).toContain("Completed");
    expect(lines.textContent).not.toContain("Completed");
    expect(approval.textContent).toContain("Skipped");
    expect(review.textContent).toContain("Not started");
  });

  it("numbers steps and shows a check on completed ones", () => {
    renderStepper(<Stepper steps={STEPS} progress={PROGRESS} />);
    const markers = Array.from(document.querySelectorAll('[data-slot="stepper-marker"]'));
    expect(markers[0].querySelector("svg")).not.toBeNull();
    expect(markers.slice(1).map((m) => m.textContent)).toEqual(["2", "3", "4"]);
    // Skipped steps keep their number rather than a check
  });

  it("fills the line up to the current step, through skipped ones", () => {
    renderStepper(<Stepper steps={STEPS} progress={PROGRESS} />);
    expect(filledConnectors()).toEqual([true, true, false]);
  });

  it("shows every step upcoming before the flow starts", () => {
    renderStepper(<Stepper steps={STEPS} progress={{ state: "not-started" }} />);
    expect(stepEls().map((el) => el.getAttribute("data-status"))).toEqual([
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    expect(filledConnectors()).toEqual([false, false, false]);
    expect(document.querySelector('[data-slot="stepper-caption"]')).toBeNull();
  });

  it("starts at the first step with an empty outcome prefix", () => {
    renderStepper(<Stepper steps={STEPS} progress={{ state: "started", passedSteps: [] }} />);
    expect(stepEls().map((el) => el.getAttribute("data-status"))).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    expect(filledConnectors()).toEqual([false, false, false]);
  });

  it("completes a single-step flow when its outcome is supplied", () => {
    renderStepper(
      <Stepper steps={[STEPS[0]]} progress={{ state: "started", passedSteps: ["skipped"] }} />,
    );
    expect(stepEls()[0].getAttribute("data-status")).toBe("skipped");
    expect(stepEls()[0].hasAttribute("aria-current")).toBe(false);
    expect(document.querySelector('[data-slot="stepper-caption"]')).toBeNull();
  });

  it("shows every step passed once complete, keeping skipped ones", () => {
    renderStepper(
      <Stepper
        steps={STEPS}
        progress={{ state: "started", passedSteps: ["complete", "skipped", "complete", "skipped"] }}
      />,
    );
    expect(stepEls().map((el) => el.getAttribute("data-status"))).toEqual([
      "complete",
      "skipped",
      "complete",
      "skipped",
    ]);
    expect(filledConnectors()).toEqual([true, true, true]);
    expect(stepEls().some((el) => el.hasAttribute("aria-current"))).toBe(false);
  });

  // ==========================================================================
  // Invalid progress
  // ==========================================================================

  describe("warns about progress the types can't rule out", () => {
    const warnings = () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      return () => warn.mock.calls.map((call) => String(call[0]));
    };

    it("ignores outcomes beyond the step sequence", () => {
      const calls = warnings();
      renderStepper(
        <Stepper
          steps={STEPS}
          progress={{
            state: "started",
            passedSteps: ["complete", "skipped", "complete", "complete", "skipped"],
          }}
        />,
      );
      expect(stepEls().map((el) => el.getAttribute("data-status"))).toEqual([
        "complete",
        "skipped",
        "complete",
        "complete",
      ]);
      expect(stepEls().some((el) => el.hasAttribute("aria-current"))).toBe(false);
      expect(filledConnectors()).toEqual([true, true, true]);
      expect(calls()[0]).toContain("passedSteps contains more entries than steps");
    });

    it("warns about invalid runtime outcomes and shows them as complete", () => {
      const calls = warnings();
      renderStepper(
        <Stepper
          steps={STEPS}
          // @ts-expect-error Only complete and skipped are valid passed outcomes.
          progress={{ state: "started", passedSteps: ["current"] }}
        />,
      );
      expect(stepEls().map((el) => el.getAttribute("data-status"))).toEqual([
        "complete",
        "current",
        "upcoming",
        "upcoming",
      ]);
      expect(calls()[0]).toContain('passedSteps[0] must be "complete" or "skipped"');
    });

    it("reports duplicate step ids", () => {
      const calls = warnings();
      renderStepper(
        <Stepper
          steps={[
            { id: "a", label: "A" },
            { id: "a", label: "A again" },
          ]}
          progress={{ state: "not-started" }}
        />,
      );
      expect(calls()[0]).toContain(`duplicate step id "a"`);
    });
  });

  it("names the list with a translated default", () => {
    renderStepper(<Stepper steps={STEPS} progress={PROGRESS} />);
    expect(screen.getByRole("list", { name: "Progress" })).toBeDefined();
    cleanup();
    renderStepper(<Stepper steps={STEPS} progress={PROGRESS} />, "ja");
    expect(screen.getByRole("list", { name: "進捗" })).toBeDefined();
  });

  it("types onStepClick with the step ids and restricts passed outcomes", () => {
    renderStepper(
      <Stepper
        steps={[
          { id: "supplier", label: "Supplier" },
          { id: "review", label: "Review" },
        ]}
        progress={{ state: "started", passedSteps: ["complete"] }}
        onStepClick={(id) => {
          expectTypeOf(id).toEqualTypeOf<"supplier" | "review">();
        }}
      />,
    );
    renderStepper(
      <Stepper
        steps={[{ id: "supplier", label: "Supplier" }]}
        // @ts-expect-error Progress no longer accepts an independent current step ID.
        progress={{ state: "started", passedSteps: [], currentStepId: "supplier" }}
      />,
    );
  });

  it("renders the default label and description", () => {
    renderStepper(
      <Stepper
        steps={[{ id: "qg1", label: "QG1", description: "Due 12 Nov" }]}
        progress={{ state: "started", passedSteps: [] }}
      />,
    );
    expect(stepEls()[0].textContent).toContain("QG1");
    expect(screen.getByText("Due 12 Nov")).toBeDefined();
  });

  it("renders custom text with the label and derived status, keeping markers and announcements", () => {
    const renderText = vi.fn(({ label }: { label: React.ReactNode }) => (
      <span>
        {label} <span>Custom badge</span>
      </span>
    ));
    renderStepper(
      <Stepper
        steps={STEPS.map(({ id, label }) => ({ id, label, render: renderText }))}
        progress={PROGRESS}
      />,
    );
    expect(renderText.mock.calls.map(([state]) => state)).toEqual([
      { label: "Supplier", status: "complete" },
      { label: "Approval", status: "skipped" },
      { label: "Lines", status: "current" },
      { label: "Review", status: "upcoming" },
    ]);
    expect(screen.getAllByText("Custom badge")).toHaveLength(4);
    expect(screen.queryByText("Add at least one line")).toBeNull();
    const [supplier, approval, lines, review] = stepEls();
    expect(supplier.textContent).toContain("Completed");
    expect(approval.textContent).toContain("Skipped");
    expect(lines.getAttribute("aria-current")).toBe("step");
    expect(review.textContent).toContain("Not started");
    expect(document.querySelectorAll('[data-slot="stepper-marker"]')).toHaveLength(4);
    expect(filledConnectors()).toEqual([true, true, false]);
  });

  it("keeps custom passed steps keyboard-clickable with visible text, the common label, and status in the name", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    renderStepper(
      <Stepper
        steps={STEPS.map(({ id, label }) => ({
          id,
          label,
          render: () => (
            <span>
              <span>Overdue</span> <span>Due 12 Nov</span>
            </span>
          ),
        }))}
        progress={PROGRESS}
        onStepClick={onStepClick}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
    const supplier = screen.getByRole("button", {
      name: /^Overdue Due 12 Nov Supplier ?, Completed$/,
      description: "",
    });
    await user.tab();
    expect(document.activeElement).toBe(supplier);
    await user.keyboard("{Enter}");
    expect(onStepClick).toHaveBeenCalledWith("supplier");
    await user.click(
      screen.getByRole("button", { name: /^Overdue Due 12 Nov Approval ?, Skipped$/ }),
    );
    expect(onStepClick).toHaveBeenCalledWith("approval");
  });

  // ==========================================================================
  // Narrow containers
  // ==========================================================================

  it("adds a 'Step n of total' caption for narrow containers", () => {
    renderStepper(<Stepper steps={STEPS} progress={PROGRESS} />);
    const caption = document.querySelector('[data-slot="stepper-caption"]');
    expect(caption?.textContent).toBe("Step 3 of 4Lines");
    expect(caption?.getAttribute("aria-hidden")).toBe("true");
  });

  it("translates the caption and status text", () => {
    renderStepper(<Stepper steps={STEPS} progress={PROGRESS} />, "ja");
    expect(document.querySelector('[data-slot="stepper-caption"]')?.textContent).toBe(
      "ステップ 3 / 4Lines",
    );
    expect(stepEls()[0].textContent).toContain("完了");
  });

  // ==========================================================================
  // Clicking
  // ==========================================================================

  it("makes only passed steps — completed or skipped — clickable when onStepClick is set", async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    renderStepper(<Stepper steps={STEPS} progress={PROGRESS} onStepClick={onStepClick} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0]);
    expect(onStepClick).toHaveBeenCalledWith("supplier");
    await user.click(buttons[1]);
    expect(onStepClick).toHaveBeenCalledWith("approval");
  });

  it("renders no buttons without onStepClick", () => {
    renderStepper(<Stepper steps={STEPS} progress={PROGRESS} />);
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
      renderStepper(<Stepper steps={STEPS} progress={PROGRESS} onStepClick={onStepClick} />);

      // One focus stop, and it's the visible marker — not the visually hidden label
      const button = await screen.findByRole("button", { name: /^Supplier ?, Completed$/ });
      expect(screen.getAllByRole("button")).toHaveLength(2);
      expect(button.querySelector('[data-slot="stepper-marker"]')).not.toBeNull();

      await user.click(button);
      expect(onStepClick).toHaveBeenCalledWith("supplier");
    });

    it("names each step in a tooltip on its marker", async () => {
      stubWidth(320);
      const user = userEvent.setup();
      renderStepper(<Stepper steps={STEPS} progress={PROGRESS} />);

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

    it("uses the common label instead of custom content for captions, markers, and tooltips", async () => {
      stubWidth(320);
      const user = userEvent.setup();
      const onStepClick = vi.fn();
      renderStepper(
        <Stepper
          steps={STEPS.map(({ id, label }) => ({
            id,
            label,
            render: () => <span>Custom content</span>,
          }))}
          progress={PROGRESS}
          onStepClick={onStepClick}
        />,
      );
      const supplier = await screen.findByRole("button", { name: /^Supplier ?, Completed$/ });
      expect(supplier.querySelector('[data-slot="stepper-marker"]')).not.toBeNull();
      expect(screen.getAllByRole("button")).toHaveLength(2);
      expect(screen.queryByText("Custom content")).toBeNull();
      expect(document.querySelector('[data-slot="stepper-caption"]')?.textContent).toBe(
        "Step 3 of 4Lines",
      );
      await user.hover(supplier);
      await waitFor(() => {
        const tooltip = document.querySelector('[data-slot="tooltip-content"]');
        expect(tooltip?.textContent).toContain("Supplier");
        expect(tooltip?.textContent).not.toContain("Custom content");
      });
      await user.click(supplier);
      expect(onStepClick).toHaveBeenCalledWith("supplier");
    });

    it("keeps the label as the click target and adds no tooltips when wide", () => {
      stubWidth(800);
      renderStepper(<Stepper steps={STEPS} progress={PROGRESS} onStepClick={() => {}} />);
      expect(document.querySelector('[data-slot="stepper-marker-trigger"]')).toBeNull();
      const button = screen.getByRole("button", { name: /^Supplier ?, Completed$/ });
      expect(button.querySelector('[data-slot="stepper-marker"]')).toBeNull();
    });
  });
});
