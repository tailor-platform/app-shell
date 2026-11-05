import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Table } from "@/components/table";
import { createAppShellWrapper } from "../../../../../tests/test-utils";
import { BooleanEditor } from "./boolean";

afterEach(cleanup);

function Harness({ onCommit }: { onCommit: (value: boolean) => void }) {
  const [value, setValue] = useState(false);
  return (
    <Table.Root>
      <Table.Body>
        <Table.Row>
          <Table.Cell className="astw:relative">
            <span aria-hidden="true">{value ? "Yes" : "No"}</span>
            <BooleanEditor
              value={value}
              ariaLabel="Expedite, line 1"
              onCommit={(next) => {
                onCommit(next);
                setValue(next);
              }}
            />
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  );
}

describe("BooleanEditor", () => {
  it("supports keyboard toggling and commits only boolean values", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />, { wrapper: createAppShellWrapper("en") });
    const checkbox = screen.getByRole("checkbox", { name: "Expedite, line 1" });
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    await user.tab();
    expect(document.activeElement).toBe(checkbox);
    await user.keyboard(" ");
    expect(onCommit).toHaveBeenLastCalledWith(true);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    await user.keyboard(" ");
    expect(onCommit.mock.calls).toEqual([[true], [false]]);
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
  });

  it("uses the supplied error description and an out-of-flow overlay", () => {
    const { container } = render(
      <Table.Root>
        <Table.Body>
          <Table.Row>
            <Table.Cell>
              <span id="boolean-error">Requires approval</span>
              <BooleanEditor
                value={true}
                ariaLabel="Expedite"
                invalid
                describedBy="boolean-error"
                onCommit={() => {}}
              />
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>,
      { wrapper: createAppShellWrapper("en") },
    );
    const checkbox = screen.getByRole("checkbox", { name: "Expedite" });
    expect(checkbox.getAttribute("aria-invalid")).toBe("true");
    expect(checkbox.getAttribute("aria-describedby")).toBe("boolean-error");
    const overlay = container.querySelector("td > div")!;
    expect(overlay.className).toContain("astw:absolute");
    expect(overlay.className).toContain("astw:inset-0");
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });
});
