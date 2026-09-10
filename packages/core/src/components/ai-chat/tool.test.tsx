import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "./tool";

afterEach(() => {
  cleanup();
});

describe("Tool", () => {
  it("shows the tool name and hides parameters until expanded", async () => {
    const user = userEvent.setup();
    render(
      <Tool>
        <ToolHeader toolName="search_kb" state="output-available" />
        <ToolContent>
          <ToolInput input={{ query: "purchase order" }} />
          <ToolOutput output={{ hits: 2 }} />
        </ToolContent>
      </Tool>,
    );
    expect(screen.getByText("search_kb")).toBeDefined();
    expect(screen.queryByText("Parameters")).toBeNull();

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Parameters")).toBeDefined();
    expect(screen.getByText(/"query"/)).toBeDefined();
  });

  it("shows Running while input-available and Error on failure", () => {
    const { rerender } = render(
      <Tool defaultOpen>
        <ToolHeader toolName="search_kb" state="input-available" />
        <ToolContent>
          <ToolInput input={{}} />
        </ToolContent>
      </Tool>,
    );
    expect(screen.getByText("Running")).toBeDefined();

    rerender(
      <Tool defaultOpen>
        <ToolHeader toolName="search_kb" state="output-error" />
        <ToolContent>
          <ToolInput input={{}} />
          <ToolOutput errorText="timed out" />
        </ToolContent>
      </Tool>,
    );
    // "Error" appears twice: the header's status badge and the output section's heading.
    expect(screen.getAllByText("Error")).toHaveLength(2);
    expect(screen.getByText("timed out")).toBeDefined();
  });

  it("renders nothing from ToolOutput when there is no output or error yet", () => {
    const { container } = render(
      <Tool defaultOpen>
        <ToolHeader toolName="search_kb" state="input-streaming" />
        <ToolContent>
          <ToolOutput />
        </ToolContent>
      </Tool>,
    );
    expect(container.querySelector("h4")).toBeNull();
  });
});
