import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { defineGenerativeUI } from "./generative-ui";
import type { AIChatToolSchema } from "../../ai/tools";

afterEach(cleanup);

function Summary({ data }: { data: { title: string } }) {
  return <h3>{data.title}</h3>;
}
const ui = defineGenerativeUI({
  cards: { Summary: { schema: z.strictObject({ title: z.string().min(1) }), component: Summary } },
});
const document = { cards: [{ type: "Summary", data: { title: "Order summary" } }] };

describe("defineGenerativeUI", () => {
  it("provides an ordinary local tool using generic emit and a model-facing acknowledgement", async () => {
    const emit = vi.fn();
    expect(ui.tool.kind).toBe("local");
    expect(Object.getOwnPropertySymbols(ui.tool)).toEqual([]);
    expect(
      await ui.tool.execute(document, {
        emit,
        signal: new AbortController().signal,
        messages: [],
      }),
    ).toEqual({ ok: true, shown: 1 });
    expect(emit).toHaveBeenCalledExactlyOnceWith({ type: "generative-ui", data: document });
  });

  it("advertises only registered card input schemas, not schema-transformed output", () => {
    const transformed = defineGenerativeUI({
      cards: {
        Count: {
          schema: z.string().transform((value) => value.length),
          component: ({ data }) => <div>{data}</div>,
        },
      },
    });
    expect(
      transformed.tool.schema["~standard"].jsonSchema.input({ target: "draft-07" }),
    ).toMatchObject({
      type: "object",
      required: ["cards"],
      additionalProperties: false,
      properties: {
        cards: {
          minItems: 1,
          maxItems: 5,
          items: {
            anyOf: [{ properties: { type: { const: "Count" }, data: { type: "string" } } }],
          },
        },
      },
    });
  });

  it("renders a valid standalone document in order", async () => {
    const { container } = render(
      <ui.Renderer document={document} className="consumer-class" aria-label="Generated summary" />,
    );
    expect(await screen.findByRole("heading", { name: "Order summary" })).toBeDefined();
    expect(container.firstElementChild?.classList.contains("consumer-class")).toBe(true);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("retains model input so transformed schemas replay without double transformation", async () => {
    const transformed = defineGenerativeUI({
      cards: {
        Count: {
          schema: z.string().transform((value) => value.length),
          component: ({ data }) => <h3>Count: {data}</h3>,
        },
      },
    });
    const raw = { cards: [{ type: "Count", data: "abcd" }] };
    const parsed = await transformed.tool.schema["~standard"].validate(raw);
    expect(parsed).toEqual({ value: raw });
    render(<transformed.Renderer document={JSON.parse(JSON.stringify(raw))} />);
    expect(await screen.findByRole("heading", { name: "Count: 4" })).toBeDefined();
  });

  it.each([
    undefined,
    { cards: [] },
    { cards: Array.from({ length: 6 }, () => document.cards[0]) },
    { cards: [{ type: "Unknown", data: {} }] },
    { cards: [{ type: "Summary", data: {} }] },
    { cards: [{ type: "Summary", data: { title: "Valid" }, html: "<script>" }] },
    { ...document, extra: true },
    { cards: [document.cards[0], { type: "Summary", data: { title: "" } }] },
  ])("rejects malformed documents without partial rendering: %j", async (raw) => {
    const parsed = await ui.tool.schema["~standard"].validate(raw);
    expect(parsed.issues?.length).toBeGreaterThan(0);
    render(<ui.Renderer document={raw} />);
    expect(await screen.findByText("This generated content cannot be displayed.")).toBeDefined();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("supports async Standard Schema and ignores obsolete validation results", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const schema: AIChatToolSchema<string> = {
      "~standard": {
        vendor: "test",
        version: 1,
        async validate(raw) {
          if (raw === "Old") await gate;
          return typeof raw === "string"
            ? { value: raw }
            : { issues: [{ message: "Expected string" }] };
        },
        jsonSchema: { input: () => ({ type: "string" }), output: () => ({ type: "string" }) },
      },
    };
    const asyncUI = defineGenerativeUI({
      cards: { Async: { schema, component: ({ data }) => <h3>{data}</h3> } },
    });
    const { rerender, unmount } = render(
      <asyncUI.Renderer document={{ cards: [{ type: "Async", data: "Old" }] }} />,
    );
    rerender(<asyncUI.Renderer document={{ cards: [{ type: "Async", data: "New" }] }} />);
    expect(await screen.findByRole("heading", { name: "New" })).toBeDefined();
    release();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Old" })).toBeNull());
    unmount();
  });

  it("turns validator exceptions into display errors", async () => {
    const schema = z.string();
    vi.spyOn(schema["~standard"], "validate").mockRejectedValue(new Error("Lookup failed"));
    const broken = defineGenerativeUI({
      cards: { Broken: { schema, component: ({ data }) => <h3>{data}</h3> } },
    });
    expect(
      await broken.tool.schema["~standard"].validate({ cards: [{ type: "Broken", data: "x" }] }),
    ).toMatchObject({ issues: [{ message: "Lookup failed" }] });
    render(<broken.Renderer document={{ cards: [{ type: "Broken", data: "x" }] }} />);
    expect(await screen.findByText("This generated content cannot be displayed.")).toBeDefined();
  });

  it.each(["$ref", "$dynamicRef", "$recursiveRef"])(
    "rejects %s rather than changing its resolution scope",
    (reference) => {
      const schema: AIChatToolSchema<string> = {
        "~standard": {
          version: 1,
          vendor: "test",
          validate: (value) =>
            typeof value === "string" ? { value } : { issues: [{ message: "Expected string" }] },
          jsonSchema: {
            input: () => ({
              type: "object",
              properties: { nested: { [reference]: "#/$defs/Node" } },
            }),
            output: () => ({ type: "string" }),
          },
        },
      };
      const referenced = defineGenerativeUI({
        cards: { Referenced: { schema, component: () => null } },
      });
      expect(() =>
        referenced.tool.schema["~standard"].jsonSchema.input({ target: "draft-07" }),
      ).toThrow("reference-free JSON Schema");
    },
  );

  it("does not claim to publish when called without an emission callback", () => {
    expect(() =>
      ui.tool.execute(document, { signal: new AbortController().signal, messages: [] }),
    ).toThrow("context.emit");
  });

  it("requires a nonempty registry", () => {
    expect(() => defineGenerativeUI({ cards: {} })).toThrow("at least one card");
  });
});
