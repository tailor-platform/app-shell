import { createRef, type MouseEvent } from "react";
import { describe, expectTypeOf, it } from "vitest";
import { Link } from "@/index";
import { ItemList } from "./item-list";

// Checked by Vitest's typecheck pass and the package's TypeScript check.
describe("ItemList types", () => {
  it("accepts an action, a rendered operation, or both", () => {
    <ItemList.Item
      onClick={(event) => {
        expectTypeOf(event).toEqualTypeOf<MouseEvent<HTMLButtonElement>>();
      }}
    >
      Refresh
    </ItemList.Item>;
    <ItemList.Item render={<Link to="/orders" />}>Orders</ItemList.Item>;
    <ItemList.Item
      render={<a href="#orders" aria-label="Orders" />}
      onClick={(event) => event.preventDefault()}
    >
      Orders
    </ItemList.Item>;
  });

  it("requires a defined action or rendered operation, including when disabled", () => {
    // @ts-expect-error — an Item must provide onClick or render
    <ItemList.Item>Orders</ItemList.Item>;
    // @ts-expect-error — a disabled Item still needs an operation
    <ItemList.Item disabled>Export</ItemList.Item>;
    // @ts-expect-error — undefined does not provide an action
    <ItemList.Item onClick={undefined}>Refresh</ItemList.Item>;
    // @ts-expect-error — undefined does not provide a rendered operation
    <ItemList.Item render={undefined}>Orders</ItemList.Item>;
    // @ts-expect-error — neither optional value provides an operation
    <ItemList.Item onClick={undefined} render={undefined}>
      Orders
    </ItemList.Item>;
  });

  it("preserves button props and refs for actions", () => {
    <ItemList.Item
      ref={createRef<HTMLButtonElement>()}
      disabled
      type="button"
      aria-describedby="export-description"
      onClick={(event) => event.currentTarget.focus()}
    >
      Export
    </ItemList.Item>;
  });

  it("accepts rich Group labels and explicit expansion behavior", () => {
    <ItemList.Group
      title={
        <>
          <strong>Products</strong> <span>12</span>
        </>
      }
      render={<Link to="/products" />}
      expandOnClick={false}
      onClick={(event) => event.preventDefault()}
    >
      <ItemList.Item render={<Link to="/products/all" />}>All products</ItemList.Item>
    </ItemList.Group>;
  });

  it("requires a heading operation when expansion is separate", () => {
    <ItemList.Group title="Products" />;
    <ItemList.Group title="Products" expandOnClick />;
    <ItemList.Group
      title="Products"
      expandOnClick={false}
      onClick={(event) => event.preventDefault()}
    />;
    <ItemList.Group title="Products" expandOnClick={false} render={<Link to="/products" />} />;
    // @ts-expect-error — a separate toggle must not leave an inert heading button
    <ItemList.Group title="Products" expandOnClick={false} />;
    // @ts-expect-error — undefined is not a heading operation
    <ItemList.Group
      title="Products"
      expandOnClick={false}
      onClick={undefined}
      render={undefined}
    />;
  });

  it("keeps isActive boolean rather than assigning current-page semantics", () => {
    <ItemList.Item isActive onClick={(event) => event.currentTarget.focus()}>
      Overview
    </ItemList.Item>;
    // @ts-expect-error — aria-current belongs on the operation, not in isActive
    <ItemList.Item isActive="page" render={<Link to="/orders" />}>
      Orders
    </ItemList.Item>;
  });
});
