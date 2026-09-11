import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "./chain-of-thought";

afterEach(() => {
  cleanup();
});

describe("ChainOfThought", () => {
  it("hides steps until expanded", async () => {
    const user = userEvent.setup();
    render(
      <ChainOfThought>
        <ChainOfThoughtHeader />
        <ChainOfThoughtContent>
          <ChainOfThoughtStep label="Searching" status="complete" />
        </ChainOfThoughtContent>
      </ChainOfThought>,
    );
    expect(screen.getByText("Chain of thought")).toBeDefined();
    expect(screen.queryByText("Searching")).toBeNull();

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Searching")).toBeDefined();
  });

  it("renders search result chips inside a step", () => {
    render(
      <ChainOfThought defaultOpen>
        <ChainOfThoughtHeader />
        <ChainOfThoughtContent>
          <ChainOfThoughtStep label="Searching" status="complete">
            <ChainOfThoughtSearchResults>
              <ChainOfThoughtSearchResult>12 hits</ChainOfThoughtSearchResult>
            </ChainOfThoughtSearchResults>
          </ChainOfThoughtStep>
        </ChainOfThoughtContent>
      </ChainOfThought>,
    );
    expect(screen.getByText("12 hits")).toBeDefined();
  });
});
