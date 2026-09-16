import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TestRouter } from "./index";
import { Link, useLocation, useParams } from "@/index";

const ShowParams = () => <div data-testid="params">{JSON.stringify(useParams())}</div>;
const ShowPath = () => <div data-testid="path">{useLocation().pathname}</div>;

afterEach(() => {
  cleanup();
});

describe("TestRouter", () => {
  it("gives a component router context without mounting AppShell", async () => {
    render(
      <TestRouter initialEntries={["/orders/A42"]}>
        <ShowPath />
      </TestRouter>,
    );

    expect((await screen.findByTestId("path")).textContent).toBe("/orders/A42");
  });

  it("renders a Link, which needs a router above it", async () => {
    render(
      <TestRouter>
        <Link to="/orders">Orders</Link>
      </TestRouter>,
    );

    expect((await screen.findByText("Orders")).getAttribute("href")).toBe("/orders");
  });

  it("resolves route params when given a path", async () => {
    render(
      <TestRouter path="/orders/:id" initialEntries={["/orders/A42"]}>
        <ShowParams />
      </TestRouter>,
    );

    expect((await screen.findByTestId("params")).textContent).toBe('{"id":"A42"}');
  });

  it("has no params without a path, since nothing matches the location", async () => {
    // The trap `path` exists for: a router alone matches nothing.
    render(
      <TestRouter initialEntries={["/orders/A42"]}>
        <ShowParams />
      </TestRouter>,
    );

    expect((await screen.findByTestId("params")).textContent).toBe("{}");
  });

  it("starts at initialIndex when given one", async () => {
    render(
      <TestRouter initialEntries={["/a", "/b", "/c"]} initialIndex={1}>
        <ShowPath />
      </TestRouter>,
    );

    expect((await screen.findByTestId("path")).textContent).toBe("/b");
  });
});
