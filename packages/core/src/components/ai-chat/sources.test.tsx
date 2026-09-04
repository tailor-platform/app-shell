import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Source, Sources, SourcesContent, SourcesTrigger } from "./sources";

afterEach(() => {
  cleanup();
});

describe("Sources", () => {
  it("hides the source list until expanded", async () => {
    const user = userEvent.setup();
    render(
      <Sources>
        <SourcesTrigger count={2} />
        <SourcesContent>
          <Source title="Creating purchase orders" />
          <Source title="Order approval workflow" />
        </SourcesContent>
      </Sources>,
    );
    expect(screen.getByText("Used 2 sources")).toBeDefined();
    expect(screen.queryByText("Creating purchase orders")).toBeNull();

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Creating purchase orders")).toBeDefined();
  });

  it("pluralizes a single source", () => {
    render(
      <Sources>
        <SourcesTrigger count={1} />
        <SourcesContent>
          <Source title="Creating purchase orders" />
        </SourcesContent>
      </Sources>,
    );
    expect(screen.getByText("Used 1 source")).toBeDefined();
  });

  it("calls onClick when a source is selected", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Sources>
        <SourcesTrigger count={1} />
        <SourcesContent>
          <Source title="Creating purchase orders" onClick={onClick} />
        </SourcesContent>
      </Sources>,
    );
    await user.click(screen.getByRole("button", { name: /Used 1 source/ }));
    await user.click(screen.getByText("Creating purchase orders"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
