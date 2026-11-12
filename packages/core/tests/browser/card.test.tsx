import { render, screen } from "@testing-library/react";
import {
  Button,
  Card,
  DataTable,
  Table,
  createColumnHelper,
  useDataTable,
} from "@tailor-platform/app-shell";
import { describe, expect, it } from "vitest";

const { column } = createColumnHelper<{ name: string }>();
const columns = [column({ label: "Item", render: (row) => row.name })];

function FlushDataTable() {
  const table = useDataTable({ columns, data: { rows: [{ name: "Steel bracket" }], total: 1 } });
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

describe("Card action layout", () => {
  it("aligns header actions with the title and footer actions with the right inset", () => {
    render(
      <Card.Root style={{ width: 700 }}>
        <Card.Header
          title="Order details"
          description="Review the order"
          action={<Button>Edit</Button>}
          data-testid="header"
        >
          <div>Additional content</div>
        </Card.Header>
        <Card.Content>Body</Card.Content>
        <Card.Footer data-testid="footer">
          <Button>Cancel</Button>
          <Button>Save</Button>
        </Card.Footer>
      </Card.Root>,
    );
    const title = screen.getByRole("heading").getBoundingClientRect();
    const edit = screen.getByRole("button", { name: "Edit" }).getBoundingClientRect();
    const header = screen.getByTestId("header").getBoundingClientRect();
    const description = screen.getByText("Review the order").getBoundingClientRect();
    const children = screen.getByText("Additional content").getBoundingClientRect();
    expect(edit.right).toBeCloseTo(header.right - 24, 0);
    expect(edit.left).toBeGreaterThan(title.right);
    expect(edit.top + edit.height / 2).toBeCloseTo(title.top + title.height / 2, 0);
    expect(description.top).toBeGreaterThanOrEqual(edit.bottom);
    expect(description.left).toBeCloseTo(header.left + 24, 0);
    expect(description.width).toBeCloseTo(header.width - 48, 0);
    expect(children.top).toBeGreaterThanOrEqual(description.bottom);

    const footer = screen.getByTestId("footer");
    const style = getComputedStyle(footer);
    expect(style.borderTopWidth).toBe("1px");
    expect(style.paddingTop).toBe("16px");
    expect(style.paddingBottom).toBe("16px");
    expect(style.columnGap).toBe("8px");
    expect(screen.getByRole("button", { name: "Save" }).getBoundingClientRect().right).toBeCloseTo(
      footer.getBoundingClientRect().right - 24,
      0,
    );
  });

  it("wraps long titles and multiple actions inside a narrow card, independently of viewport width", () => {
    render(
      <Card.Root style={{ width: 320 }}>
        <Card.Header
          title="NovemberOrderFulfillmentOverviewWithoutSpaces"
          data-testid="header"
          action={
            <>
              <Button>Preview</Button>
              <Button>Export</Button>
            </>
          }
        />
        <Card.Footer data-testid="footer">
          <Button>Discard changes</Button>
          <Button>Save draft</Button>
          <Button>Publish order</Button>
        </Card.Footer>
      </Card.Root>,
    );
    const header = screen.getByTestId("header");
    const footer = screen.getByTestId("footer");
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
    expect(footer.scrollWidth).toBeLessThanOrEqual(footer.clientWidth);
    const title = screen.getByRole("heading").getBoundingClientRect();
    const preview = screen.getByRole("button", { name: "Preview" }).getBoundingClientRect();
    const exportButton = screen.getByRole("button", { name: "Export" }).getBoundingClientRect();
    expect(preview.top).toBeGreaterThanOrEqual(title.bottom);
    expect(exportButton.right).toBeCloseTo(header.getBoundingClientRect().right - 24, 0);
    const first = screen.getByRole("button", { name: "Discard changes" }).getBoundingClientRect();
    const last = screen.getByRole("button", { name: "Publish order" }).getBoundingClientRect();
    expect(last.top).toBeGreaterThan(first.top);
    expect(last.right).toBeCloseTo(footer.getBoundingClientRect().right - 24, 0);
  });

  it.each(["Table", "DataTable"])(
    "keeps a flush %s square above the footer without clipping the card",
    (kind) => {
      const { container } = render(
        <Card.Root style={{ width: 320 }} data-testid="card">
          <Card.Content padding="none" data-testid="content">
            {kind === "DataTable" ? (
              <FlushDataTable />
            ) : (
              <Table.Root>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell>Steel bracket</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            )}
          </Card.Content>
          <Card.Footer data-testid="footer">
            <Button>Save</Button>
          </Card.Footer>
        </Card.Root>,
      );
      const card = screen.getByTestId("card");
      const content = screen.getByTestId("content");
      const table = container.querySelector<HTMLElement>(
        "[data-slot=table-container], [data-slot=data-table]",
      )!;
      expect(getComputedStyle(card).overflow).toBe("visible");
      expect(getComputedStyle(content).borderTopLeftRadius).toBe(
        getComputedStyle(card).borderTopLeftRadius,
      );
      expect(getComputedStyle(content).borderBottomLeftRadius).toBe("0px");
      expect(getComputedStyle(table).borderBottomLeftRadius).toBe("0px");
      expect(content.getBoundingClientRect().bottom).toBeCloseTo(
        screen.getByTestId("footer").getBoundingClientRect().top,
        0,
      );
    },
  );
});
