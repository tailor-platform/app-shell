import * as React from "react";
import * as ReactDOM from "react-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { EditableCard } from "./editable-card";
import { Field } from "../field";
import { Select } from "../select";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderCard = (ui: React.ReactElement, locale = "en") =>
  render(ui, { wrapper: createAppShellWrapper(locale) });

function OrderCard(props: Partial<React.ComponentProps<typeof EditableCard>>) {
  return (
    <EditableCard title="Order details" {...props}>
      <EditableCard.Field
        label="Status"
        value="Confirmed"
        readOnly={{ kind: "system", reason: "Set by the approval flow." }}
      />
      <EditableCard.Field name="shipTo" label="Ship to" value="Osaka DC" required>
        <Field.Control defaultValue="Osaka DC" required />
      </EditableCard.Field>
      <EditableCard.Field label="Created by" value="Priya Nair" />
      <EditableCard.Field name="notes" label="Notes" span="full" value="Dock 3">
        <Field.Control defaultValue="Dock 3" />
      </EditableCard.Field>
    </EditableCard>
  );
}

const cells = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-editable-card-field]")).map((cell) => [
    cell.querySelector('[data-slot="field-label"]')?.firstChild?.textContent,
    cell.getAttribute("data-span"),
  ]);

const cell = (label: string) =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-editable-card-field]")).find((el) =>
    el.querySelector('[data-slot="field-label"]')?.textContent?.startsWith(label),
  )!;

const input = (label: string) => cell(label).querySelector<HTMLInputElement>("input")!;

const button = (name: string) => screen.getByRole("button", { name });

