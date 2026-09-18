import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./button";
import { Combobox } from "./combobox-standalone";
import { Input } from "./input";
import { Select } from "./select-standalone";
import { Tabs } from "./tabs";
import { Toolbar } from "./toolbar";

afterEach(() => {
  cleanup();
});

describe("Toolbar", () => {
  it("renders grouped controls and a separator", () => {
    const { container } = render(
      <Toolbar.Root>
        <Toolbar.Row justify="between" aria-label="Document actions">
          <Toolbar.Group>
            <Button size="sm">Copy</Button>
            <Toolbar.Separator />
            <Button size="sm">Paste</Button>
          </Toolbar.Group>
          <Toolbar.Group>
            <Button size="sm">Save</Button>
          </Toolbar.Group>
        </Toolbar.Row>
      </Toolbar.Root>,
    );

    expect(container.innerHTML).toMatchSnapshot();
    expect(screen.getByRole("toolbar", { name: "Document actions" })).toBeTruthy();
    expect(screen.getByRole("separator").getAttribute("aria-orientation")).toBe("vertical");
  });

  it("moves focus through controls in a horizontal row", () => {
    render(
      <Toolbar.Root>
        <Toolbar.Row aria-label="Document actions">
          <Toolbar.Group>
            <Button>First</Button>
            <Button disabled>Disabled</Button>
            <Button>Last</Button>
          </Toolbar.Group>
        </Toolbar.Row>
      </Toolbar.Root>,
    );

    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(last, { key: "Home" });
    expect(document.activeElement).toBe(first);
  });

  it("registers AppShell controls while leaving composite keys to their owner", () => {
    render(
      <Tabs.Root defaultValue="all">
        <Toolbar.Root>
          <Toolbar.Row aria-label="Search actions">
            <Toolbar.Group>
              <Button>Previous</Button>
              <Tabs.List aria-label="Views">
                <Tabs.Tab value="all">All</Tabs.Tab>
                <Tabs.Tab value="open">Open</Tabs.Tab>
              </Tabs.List>
              <Combobox items={["Ada Lovelace"]} aria-label="Assignee" />
              <Select items={["Newest first", "Oldest first"]} aria-label="Sort" />
              <Input aria-label="Search" />
              <Button>Next</Button>
            </Toolbar.Group>
          </Toolbar.Row>
        </Toolbar.Root>
      </Tabs.Root>,
    );

    const previous = screen.getByRole("button", { name: "Previous" });
    const all = screen.getByRole("tab", { name: "All" });
    const open = screen.getByRole("tab", { name: "Open" });
    const assignee = screen.getByRole("combobox", { name: "Assignee" });
    const sort = screen.getByRole("combobox", { name: "Sort" });
    const search = screen.getByRole("textbox", { name: "Search" });

    previous.focus();
    fireEvent.keyDown(previous, { key: "ArrowRight" });
    expect(document.activeElement).toBe(all);

    fireEvent.keyDown(all, { key: "ArrowRight" });
    expect(document.activeElement).toBe(all);
    expect(open.getAttribute("aria-selected")).toBe("false");

    assignee.focus();
    fireEvent.keyDown(assignee, { key: "ArrowRight" });
    expect(document.activeElement).toBe(assignee);

    sort.focus();
    fireEvent.keyDown(sort, { key: "ArrowRight" });
    expect(document.activeElement).toBe(sort);

    search.focus();
    fireEvent.keyDown(search, { key: "ArrowRight" });
    expect(document.activeElement).toBe(search);
  });
});
