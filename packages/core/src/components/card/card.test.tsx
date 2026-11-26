import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card } from "./card";

afterEach(() => {
  cleanup();
});

describe("Card", () => {
  describe("snapshots", () => {
    it("basic card with header and content", () => {
      const { container } = render(
        <Card.Root>
          <Card.Header title="Title" description="Description" />
          <Card.Content>Content</Card.Content>
        </Card.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("header and footer actions", () => {
      const { container } = render(
        <Card.Root>
          <Card.Header title="Title" description="Description" action={<button>Edit</button>}>
            Additional header content
          </Card.Header>
          <Card.Content>Content</Card.Content>
          <Card.Footer>
            <button>Cancel</button>
            <button>Save</button>
          </Card.Footer>
        </Card.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("card with custom className", () => {
      const { container } = render(
        <Card.Root className="custom-class">
          <Card.Content>Content</Card.Content>
        </Card.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders title and description", () => {
    render(
      <Card.Root>
        <Card.Header title="My Title" description="My Description" />
      </Card.Root>,
    );
    expect(screen.getByText("My Title")).toBeDefined();
    expect(screen.getByText("My Description")).toBeDefined();
  });

  it("renders content", () => {
    render(
      <Card.Root>
        <Card.Content>Card body</Card.Content>
      </Card.Root>,
    );
    expect(screen.getByText("Card body")).toBeDefined();
  });

  describe("Header action", () => {
    it("keeps description and children below the title and action row", () => {
      render(
        <Card.Header title="Title" description="Description" action={<button>Edit</button>}>
          <div>Additional content</div>
        </Card.Header>,
      );
      const title = screen.getByRole("heading", { name: "Title" });
      const action = screen.getByRole("button", { name: "Edit" });
      const row = title.parentElement!;
      expect(row.dataset.slot).toBe("card-header-title-row");
      expect(row.contains(action)).toBe(true);
      expect(action.parentElement?.dataset.slot).toBe("card-header-action");
      const header = row.parentElement!;
      expect(Array.from(header.children)).toEqual([
        row,
        screen.getByText("Description"),
        screen.getByText("Additional content"),
      ]);
      expect(header.hasAttribute("action")).toBe(false);
    });

    it("supports actions without a title and preserves their keyboard order", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const onSave = vi.fn();
      render(
        <Card.Root>
          <Card.Header
            action={
              <>
                <button onClick={onEdit}>Edit</button>
                <button>Preview</button>
              </>
            }
          />
          <Card.Footer>
            <button onClick={onSave}>Save</button>
          </Card.Footer>
        </Card.Root>,
      );
      expect(screen.queryByRole("heading")).toBeNull();
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit" }));
      await user.keyboard("{Enter}");
      expect(onEdit).toHaveBeenCalledOnce();
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Preview" }));
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Save" }));
      await user.keyboard("{Enter}");
      expect(onSave).toHaveBeenCalledOnce();
    });

    it.each([undefined, null, false])("keeps the existing structure for action=%s", (action) => {
      const { container } = render(<Card.Header title="Title" action={action} />);
      const title = screen.getByRole("heading", { name: "Title" });
      expect(title.parentElement?.dataset.slot).toBe("card-header");
      expect(container.querySelector("[data-slot=card-header-action]")).toBeNull();
    });

    it("renders a numeric action without treating zero as absent", () => {
      const { container } = render(<Card.Header title="Title" action={0} />);
      expect(container.querySelector("[data-slot=card-header-action]")?.textContent).toBe("0");
    });
  });

  it("forwards Footer div props and ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Card.Footer ref={ref} className="custom-footer" aria-label="Order actions" id="actions">
        <button>Save</button>
      </Card.Footer>,
    );
    expect(ref.current).toBe(screen.getByLabelText("Order actions"));
    expect(ref.current?.id).toBe("actions");
    expect(ref.current?.className).toContain("custom-footer");
    expect(ref.current?.dataset.slot).toBe("card-footer");
    expect(ref.current?.contains(screen.getByRole("button", { name: "Save" }))).toBe(true);
  });

  describe("Content padding", () => {
    it("pads content by default", () => {
      render(
        <Card.Root>
          <Card.Content>Body</Card.Content>
        </Card.Root>,
      );
      const content = screen.getByText("Body");
      expect(content.dataset.padding).toBe("default");
      expect(content.className).toContain("astw:px-6");
    });

    it('renders edge-to-edge with padding="none"', () => {
      render(
        <Card.Root>
          <Card.Content padding="none">Body</Card.Content>
        </Card.Root>,
      );
      const content = screen.getByText("Body");
      expect(content.dataset.padding).toBe("none");
      expect(content.className).not.toMatch(/astw:(px|pb|first:pt)-6/);
      // Corners are carried, not clipped: a consumer's overflow still applies.
      expect(content.className).toContain("astw:last:rounded-b-[inherit]");
      expect(content.className).not.toContain("overflow");
    });

    it("strips a nested DataTable's own border", () => {
      render(
        <Card.Root>
          <Card.Content padding="none">Body</Card.Content>
        </Card.Root>,
      );
      expect(screen.getByText("Body").className).toContain(
        "astw:[&>[data-slot=data-table]]:border-0",
      );
    });
  });
});
