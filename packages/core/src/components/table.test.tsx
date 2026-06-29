import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Table } from "./table";

afterEach(() => {
  cleanup();
});

describe("Table", () => {
  describe("alignment", () => {
    it("right-aligns header cells via align prop", () => {
      const { container } = render(
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head align="right">Amount</Table.Head>
            </Table.Row>
          </Table.Header>
        </Table.Root>,
      );
      const head = container.querySelector('[data-slot="table-head"]');
      expect(head?.className).toContain("astw:text-right");
      expect(head?.className).not.toContain("astw:text-left");
    });

    it("right-aligns data cells via align prop", () => {
      const { container } = render(
        <Table.Root>
          <Table.Body>
            <Table.Row>
              <Table.Cell align="right">123</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>,
      );
      const cell = container.querySelector('[data-slot="table-cell"]');
      expect(cell?.className).toContain("astw:text-right");
    });
  });

  describe("snapshots", () => {
    it("basic table with header and body", () => {
      const { container } = render(
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Status</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Item 1</Table.Cell>
              <Table.Cell>Active</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("table with footer", () => {
      const { container } = render(
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Product</Table.Head>
              <Table.Head>Price</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Widget</Table.Cell>
              <Table.Cell>$10</Table.Cell>
            </Table.Row>
          </Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.Cell>Total</Table.Cell>
              <Table.Cell>$10</Table.Cell>
            </Table.Row>
          </Table.Footer>
        </Table.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("table with caption", () => {
      const { container } = render(
        <Table.Root>
          <Table.Caption>A list of items</Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Item</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("table with containerClassName", () => {
      const { container } = render(
        <Table.Root containerClassName="custom-container">
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Item</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("empty table", () => {
      const { container } = render(
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Status</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body />
        </Table.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });
});
