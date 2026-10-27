import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Link, NavLink, useLocation } from "@/index";
import { Button } from "@/components/button";
import { listButtonVariants } from "@/components/internals/item-list-base";
import { ItemList } from "./item-list";

afterEach(cleanup);

function CurrentPath() {
  const { pathname } = useLocation();
  return <output aria-label="Current path">{pathname}</output>;
}

describe("ItemList", () => {
  it("composes the list parts without an AppShell, Sidebar, or router provider", () => {
    const { container } = render(
      <ItemList.Root aria-label="Workspace">
        <ItemList.Item icon={<svg data-testid="home-icon" />} isActive onClick={vi.fn()}>
          Overview
        </ItemList.Item>
        <ItemList.Separator />
        <ItemList.Section title="Business">
          <ItemList.Item onClick={vi.fn()}>Orders</ItemList.Item>
          <ItemList.Group title="Products">
            <ItemList.Item onClick={vi.fn()}>All products</ItemList.Item>
          </ItemList.Group>
        </ItemList.Section>
      </ItemList.Root>,
    );

    expect(screen.getByRole("list", { name: "Workspace" }).tagName).toBe("UL");
    expect(screen.getByRole("list", { name: "Business" })).toBeDefined();
    expect(screen.getByRole("list", { name: "Products" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Overview" })).toBeDefined();
    expect(screen.getByRole("button", { name: "All products" })).toBeDefined();
    expect(screen.getByTestId("home-icon").closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();

    for (const list of Array.from(container.querySelectorAll("ul"))) {
      expect(Array.from(list.children).every((child) => child.tagName === "LI")).toBe(true);
    }
  });

  it.each([
    { name: "native", renderElement: undefined },
    { name: "rendered Button", renderElement: <Button /> },
  ])("uses non-submit $name buttons for actions", async ({ renderElement }) => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ItemList.Root>
          <ItemList.Item render={renderElement} onClick={onClick}>
            Check notifications
          </ItemList.Item>
        </ItemList.Root>
      </form>,
    );

    const button = screen.getByRole("button", { name: "Check notifications" });
    expect(button.getAttribute("type")).toBe("button");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders a native anchor inside its list item without a router", () => {
    render(
      <ItemList.Root>
        <ItemList.Item
          render={<a href="/orders" aria-label="Orders" aria-current="page" />}
          isActive
        >
          Orders
        </ItemList.Item>
      </ItemList.Root>,
    );

    const link = screen.getByRole("link", { name: "Orders" });
    expect(link.parentElement?.tagName).toBe("LI");
    expect(link.getAttribute("href")).toBe("/orders");
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.hasAttribute("type")).toBe(false);
    expect(link.getAttribute("data-active")).toBe("true");
    expect(link.hasAttribute("aria-selected")).toBe(false);
  });

  it("treats active state as visual emphasis rather than implicit current-page or selection state", () => {
    render(
      <ItemList.Root>
        <ItemList.Item isActive onClick={vi.fn()}>
          Overview
        </ItemList.Item>
        <ItemList.Item onClick={vi.fn()}>Orders</ItemList.Item>
      </ItemList.Root>,
    );

    const active = screen.getByRole("button", { name: "Overview" });
    expect(active.getAttribute("data-active")).toBe("true");
    expect(active.hasAttribute("aria-selected")).toBe(false);
    expect(active.hasAttribute("aria-current")).toBe(false);
    expect(active.className).toContain("astw:text-body-md");
    expect(active.className).not.toContain("astw:data-[active=true]:text-label-");
    expect(screen.getByRole("button", { name: "Orders" }).getAttribute("data-active")).toBe(
      "false",
    );
  });

  it("supports a supplied router link without changing its navigation", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ItemList.Root>
          <ItemList.Item render={<Link to="/orders" />}>Orders</ItemList.Item>
        </ItemList.Root>
        <CurrentPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Orders" }));
    expect(screen.getByLabelText("Current path").textContent).toBe("/orders");
  });

  it("merges handlers and forwards classes, attributes, and refs to the inner operation", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const renderedClick = vi.fn();
    render(
      <ItemList.Root>
        <ItemList.Item
          ref={ref}
          className="custom-row"
          aria-describedby="action-description"
          render={<button type="button" className="rendered-row" onClick={renderedClick} />}
          onClick={onClick}
        >
          Refresh
        </ItemList.Item>
      </ItemList.Root>,
    );

    const button = screen.getByRole("button", { name: "Refresh" });
    expect(ref.current).toBe(button);
    expect(button.classList.contains("custom-row")).toBe(true);
    expect(button.classList.contains("rendered-row")).toBe(true);
    expect(button.getAttribute("aria-describedby")).toBe("action-description");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(renderedClick).toHaveBeenCalledTimes(1);
  });

  it("preserves click cancellation supplied on a rendered router link", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const renderedClick = vi.fn((event) => event.preventDefault());
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ItemList.Root>
          <ItemList.Item render={<Link to="/orders" onClick={renderedClick} />} onClick={onClick}>
            Orders
          </ItemList.Item>
        </ItemList.Root>
        <CurrentPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Orders" }));
    expect(renderedClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Current path").textContent).toBe("/");
  });

  it("does not invoke an action on a disabled native button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ItemList.Root>
        <ItemList.Item disabled onClick={onClick}>
          Export
        </ItemList.Item>
        <ItemList.Item onClick={vi.fn()}>Available action</ItemList.Item>
      </ItemList.Root>,
    );

    const disabled = screen.getByRole("button", { name: "Export" }) as HTMLButtonElement;
    expect(disabled.disabled).toBe(true);
    await user.click(disabled);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Available action" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("cancels navigation and removes a disabled rendered link from the tab order", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const renderedClick = vi.fn();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ItemList.Root>
          <ItemList.Item
            disabled
            render={<Link to="/orders" onClick={renderedClick} />}
            onClick={onClick}
          >
            Orders
          </ItemList.Item>
          <ItemList.Item onClick={vi.fn()}>Available action</ItemList.Item>
        </ItemList.Root>
        <CurrentPath />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Orders" });
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.tabIndex).toBe(-1);
    expect(fireEvent.click(link)).toBe(false);
    expect(onClick).not.toHaveBeenCalled();
    expect(renderedClick).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Current path").textContent).toBe("/");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Available action" }));
  });

  it("keeps sections flat and non-interactive, with a named child list", () => {
    render(
      <ItemList.Root>
        <ItemList.Section title="Business">
          <ItemList.Item onClick={vi.fn()}>Orders</ItemList.Item>
        </ItemList.Section>
      </ItemList.Root>,
    );

    const list = screen.getByRole("list", { name: "Business" });
    expect(list.getAttribute("data-slot")).toBe("item-list");
    expect(list.className).not.toContain("astw:border-l");
    expect(within(list).getByRole("button", { name: "Orders" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Business" })).toBeNull();
    expect(screen.getByText("Business").id).toBe(list.getAttribute("aria-labelledby"));
  });

  it("renders separators as decorative list children", () => {
    const { container } = render(
      <ItemList.Root>
        <ItemList.Item render={<a href="#orders" aria-label="Orders" />}>Orders</ItemList.Item>
        <ItemList.Separator />
        <ItemList.Item render={<a href="#settings" aria-label="Settings" />}>
          Settings
        </ItemList.Item>
      </ItemList.Root>,
    );

    const divider = container.querySelector('[data-slot="item-list-separator"]');
    expect(divider?.tagName).toBe("LI");
    expect(divider?.parentElement).toBe(screen.getByRole("list"));
    expect(divider?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("opens groups by default and toggles an indented named child list", async () => {
    const user = userEvent.setup();
    render(
      <ItemList.Root>
        <ItemList.Group title="Products">
          <ItemList.Item onClick={vi.fn()}>All products</ItemList.Item>
        </ItemList.Group>
      </ItemList.Root>,
    );

    const toggle = screen.getByRole("button", { name: "Products" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("list", { name: "Products" }).className).toContain("astw:border-l");
    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "All products" })).toBeNull();
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "All products" })).toBeDefined();
  });

  it("supports initially collapsed nested groups without toggling their parent", async () => {
    const user = userEvent.setup();
    render(
      <ItemList.Root>
        <ItemList.Group title="Products">
          <ItemList.Group title="Archives" defaultOpen={false}>
            <ItemList.Item onClick={vi.fn()}>Archived products</ItemList.Item>
          </ItemList.Group>
        </ItemList.Group>
      </ItemList.Root>,
    );

    const outer = screen.getByRole("button", { name: "Products" });
    const nested = screen.getByRole("button", { name: "Archives" });
    expect(nested.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Archived products" })).toBeNull();
    await user.click(nested);
    expect(nested.getAttribute("aria-expanded")).toBe("true");
    expect(outer.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Archived products" })).toBeDefined();
  });

  it("supports native Enter and Space activation of a group heading", async () => {
    const user = userEvent.setup();
    render(
      <ItemList.Root>
        <ItemList.Group title="Products" defaultOpen={false}>
          <ItemList.Item onClick={vi.fn()}>All products</ItemList.Item>
        </ItemList.Group>
      </ItemList.Root>,
    );

    const toggle = screen.getByRole("button", { name: "Products" });
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    await user.keyboard("{Enter}");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard(" ");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps linked group navigation separate from its named expand control", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ItemList.Root>
          <ItemList.Group
            title="Settings"
            render={<Link to="/settings" />}
            expandOnClick={false}
            defaultOpen={false}
            isActive
          >
            <ItemList.Item render={<Link to="/settings/profile" />}>Profile</ItemList.Item>
          </ItemList.Group>
        </ItemList.Root>
        <CurrentPath />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Settings" });
    const toggle = screen.getByRole("button", { name: "Settings" });
    expect(link.getAttribute("data-active")).toBe("true");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(link.contains(toggle)).toBe(false);
    expect(toggle.contains(link)).toBe(false);
    await user.click(link);
    expect(screen.getByLabelText("Current path").textContent).toBe("/settings");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: "Profile" })).toBeNull();

    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: "Profile" })).toBeDefined();
    expect(screen.getByLabelText("Current path").textContent).toBe("/settings");
  });

  it.each([true, false])(
    "connects server-rendered heading controls to the panel (expandOnClick=%s)",
    (expandOnClick) => {
      const container = document.createElement("div");
      container.innerHTML = renderToString(
        <ItemList.Root>
          <ItemList.Group title="Products" expandOnClick={expandOnClick} onClick={vi.fn()}>
            <ItemList.Item render={<a href="#products" aria-label="All products" />}>
              All products
            </ItemList.Item>
          </ItemList.Group>
        </ItemList.Root>,
      );
      const toggle = container.querySelector('[aria-expanded="true"]');
      const panel = container.querySelector('[data-slot="item-list-sub"]')?.parentElement;
      expect(toggle?.getAttribute("aria-controls")).toBe(panel?.id);
      expect(panel?.id).toBeTruthy();
    },
  );

  it("preserves click cancellation on a combined heading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((event) => event.preventDefault());
    render(
      <ItemList.Root>
        <ItemList.Group title="Products" onClick={onClick} defaultOpen={false}>
          <ItemList.Item render={<a href="#products" aria-label="All products" />}>
            All products
          </ItemList.Item>
        </ItemList.Group>
      </ItemList.Root>,
    );

    const heading = screen.getByRole("button", { name: "Products" });
    await user.click(heading);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(heading.getAttribute("aria-expanded")).toBe("false");
  });

  it("only reserves an icon slot when the caller supplies one", () => {
    render(
      <ItemList.Root>
        <ItemList.Item icon={<svg />} render={<a href="#overview" aria-label="Overview" />}>
          Overview
        </ItemList.Item>
        <ItemList.Item render={<a href="#settings" aria-label="Settings" />}>
          Settings
        </ItemList.Item>
        <ItemList.Item icon={<span />} render={<a href="#aligned" aria-label="Aligned settings" />}>
          Aligned settings
        </ItemList.Item>
      </ItemList.Root>,
    );

    const iconSlot = (name: string) =>
      screen.getByRole("link", { name }).querySelector('[data-slot="item-list-icon"]');
    expect(iconSlot("Overview")?.getAttribute("aria-hidden")).toBe("true");
    expect(iconSlot("Settings")).toBeNull();
    expect(iconSlot("Aligned settings")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("styles current-page NavLinks without isActive and leaves shared Sidebar styles unchanged", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/orders"]}>
        <ItemList.Root>
          <ItemList.Item render={<NavLink to="/orders" end />}>Orders</ItemList.Item>
          <ItemList.Group
            title="Order group"
            render={<NavLink to="/orders" end />}
            expandOnClick={false}
          >
            <ItemList.Item render={<Link to="/orders/42" />}>Order detail</ItemList.Item>
          </ItemList.Group>
        </ItemList.Root>
        <CurrentPath />
      </MemoryRouter>,
    );

    const item = screen.getByRole("link", { name: "Orders" });
    const group = screen.getByRole("link", { name: "Order group" });
    const currentPageClasses = [
      "astw:aria-[current=page]:bg-accent",
      "astw:aria-[current=page]:font-semibold",
      "astw:aria-[current=page]:text-accent-foreground",
    ];
    for (const link of [item, group]) {
      expect(link.getAttribute("aria-current")).toBe("page");
      expect(link.getAttribute("data-active")).toBe("false");
      for (const className of currentPageClasses) {
        expect(link.classList.contains(className)).toBe(true);
        expect(listButtonVariants()).not.toContain(className);
      }
    }

    await user.click(screen.getByRole("link", { name: "Order detail" }));
    expect(screen.getByLabelText("Current path").textContent).toBe("/orders/42");
    expect(item.hasAttribute("aria-current")).toBe(false);
    expect(group.hasAttribute("aria-current")).toBe(false);
    expect(item.getAttribute("data-active")).toBe("false");
    expect(group.getAttribute("data-active")).toBe("false");
  });

  it.each([true, false])(
    "calls only the heading handlers, not for children or separate toggles (expandOnClick=%s)",
    async (expandOnClick) => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const renderedClick = vi.fn();
      const childClick = vi.fn();
      const nestedClick = vi.fn();
      render(
        <ItemList.Root>
          <ItemList.Group
            title="Products"
            render={<button type="button" aria-label="Open products" onClick={renderedClick} />}
            onClick={onClick}
            expandOnClick={expandOnClick}
          >
            <ItemList.Item onClick={childClick}>Child action</ItemList.Item>
            <ItemList.Group title="Archives" onClick={nestedClick} defaultOpen={false}>
              <ItemList.Item render={<a href="#archive" aria-label="Archived products" />}>
                Archived products
              </ItemList.Item>
            </ItemList.Group>
          </ItemList.Group>
        </ItemList.Root>,
      );

      await user.click(screen.getByRole("button", { name: "Child action" }));
      await user.click(screen.getByRole("button", { name: "Archives" }));
      expect(childClick).toHaveBeenCalledTimes(1);
      expect(nestedClick).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
      expect(renderedClick).not.toHaveBeenCalled();

      const heading = screen.getByRole("button", { name: "Open products" });
      await user.click(heading);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(renderedClick).toHaveBeenCalledTimes(1);
      if (expandOnClick) {
        expect(heading.getAttribute("aria-expanded")).toBe("false");
      } else {
        const toggle = screen.getByRole("button", { name: "Products", expanded: true });
        expect(heading.hasAttribute("aria-expanded")).toBe(false);
        expect(heading.contains(toggle)).toBe(false);
        expect(toggle.contains(heading)).toBe(false);
        await user.click(toggle);
        expect(toggle.getAttribute("aria-expanded")).toBe("false");
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(renderedClick).toHaveBeenCalledTimes(1);
      }
    },
  );

  it("keeps default expansion for a rendered button with click, Enter, and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ItemList.Root>
        <ItemList.Group title="Products" render={<Button />} onClick={onClick} defaultOpen={false}>
          <ItemList.Item render={<a href="#products" aria-label="All products" />}>
            All products
          </ItemList.Item>
        </ItemList.Group>
      </ItemList.Root>,
    );

    const heading = screen.getByRole("button", { name: "Products" });
    await user.click(heading);
    expect(heading.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard("{Enter}");
    expect(heading.getAttribute("aria-expanded")).toBe("false");
    await user.keyboard(" ");
    expect(heading.getAttribute("aria-expanded")).toBe("true");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("can separate an action heading from expansion without a render prop", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const childClick = vi.fn();
    render(
      <ItemList.Root>
        <ItemList.Group title="Products" expandOnClick={false} onClick={onClick}>
          <ItemList.Item onClick={childClick}>All products</ItemList.Item>
        </ItemList.Group>
      </ItemList.Root>,
    );

    const [heading, toggle] = screen.getAllByRole("button", { name: "Products" });
    expect(heading.getAttribute("type")).toBe("button");
    expect(heading.hasAttribute("aria-expanded")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(heading.contains(toggle)).toBe(false);
    expect(toggle.contains(heading)).toBe(false);
    await user.click(screen.getByRole("button", { name: "All products" }));
    expect(childClick).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    await user.click(heading);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await user.keyboard(" ");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not infer split expansion from a rendered link", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ItemList.Root>
          <ItemList.Group title="Settings" render={<Link to="/settings" />} defaultOpen={false}>
            <ItemList.Item render={<Link to="/settings/profile" />}>Profile</ItemList.Item>
          </ItemList.Group>
        </ItemList.Root>
        <CurrentPath />
      </MemoryRouter>,
    );

    const heading = screen.getByRole("link", { name: "Settings" });
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
    expect(heading.getAttribute("aria-expanded")).toBe("false");
    await user.click(heading);
    expect(screen.getByLabelText("Current path").textContent).toBe("/settings");
    expect(heading.getAttribute("aria-expanded")).toBe("true");
  });

  it("preserves navigation cancellation and composed handlers on a split group heading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const renderedClick = vi.fn((event) => event.preventDefault());
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ItemList.Root>
          <ItemList.Group
            title="Settings"
            render={<Link to="/settings" onClick={renderedClick} />}
            onClick={onClick}
            expandOnClick={false}
            defaultOpen={false}
          >
            <ItemList.Item render={<Link to="/settings/profile" />}>Profile</ItemList.Item>
          </ItemList.Group>
        </ItemList.Root>
        <CurrentPath />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Settings" }));
    expect(renderedClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Current path").textContent).toBe("/");
    expect(screen.getByRole("button", { name: "Settings" }).getAttribute("aria-expanded")).toBe(
      "false",
    );
  });

  it.each([true, false])(
    "names rich group headings, lists, and expand controls from the rendered label (expandOnClick=%s)",
    (expandOnClick) => {
      render(
        <ItemList.Root>
          <ItemList.Group
            title={
              <>
                <strong>Products</strong> <span>12</span>
                <span aria-hidden="true">New</span>
              </>
            }
            icon={<svg aria-label="Decorative icon" />}
            expandOnClick={expandOnClick}
            onClick={vi.fn()}
          >
            <ItemList.Item render={<a href="#products" aria-label="All products" />}>
              All products
            </ItemList.Item>
          </ItemList.Group>
        </ItemList.Root>,
      );

      const label = screen.getByText("Products").closest('[data-slot="item-list-label"]');
      expect(label?.id).toBeTruthy();
      expect(
        screen.getByRole("list", { name: "Products 12" }).getAttribute("aria-labelledby"),
      ).toBe(label?.id);
      const toggle = screen.getByRole("button", { name: "Products 12", expanded: true });
      if (!expandOnClick) {
        expect(toggle.getAttribute("aria-labelledby")).toBe(label?.id);
        expect(screen.getAllByRole("button", { name: "Products 12" })).toHaveLength(2);
      }
      expect(screen.queryByRole("button", { name: /New|Decorative icon/ })).toBeNull();
    },
  );
});