/** A promise whose settling the test controls. */
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("EditableCard", () => {
  beforeEach(() => {
    // A failed save is logged; keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ==========================================================================
  // Snapshots — DOM structure in each mode
  // ==========================================================================

  describe("snapshots", () => {
    it("view mode", () => {
      const { container } = renderCard(<OrderCard />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("edit mode", () => {
      const { container } = renderCard(<OrderCard defaultEditing />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  // ==========================================================================
  // Modes
  // ==========================================================================

  it("shows values and an Edit button in view mode", () => {
    renderCard(<OrderCard />);
    expect(screen.getByText("Osaka DC")).toBeDefined();
    expect(button("Edit")).toBeDefined();
    expect(document.querySelector("input")).toBeNull();
    expect(document.querySelector('[data-slot="editable-card-read-only-hint"]')).toBeNull();
  });

  it("swaps editable values for controls and keeps the same cells", async () => {
    const user = userEvent.setup();
    renderCard(<OrderCard />);
    const before = cells();

    await user.click(button("Edit"));

    expect(cells()).toEqual(before);
    expect(document.querySelectorAll("input")).toHaveLength(2);
    expect(button("Save")).toBeDefined();
    expect(button("Cancel")).toBeDefined();
    expect(cell("Ship to").querySelector('[data-slot="field-required-marker"]')).not.toBeNull();
  });

  it("keeps read-only fields as values with a hint that gives the reason", async () => {
    const user = userEvent.setup();
    renderCard(<OrderCard />);
    await user.click(button("Edit"));

    expect(screen.getByText("Confirmed")).toBeDefined();
    const hint = button("Status: Set by the approval flow.");
    expect(hint.getAttribute("data-kind")).toBe("system");
    // A field with no control is read-only too, with the default reason
    expect(screen.getByText("Priya Nair")).toBeDefined();
    expect(screen.getByRole("button", { name: /^Created by: / })).toBeDefined();
  });

  it("shows a dash for an empty value", () => {
    renderCard(
      <EditableCard title="Order details">
        <EditableCard.Field label="Reference" value="" />
        <EditableCard.Field label="Approver" value={null} />
        <EditableCard.Field label="Discount" value={0} />
      </EditableCard>,
    );
    expect(cell("Reference").querySelector('[data-slot="field-value"]')?.textContent).toBe("–");
    expect(cell("Approver").querySelector('[data-slot="field-value"]')?.textContent).toBe("–");
    // 0 is a value, not an empty one
    expect(cell("Discount").querySelector('[data-slot="field-value"]')?.textContent).toBe("0");
  });

  it("renders Japanese labels", async () => {
    const user = userEvent.setup();
    renderCard(<OrderCard />, "ja");
    await user.click(button("編集"));

    expect(button("キャンセル")).toBeDefined();
    expect(button("保存")).toBeDefined();
    expect(button("Created by: この項目はここでは編集できません。")).toBeDefined();
  });

  it("throws when EditableCard.Field is used outside an EditableCard", () => {
    expect(() => renderCard(<EditableCard.Field label="Ship to" value="Osaka DC" />)).toThrowError(
      "<EditableCard.Field> must be used within <EditableCard>",
    );
  });

  // ==========================================================================
  // Cancelling
  // ==========================================================================

  it("returns to view mode on Cancel without saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const onEditingChange = vi.fn();
    renderCard(<OrderCard onSave={onSave} onCancel={onCancel} onEditingChange={onEditingChange} />);
    await user.click(button("Edit"));
    await user.click(button("Cancel"));

    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
    expect(document.querySelector("input")).toBeNull();
  });

  it("shows the original values when editing again after Cancel", async () => {
    const user = userEvent.setup();
    renderCard(<OrderCard />);
    await user.click(button("Edit"));
    await user.clear(input("Ship to"));
    await user.type(input("Ship to"), "Tokyo DC");
    await user.click(button("Cancel"));
    await user.click(button("Edit"));

    expect(input("Ship to").value).toBe("Osaka DC");
  });

  it("cancels on Escape", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderCard(<OrderCard onCancel={onCancel} />);
    await user.click(button("Edit"));
    await user.type(input("Notes"), " and 4");
    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(document.querySelector("input")).toBeNull();
    expect(document.activeElement).toBe(button("Edit"));
  });

  it("does not cancel on an Escape that closes a Select popup", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderCard(
      <EditableCard title="Order details" onCancel={onCancel}>
        <EditableCard.Field name="shipTo" label="Ship to" value="Osaka DC">
          <Select items={["Tokyo DC", "Osaka DC"]} defaultValue="Osaka DC" />
        </EditableCard.Field>
      </EditableCard>,
    );
    await user.click(button("Edit"));
    await user.click(screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByRole("listbox")).toBeDefined());

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(onCancel).not.toHaveBeenCalled();
    expect(button("Save")).toBeDefined();
  });

  it("ignores an Escape from a portal or one a control already handled", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderCard(
      <EditableCard title="Order details" onCancel={onCancel}>
        <EditableCard.Field name="shipTo" label="Ship to" value="Osaka DC">
          <Field.Control
            defaultValue="Osaka DC"
            onKeyDown={(event) => {
              if (event.key === "Escape") event.preventDefault();
            }}
          />
          {/* React bubbles events from a portal up its React tree */}
          {ReactDOM.createPortal(<input aria-label="Search warehouses" />, document.body)}
        </EditableCard.Field>
      </EditableCard>,
    );
    await user.click(button("Edit"));

    await user.click(screen.getByRole("textbox", { name: "Search warehouses" }));
    await user.keyboard("{Escape}");
    await user.click(input("Ship to"));
    await user.keyboard("{Escape}");

    expect(onCancel).not.toHaveBeenCalled();
    expect(button("Save")).toBeDefined();
  });

  // ==========================================================================
  // Focus
  // ==========================================================================

  it("moves focus to the first control on Edit and back to Edit on Cancel", async () => {
    const user = userEvent.setup();
    renderCard(<OrderCard />);
    await user.click(button("Edit"));

    // The Status hint comes first in the grid but is not a control
    expect(document.activeElement).toBe(input("Ship to"));

    await user.click(button("Cancel"));
    expect(document.activeElement).toBe(button("Edit"));
  });

  it("returns focus to Edit after a successful save", async () => {
    const user = userEvent.setup();
    const save = deferred();
    renderCard(<OrderCard onSave={() => save.promise} />);
    await user.click(button("Edit"));
    await user.click(button("Save"));
    save.resolve();

    await waitFor(() => expect(document.activeElement).toBe(button("Edit")));
  });

  it("leaves focus alone when a controlled card enters edit mode from outside", () => {
    const { rerender } = renderCard(<OrderCard editing={false} />);
    const outside = document.body;
    rerender(<OrderCard editing />);

    expect(document.activeElement).toBe(outside);
  });

  // ==========================================================================
  // Saving
  // ==========================================================================

  it("saves the named values and leaves edit mode", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderCard(<OrderCard onSave={onSave} />);
    await user.click(button("Edit"));
    await user.clear(input("Ship to"));
    await user.type(input("Ship to"), "Tokyo DC");
    await user.click(button("Save"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ shipTo: "Tokyo DC", notes: "Dock 3" });
    expect(document.querySelector("input")).toBeNull();
  });

  it("does not save while a required field is empty", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderCard(<OrderCard onSave={onSave} />);
    await user.click(button("Edit"));
    await user.clear(input("Ship to"));
    await user.click(button("Save"));

    expect(onSave).not.toHaveBeenCalled();
    expect(input("Ship to").getAttribute("aria-invalid")).toBe("true");
    expect(button("Save")).toBeDefined();
  });

  it("disables the buttons and marks the form busy while an async save is pending", async () => {
    const user = userEvent.setup();
    const save = deferred();
    renderCard(<OrderCard onSave={() => save.promise} />);
    await user.click(button("Edit"));
    await user.click(button("Save"));

    const form = document.querySelector("form")!;
    await waitFor(() => expect(form.getAttribute("aria-busy")).toBe("true"));
    expect(button("Save").hasAttribute("disabled")).toBe(true);
    expect(button("Cancel").hasAttribute("disabled")).toBe(true);

    save.resolve();
    await waitFor(() => expect(document.querySelector("input")).toBeNull());
    expect(form.hasAttribute("aria-busy")).toBe(false);
  });

  it("stays in edit mode when an async save rejects", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("Server error"));
    renderCard(<OrderCard onSave={onSave} />);
    await user.click(button("Edit"));
    await user.click(button("Save"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(button("Save").hasAttribute("disabled")).toBe(false));
    expect(document.querySelectorAll("input")).toHaveLength(2);
    expect(console.error).toHaveBeenCalledWith("[EditableCard] onSave failed:", expect.any(Error));
  });

  it("stays in edit mode when onSave throws", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(() => {
      throw new Error("Bug");
    });
    renderCard(<OrderCard onSave={onSave} />);
    await user.click(button("Edit"));
    await user.click(button("Save"));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll("input")).toHaveLength(2);
  });

  it("treats any thenable from onSave as pending", async () => {
    const user = userEvent.setup();
    let settle: (() => void) | undefined;
    // A promise from another realm or library: not `instanceof Promise`
    // oxlint-disable-next-line unicorn/no-thenable
    const thenable = { then: (onFulfilled: () => void) => void (settle = onFulfilled) };
    renderCard(<OrderCard onSave={() => thenable as unknown as Promise<void>} />);
    await user.click(button("Edit"));
    await user.click(button("Save"));

    expect(button("Save").hasAttribute("disabled")).toBe(true);
    settle?.();
    await waitFor(() => expect(document.querySelector("input")).toBeNull());
  });

  it("shows errors passed back from the server under their field", async () => {
    const user = userEvent.setup();
    function ServerCard() {
      const [errors, setErrors] = React.useState({});
      return (
        <OrderCard
          errors={errors}
          onSave={async () => {
            setErrors({ shipTo: "Tokyo DC is closed for stocktaking." });
            throw new Error("Validation failed");
          }}
        />
      );
    }
    renderCard(<ServerCard />);
    await user.click(button("Edit"));
    await user.click(button("Save"));

    await waitFor(() =>
      expect(cell("Ship to").querySelector('[data-slot="field-error"]')?.textContent).toBe(
        "Tokyo DC is closed for stocktaking.",
      ),
    );
    expect(button("Save")).toBeDefined();
    await waitFor(() => expect(document.activeElement).toBe(input("Ship to")));
  });

  // ==========================================================================
  // Control
  // ==========================================================================

  it("reports mode changes when controlled", async () => {
    const user = userEvent.setup();
    const onEditingChange = vi.fn();
    const { rerender } = renderCard(
      <OrderCard editing={false} onEditingChange={onEditingChange} />,
    );
    await user.click(button("Edit"));

    expect(onEditingChange).toHaveBeenCalledWith(true);
    // Still in view mode until the parent passes `editing`
    expect(document.querySelector("input")).toBeNull();

    rerender(<OrderCard editing onEditingChange={onEditingChange} />);
    expect(document.querySelectorAll("input")).toHaveLength(2);
  });

  it("disables Edit when editDisabled is set", () => {
    renderCard(<OrderCard editDisabled />);
    expect(button("Edit").hasAttribute("disabled")).toBe(true);
  });
});
