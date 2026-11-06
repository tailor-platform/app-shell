import { type ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Table } from "@/components/table";
import { useCellError, type CellSurfaceFailure } from "./cell-error";
import { EditableCellSurface } from "./cell-surface";

const labels = {
  errorHint: "Inspect the error",
  showError: "Show quantity error",
  errorDialog: "Quantity error details",
  closeError: "Close details",
};

afterEach(cleanup);

function Fixture({
  failure,
  cellProps = {},
  onLeave,
  onCancel = () => {},
  onRowClick,
  renderError,
  clearTintOnFocus,
}: {
  clearTintOnFocus?: boolean;
  failure?: CellSurfaceFailure;
  cellProps?: ComponentProps<typeof Table.Cell>;
  onLeave?: () => void;
  onCancel?: () => void;
  onRowClick?: () => void;
  renderError?: () => React.ReactNode;
}) {
  const { error } = useCellError({
    failure,
    message: "Quantity was rejected",
    renderContent: renderError,
  });
  return (
    <table>
      <tbody>
        <tr onClick={onRowClick}>
          <EditableCellSurface
            cellProps={cellProps}
            display="12 units"
            editing
            clearTintOnFocus={clearTintOnFocus}
            confirming={false}
            callbackError={error}
            labels={labels}
            errorSlot="fixture-cell-error"
            getFailure={() => failure}
            onEditorLeave={onLeave}
            onEditorCancel={onCancel}
          >
            <input aria-label="Quantity" aria-describedby={error?.id} defaultValue="12" />
          </EditableCellSurface>
        </tr>
      </tbody>
    </table>
  );
}

describe("EditableCellSurface without a table adapter or AppShell provider", () => {
  it("owns exactly one td and composes adapter cell handlers without firing row clicks", () => {
    const click = vi.fn();
    const keyDown = vi.fn();
    const keyCapture = vi.fn();
    const blur = vi.fn();
    const leave = vi.fn();
    const rowClick = vi.fn();
    render(
      <Fixture
        cellProps={{
          onClick: click,
          onKeyDown: keyDown,
          onKeyDownCapture: keyCapture,
          onBlur: blur,
        }}
        onLeave={leave}
        onRowClick={rowClick}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Quantity" });
    expect(screen.getAllByRole("cell")).toHaveLength(1);
    expect(input.closest("td")?.hasAttribute("data-editable")).toBe(true);
    fireEvent.click(input);
    expect(click).toHaveBeenCalledTimes(1);
    expect(rowClick).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(keyCapture).toHaveBeenCalledTimes(1);
    expect(keyDown).toHaveBeenCalledTimes(1);
    fireEvent.blur(input, { relatedTarget: document.body });
    expect(blur).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, false])(
    "keeps the tint while focused only when the adapter opts in (%s)",
    (clearTintOnFocus) => {
      render(<Fixture clearTintOnFocus={clearTintOnFocus} />);
      const input = screen.getByRole("textbox", { name: "Quantity" });
      input.focus();
      const cell = input.closest("td")!;
      expect(cell.className).toContain("background-image:linear-gradient");
      expect(cell.className.includes("astw:focus-within:[background-image:none]")).toBe(
        clearTintOnFocus !== false,
      );
      expect(document.activeElement).toBe(input);
    },
  );

  it("keeps localized error content and portaled controls in the same logical focus group", async () => {
    const leave = vi.fn();
    const cancel = vi.fn();
    render(<Fixture failure={{ source: "commit" }} onLeave={leave} onCancel={cancel} />);
    const input = screen.getByRole("textbox", { name: "Quantity" });
    const popup = await screen.findByRole("dialog", { name: labels.errorDialog });
    expect(popup.getAttribute("data-slot")).toBe("fixture-cell-error");
    expect(within(popup).getByText("Quantity was rejected")).toBeDefined();
    expect(screen.getByRole("button", { name: labels.showError })).toBeDefined();
    const description = document.getElementById(input.getAttribute("aria-describedby")!);
    expect(description?.textContent).toBe("Quantity was rejected. Inspect the error");
    const close = within(popup).getByRole("button", { name: labels.closeError });
    fireEvent.blur(input, { relatedTarget: close });
    expect(leave).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(cancel).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(cancel).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: "ArrowDown", altKey: true });
    expect(await screen.findByRole("dialog", { name: labels.errorDialog })).toBeDefined();
  });

  it("preserves an intentionally empty custom error body rather than replacing it", async () => {
    const renderError = vi.fn(() => null);
    render(<Fixture failure={{ source: "commit" }} renderError={renderError} />);
    const popup = await screen.findByRole("dialog", { name: labels.errorDialog });
    expect(within(popup).queryByText("Quantity was rejected")).toBeNull();
    expect(renderError).toHaveBeenCalled();
    expect(within(popup).getAllByRole("button")).toEqual([
      within(popup).getByRole("button", { name: labels.closeError }),
    ]);
  });

  it("honors a prevented adapter leave instead of confirming the cell", () => {
    const leave = vi.fn();
    const onBlur = vi.fn((event: React.FocusEvent<HTMLTableCellElement>) => event.preventDefault());
    render(<Fixture cellProps={{ onBlur }} onLeave={leave} />);
    fireEvent.blur(screen.getByRole("textbox", { name: "Quantity" }), {
      relatedTarget: document.body,
    });
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(leave).not.toHaveBeenCalled();
  });
});
