import { render, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DEFAULT_FAVICON_HREF } from "@/lib/default-favicon";
import { Favicon } from "./favicon";

const getIconLink = () => document.querySelector<HTMLLinkElement>('link[rel="icon"]');

describe("Favicon", () => {
  beforeEach(() => {
    document.head.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove());
  });

  it("applies the consumer-provided href", async () => {
    render(<Favicon href="/custom.ico" />);
    await waitFor(() => expect(getIconLink()?.getAttribute("href")).toBe("/custom.ico"));
  });

  it("falls back to the bundled Tailor default when no href is given", async () => {
    render(<Favicon />);
    await waitFor(() => expect(getIconLink()?.getAttribute("href")).toBe(DEFAULT_FAVICON_HREF));
  });

  it("updates the existing icon link in place rather than adding another", async () => {
    const existing = document.createElement("link");
    existing.rel = "icon";
    existing.href = "/old.ico";
    document.head.appendChild(existing);

    render(<Favicon href="/new.ico" />);
    await waitFor(() => expect(getIconLink()?.getAttribute("href")).toBe("/new.ico"));
    expect(document.head.querySelectorAll('link[rel="icon"]').length).toBe(1);
  });
});
