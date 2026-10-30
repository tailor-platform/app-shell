import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Field } from "../field";
import { Form } from "../form";
import { CheckboxTree } from "./CheckboxTree";
import type { CheckboxTreeSelection } from "./types";

/** Warehouses with bins. Bin codes repeat across warehouses (A1 is in both). */
type Node = { id: string; name: string; bins?: Node[]; locked?: boolean };

const WAREHOUSES: Node[] = [
  {
    id: "wh-x",
    name: "Warehouse X",
    bins: [
      { id: "A1", name: "X · A1" },
      { id: "A2", name: "X · A2" },
    ],
  },
  { id: "wh-y", name: "Warehouse Y", bins: [{ id: "A1", name: "Y · A1" }] },
  { id: "loose", name: "Loose stock" },
];

const mapItem = (item: Node) => ({
  key: item.id,
  label: item.name,
  children: item.bins,
  disabled: item.locked,
});

const rowFor = (label: string) => screen.getByText(label).closest("[role=treeitem]") as HTMLElement;
const checkedOf = (label: string) => rowFor(label).getAttribute("aria-checked");
const expand = async (user: ReturnType<typeof userEvent.setup>, label: string) =>
  user.click(screen.getByText(label));

afterEach(() => {
  cleanup();
});

describe("CheckboxTree", () => {
  it("renders inline, without a dialog, named by aria-label", () => {
    render(<CheckboxTree<Node> items={WAREHOUSES} mapItem={mapItem} aria-label="Bins" />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("tree", { name: "Bins" })).toBeDefined();
  });

  it("shows each item's label by default and searches on it", async () => {
    const user = userEvent.setup();
    render(<CheckboxTree<Node> items={WAREHOUSES} mapItem={mapItem} aria-label="Bins" />);

    expect(screen.getByText("Warehouse X")).toBeDefined();
    await user.type(screen.getByRole("searchbox"), "y · a1");

    expect(screen.getByText("Y · A1")).toBeDefined();
    expect(screen.queryByText("X · A1")).toBeNull();
  });

  it("gives renderItem and the columns the row state, and heads the columns", async () => {
    const user = userEvent.setup();
    render(
      <CheckboxTree<Node>
        items={WAREHOUSES}
        mapItem={mapItem}
        aria-label="Bins"
        itemHeader="Location"
        renderItem={({ item, depth, isLeaf }) => (
          <span>{`${item.name} (depth ${depth}${isLeaf ? ", leaf" : ""})`}</span>
        )}
        leadingColumn={{ header: "Icon", render: ({ isLeaf }) => (isLeaf ? "▪" : "▸") }}
        trailingColumn={{
          header: "State",
          render: ({ checked, indeterminate }) => {
            if (checked) return "all";
            return indeterminate ? "some" : "none";
          },
        }}
      />,
    );

    const header = document.querySelector("[data-slot=checkbox-tree-column-header]")!;
    expect(header.textContent).toContain("Icon");
    expect(header.textContent).toContain("Location");
    expect(header.textContent).toContain("State");

    await expand(user, "Warehouse X (depth 0)");
    await user.click(screen.getByText("X · A1 (depth 1, leaf)"));
    const parent = rowFor("Warehouse X (depth 0)");
    expect(parent.querySelector("[data-slot=checkbox-tree-trailing]")!.textContent).toBe("some");
    expect(parent.querySelector("[data-slot=checkbox-tree-leading]")!.textContent).toBe("▸");
  });

  it("shows focus on the search wrapper, since the input drops its own ring", () => {
    render(<CheckboxTree<Node> items={WAREHOUSES} mapItem={mapItem} aria-label="Bins" />);
    const wrapper = screen.getByRole("searchbox").parentElement!;
    expect(wrapper.className).toContain("focus-within:ring-[3px]");
  });

  describe('valueShape "keys" (default)', () => {
    it("selects a key wherever it appears, and reports keys plus the selected leaves", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <CheckboxTree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          onValueChange={onValueChange}
        />,
      );

      await expand(user, "Warehouse X");
      await expand(user, "Warehouse Y");
      await user.click(screen.getByText("X · A1"));

      // A1 is one key, so both bins tick.
      expect(checkedOf("X · A1")).toBe("true");
      expect(checkedOf("Y · A1")).toBe("true");
      expect(onValueChange).toHaveBeenLastCalledWith(["A1"], {
        selected: [
          expect.objectContaining({ key: "A1", path: ["wh-x", "A1"], parents: [WAREHOUSES[0]] }),
        ],
      });
    });

    it("pre-fills from defaultValue and keeps keys that aren't in the tree", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <CheckboxTree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          defaultValue={["loose", "not-loaded-yet"]}
          onValueChange={onValueChange}
        />,
      );

      expect(checkedOf("Loose stock")).toBe("true");
      await expand(user, "Warehouse X");
      await user.click(screen.getByText("X · A2"));

      expect(onValueChange).toHaveBeenLastCalledWith(
        ["A2", "loose", "not-loaded-yet"],
        expect.anything(),
      );
    });

    it("treats a controlled value reset to undefined as an empty selection", async () => {
      const user = userEvent.setup();
      function Resettable() {
        const [value, setValue] = React.useState<string[] | undefined>(undefined);
        return (
          <>
            <CheckboxTree<Node>
              items={WAREHOUSES}
              mapItem={mapItem}
              aria-label="Bins"
              value={value}
              onValueChange={setValue}
            />
            <button onClick={() => setValue(undefined)}>Reset</button>
          </>
        );
      }
      render(<Resettable />);

      await user.click(screen.getByText("Loose stock"));
      expect(checkedOf("Loose stock")).toBe("true");
      await user.click(screen.getByRole("button", { name: "Reset" }));
      expect(checkedOf("Loose stock")).toBe("false");
    });

    it("follows a controlled value", async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = React.useState<string[]>([]);
        return (
          <>
            <CheckboxTree<Node>
              items={WAREHOUSES}
              mapItem={mapItem}
              aria-label="Bins"
              value={value}
              onValueChange={setValue}
            />
            <output>{value.join(",")}</output>
          </>
        );
      }
      render(<Controlled />);

      await user.click(screen.getByText("Loose stock"));
      expect(screen.getByRole("status").textContent).toBe("loose");
    });
  });

  describe('valueShape "exact"', () => {
    it("selects each leaf on its own, even when keys repeat", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <CheckboxTree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          valueShape="exact"
          onValueChange={onValueChange}
        />,
      );

      await expand(user, "Warehouse X");
      await expand(user, "Warehouse Y");
      await user.click(screen.getByText("X · A1"));

      expect(checkedOf("X · A1")).toBe("true");
      expect(checkedOf("Y · A1")).toBe("false");
      expect(onValueChange).toHaveBeenLastCalledWith(
        { "wh-x": { A1: true } },
        { selected: [expect.objectContaining({ key: "A1", path: ["wh-x", "A1"] })] },
      );
    });

    it("treats `true` on a parent as every leaf beneath it, and reports leaves explicitly", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <CheckboxTree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          valueShape="exact"
          defaultValue={{ "wh-x": true }}
          onValueChange={onValueChange}
        />,
      );

      expect(checkedOf("Warehouse X")).toBe("true");
      await user.click(screen.getByText("Loose stock"));

      expect(onValueChange).toHaveBeenLastCalledWith(
        { "wh-x": { A1: true, A2: true }, loose: true },
        expect.anything(),
      );
    });

    it("keeps branches of the value that aren't in the tree", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const initial: CheckboxTreeSelection = { "wh-z": { B9: true } };
      render(
        <CheckboxTree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          valueShape="exact"
          defaultValue={initial}
          onValueChange={onValueChange}
        />,
      );

      await user.click(screen.getByText("Loose stock"));
      expect(onValueChange).toHaveBeenLastCalledWith(
        { loose: true, "wh-z": { B9: true } },
        expect.anything(),
      );
    });
  });

  describe("disabled items", () => {
    const WITH_LOCKED: Node[] = [
      {
        id: "wh-x",
        name: "Warehouse X",
        bins: [
          { id: "A1", name: "X · A1" },
          { id: "A2", name: "X · A2", locked: true },
        ],
      },
      { id: "wh-y", name: "Warehouse Y", locked: true, bins: [{ id: "B1", name: "Y · B1" }] },
    ];

    it("skips disabled leaves when a parent is ticked, and still shows the parent as checked", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <CheckboxTree<Node>
          items={WITH_LOCKED}
          mapItem={mapItem}
          aria-label="Bins"
          onValueChange={onValueChange}
        />,
      );

      await user.click(rowFor("Warehouse X").querySelector("[data-slot=checkbox-tree-checkbox]")!);

      expect(onValueChange).toHaveBeenLastCalledWith(["A1"], expect.anything());
      expect(checkedOf("Warehouse X")).toBe("true");
    });

    it("cascades a disabled parent to its children and ignores clicks on them", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <CheckboxTree<Node>
          items={WITH_LOCKED}
          mapItem={mapItem}
          aria-label="Bins"
          onValueChange={onValueChange}
        />,
      );

      await expand(user, "Warehouse Y");
      expect(rowFor("Y · B1").getAttribute("aria-disabled")).toBe("true");
      await user.click(screen.getByText("Y · B1"));

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it("keeps an already-selected disabled leaf selected", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <CheckboxTree<Node>
          items={WITH_LOCKED}
          mapItem={mapItem}
          aria-label="Bins"
          defaultValue={["A1", "A2"]}
          onValueChange={onValueChange}
        />,
      );

      await user.click(rowFor("Warehouse X").querySelector("[data-slot=checkbox-tree-checkbox]")!);
      expect(onValueChange).toHaveBeenLastCalledWith(["A2"], expect.anything());
    });
  });

  describe("onAction", () => {
    it("runs onAction for Enter on a row", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <CheckboxTree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          onAction={onAction}
        />,
      );

      rowFor("Loose stock").focus();
      await user.keyboard("{Enter}");
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("submits the owning form on Enter when there's no onAction", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <CheckboxTree<Node> items={WAREHOUSES} mapItem={mapItem} aria-label="Bins" />
        </form>,
      );

      rowFor("Loose stock").focus();
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("forms", () => {
    it("submits one hidden input per selected leaf under `name`", async () => {
      const user = userEvent.setup();
      render(
        <form data-testid="form">
          <CheckboxTree<Node>
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            name="bins"
            valueShape="exact"
          />
        </form>,
      );

      await expand(user, "Warehouse X");
      await expand(user, "Warehouse Y");
      await user.click(screen.getByText("X · A1"));
      await user.click(screen.getByText("Y · A1"));

      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("bins")).toEqual(["wh-x/A1", "wh-y/A1"]);
    });

    it("lets itemToStringValue decide what's submitted", async () => {
      const user = userEvent.setup();
      render(
        <form data-testid="form">
          <CheckboxTree<Node>
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            name="bins"
            valueShape="exact"
            itemToStringValue={(bin, { parents }) => `${parents.at(-1)?.id ?? ""}:${bin.id}`}
          />
        </form>,
      );

      await expand(user, "Warehouse Y");
      await user.click(screen.getByText("Y · A1"));

      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("bins")).toEqual(["wh-y:A1"]);
    });

    it("blocks submission while `required` and nothing is selected", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <CheckboxTree<Node>
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            name="bins"
            required
          />
          <button type="submit">Save</button>
        </form>,
      );

      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(onSubmit).not.toHaveBeenCalled();

      await user.click(screen.getByText("Loose stock"));
      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("leaves a disabled tree out of submission and ignores clicks", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <form data-testid="form">
          <CheckboxTree<Node>
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            name="bins"
            defaultValue={["loose"]}
            onValueChange={onValueChange}
            disabled
          />
        </form>,
      );

      await user.click(screen.getByText("Warehouse X"));
      expect(onValueChange).not.toHaveBeenCalled();
      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("bins")).toEqual([]);
    });

    it("takes its name, label and description from Field.Root", async () => {
      const user = userEvent.setup();
      render(
        <form data-testid="form">
          <Field.Root name="scope">
            <Field.Label>Bins to count</Field.Label>
            <CheckboxTree<Node> items={WAREHOUSES} mapItem={mapItem} name="ignored" />
            <Field.Description>Pick at least one.</Field.Description>
          </Field.Root>
        </form>,
      );

      const tree = screen.getByRole("tree", { name: "Bins to count" });
      const describedBy = tree.getAttribute("aria-describedby") ?? "";
      expect(describedBy).not.toBe("");
      expect(document.getElementById(describedBy.split(" ")[0]!)?.textContent).toBe(
        "Pick at least one.",
      );

      await user.click(screen.getByText("Loose stock"));
      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("scope")).toEqual(["loose"]);
      expect(data.getAll("ignored")).toEqual([]);
    });

    it("marks itself invalid inside an invalid Field.Root, and disabled from it", () => {
      render(
        <Field.Root name="scope" error={{ message: "Required" }} disabled>
          <CheckboxTree<Node> items={WAREHOUSES} mapItem={mapItem} aria-label="Bins" />
        </Field.Root>,
      );

      const root = document.querySelector("[data-slot=checkbox-tree]")!;
      expect(root.hasAttribute("data-invalid")).toBe(true);
      expect(root.hasAttribute("data-disabled")).toBe(true);
    });

    it("gives Base UI Form and Field validate the selection as an array", async () => {
      const user = userEvent.setup();
      const onFormSubmit = vi.fn();
      const validate = vi.fn(() => null);
      render(
        <Form onFormSubmit={onFormSubmit}>
          <Field.Root name="bins" validate={validate} validationMode="onChange">
            <CheckboxTree<Node>
              items={WAREHOUSES}
              mapItem={mapItem}
              aria-label="Bins"
              defaultValue={["A2"]}
            />
          </Field.Root>
          <button type="submit">Save</button>
        </Form>,
      );

      await user.click(screen.getByText("Loose stock"));
      expect(validate).toHaveBeenLastCalledWith(["A2", "loose"], expect.anything());
      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(onFormSubmit.mock.calls[0]![0]).toMatchObject({ bins: ["A2", "loose"] });
    });

    it("submits leaves that serialize to the same string, without key collisions", async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <form data-testid="form">
          <CheckboxTree<Node>
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            name="bins"
            valueShape="exact"
            itemToStringValue={(bin) => bin.id}
          />
        </form>,
      );

      await expand(user, "Warehouse X");
      await expand(user, "Warehouse Y");
      await user.click(screen.getByText("X · A1"));
      await user.click(screen.getByText("Y · A1"));

      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("bins")).toEqual(["A1", "A1"]);
      expect(consoleError).not.toHaveBeenCalledWith(
        expect.stringContaining("same key"),
        expect.anything(),
        expect.anything(),
      );
      consoleError.mockRestore();
    });

    it("submits exact selections for items that aren't loaded yet", () => {
      render(
        <form data-testid="form">
          <CheckboxTree<Node>
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            name="bins"
            valueShape="exact"
            defaultValue={{ "wh-z": { B1: true }, loose: true }}
          />
        </form>,
      );

      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("bins")).toEqual(["loose", "wh-z/B1"]);
    });

    it("marks the tree aria-invalid inside an invalid Field.Root", () => {
      render(
        <Field.Root name="scope" error={{ message: "Required" }}>
          <CheckboxTree<Node> items={WAREHOUSES} mapItem={mapItem} aria-label="Bins" />
        </Field.Root>,
      );
      expect(screen.getByRole("tree").getAttribute("aria-invalid")).toBe("true");
    });

    it("reports a pre-filled selection to Field on mount", () => {
      render(
        <Field.Root name="scope">
          <CheckboxTree<Node>
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            defaultValue={["loose"]}
          />
        </Field.Root>,
      );
      const root =
        document.querySelector("[data-slot=field]") ?? document.querySelector("[data-filled]");
      expect(document.querySelector("[data-filled]")).not.toBeNull();
      expect(root).not.toBeNull();
    });

    it("fires onBlur once focus leaves the tree, not between rows", () => {
      const onBlur = vi.fn();
      render(
        <>
          <CheckboxTree<Node>
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            onBlur={onBlur}
          />
          <button>Outside</button>
        </>,
      );

      const first = rowFor("Warehouse X");
      const second = rowFor("Warehouse Y");
      fireEvent.blur(first, { relatedTarget: second });
      expect(onBlur).not.toHaveBeenCalled();
      fireEvent.blur(second, { relatedTarget: screen.getByRole("button", { name: "Outside" }) });
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });
});
