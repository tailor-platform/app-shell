import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { reportCard } from "./report";
import { reportSchema } from "./report-schema";
import { AppShellConfigContext } from "../../contexts/appshell-context";

const Report = reportCard.component;
const reference = "lookup_order:order_123";
const table = {
  kind: "table",
  columns: [
    { key: "sku", label: "SKU" },
    { key: "quantity", label: "Quantity", kind: "number" },
    { key: "verdict", label: "Comparison", kind: "verdict" },
  ],
  rows: [{ cells: { sku: "SKU-001", quantity: 12, verdict: "match" }, ref: reference }],
  footer: { quantity: 12 },
  refs: [reference],
};

async function validate(value: unknown) {
  return await reportCard.schema["~standard"].validate(value);
}

function withPart(part: unknown) {
  return { blocks: [{ text: "Findings", parts: [part] }] };
}

afterEach(cleanup);

describe("generativeUICards.report", () => {
  it("renders eight report parts using read-only house components and semantic tables", async () => {
    const data = reportSchema.parse({
      blocks: [
        {
          text: "The order is ready for review.",
          parts: [
            { kind: "text", text: "Review **known values** only." },
            {
              kind: "metrics",
              items: [
                { label: "Inbound units", value: 1200, unit: "units", tone: "ok", ref: reference },
              ],
            },
            {
              kind: "chips",
              items: [
                {
                  label: "Order status",
                  value: "Pending",
                  tone: "warn",
                  sub: "Awaiting review",
                  ref: reference,
                },
              ],
            },
          ],
        },
        {
          text: "Supplier details are incomplete.",
          parts: [
            {
              kind: "fields",
              items: [
                {
                  label: "Supplier",
                  value: null,
                  verdict: "missing",
                  previous: "Previous supplier",
                  ref: reference,
                },
              ],
            },
          ],
        },
        { text: "Line quantities match the source.", parts: [table] },
        {
          text: "Next steps",
          parts: [
            {
              kind: "list",
              items: [{ text: "Confirm the supplier", tone: "warn", ref: reference }],
            },
          ],
        },
        {
          text: "Notice",
          parts: [
            {
              kind: "callout",
              tone: "info",
              title: "No records saved",
              text: "This is a **read-only** report.",
              ref: reference,
            },
          ],
        },
        {
          text: "Checks",
          parts: [
            {
              kind: "checklist",
              items: [
                {
                  label: "Quantity reconciliation",
                  status: "pass",
                  detail: "All quantities match",
                  ref: reference,
                },
              ],
            },
          ],
        },
      ],
    });
    expect((await validate(data)).issues).toBeUndefined();
    const { container } = render(<Report data={data} />);

    expect(screen.getByText("known values").tagName).toBe("STRONG");
    expect(screen.getByText("Inbound units")).toBeDefined();
    expect(screen.getByText("1,200 units")).toBeDefined();
    expect(screen.getByText("Awaiting review")).toBeDefined();
    expect(screen.getByText("Supplier").tagName).toBe("DT");
    expect(screen.getByText("Unknown")).toBeDefined();
    expect(screen.getByText("Previous: Previous supplier")).toBeDefined();
    expect(screen.getByText("No records saved")).toBeDefined();
    expect(screen.getByText("Pass")).toBeDefined();
    const renderedTable = screen.getByRole("table", { name: "Line quantities match the source." });
    expect(
      within(renderedTable).getByRole("columnheader", { name: "Quantity" }).getAttribute("scope"),
    ).toBe("col");
    expect(within(renderedTable).getByRole("cell", { name: "SKU-001" })).toBeDefined();
    expect(within(renderedTable).getByText("Match")).toBeDefined();
    expect(renderedTable.querySelector("tfoot")).not.toBeNull();
    expect(container.querySelector("[data-slot=generative-ui-sources]")?.textContent).toContain(
      reference,
    );
    expect(container.querySelector("input, button, select, textarea")).toBeNull();
  });

  it("renders timestamped timeline events", () => {
    const data = reportSchema.parse(
      withPart({
        kind: "timeline",
        events: [
          {
            at: "2026-06-01T09:00:00+09:00",
            kind: "external",
            label: "Order received",
            detail: "Imported from the source",
            ref: reference,
          },
        ],
      }),
    );
    const { container } = render(<Report data={data} />);
    expect(screen.getByText("Order received")).toBeDefined();
    expect(screen.getByText("External")).toBeDefined();
    expect(container.querySelector("ol time")?.getAttribute("datetime")).toBe(
      "2026-06-01T09:00:00+09:00",
    );
  });

  it("formats timeline dates in the configured timezone across calendar days", () => {
    const instant = "2024-01-01T18:00:00Z";
    const data = reportSchema.parse(
      withPart({
        kind: "timeline",
        events: [
          {
            at: instant,
            kind: "system",
            label: "Received",
            ref: reference,
          },
        ],
      }),
    );
    const { container } = render(
      <AppShellConfigContext.Provider
        value={{
          configurations: {
            modules: [],
            settingsResources: [],
            errorBoundary: null!,
            locale: "en",
            resolvedLocale: "en-US",
            timeZone: "Asia/Tokyo",
          },
        }}
      >
        <Report data={data} />
      </AppShellConfigContext.Provider>,
    );
    const formatted = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tokyo",
    }).format(new Date(instant));
    expect(container.querySelector("time")?.textContent).toBe(formatted);
    expect(formatted).toContain("Jan 2, 2024");
  });

  it("renders hostile HTML and references as text and drops unsafe Markdown links", () => {
    const data = reportSchema.parse({
      blocks: [
        {
          text: "<script>alert(1)</script> [unsafe](javascript:alert) [safe](https://example.com)",
          parts: [
            {
              kind: "callout",
              tone: "warn",
              text: "<img src=x onerror=alert(1)> [another unsafe](data:text/html,evil)",
            },
            {
              kind: "fields",
              items: [
                {
                  label: "Reference",
                  value: "<iframe>unsafe</iframe>",
                  ref: "javascript:alert(1)",
                },
              ],
            },
          ],
        },
      ],
    });
    const { container } = render(<Report data={data} />);
    expect(container.querySelector("script, img, iframe")).toBeNull();
    expect(screen.queryByRole("link", { name: "unsafe" })).toBeNull();
    expect(screen.queryByRole("link", { name: "another unsafe" })).toBeNull();
    expect(screen.getByRole("link", { name: "safe" }).getAttribute("href")).toBe(
      "https://example.com",
    );
    expect(screen.getByText("<iframe>unsafe</iframe>")).toBeDefined();
    expect(screen.getByText("Source: javascript:alert(1)")).toBeDefined();
  });

  it.each([
    ["no blocks", { blocks: [] }],
    ["too many blocks", { blocks: Array.from({ length: 9 }, () => ({ text: "Claim" })) }],
    [
      "too many parts in a block",
      {
        blocks: [
          {
            text: "Claim",
            parts: Array.from({ length: 4 }, () => ({ kind: "text", text: "Text" })),
          },
        ],
      },
    ],
    [
      "too many total parts",
      {
        blocks: Array.from({ length: 3 }, () => ({
          text: "Claim",
          parts: Array.from({ length: 3 }, () => ({ kind: "text", text: "Text" })),
        })),
      },
    ],
    ["unknown part", withPart({ kind: "html", html: "<script />" })],
    [
      "non-finite metric",
      withPart({
        kind: "metrics",
        items: [{ label: "Quantity", value: Infinity, ref: reference }],
      }),
    ],
    [
      "NaN metric",
      withPart({ kind: "metrics", items: [{ label: "Quantity", value: NaN, ref: reference }] }),
    ],
    ["missing evidence", withPart({ kind: "metrics", items: [{ label: "Quantity", value: 12 }] })],
    [
      "invalid timestamp",
      withPart({
        kind: "timeline",
        events: [{ at: "not-a-date", kind: "user", label: "Event", ref: reference }],
      }),
    ],
    ["unknown property", { blocks: [{ text: "Claim", dangerousHtml: "<script />" }] }],
    ["oversized text", { blocks: [{ text: "x".repeat(401) }] }],
    [
      "oversized table",
      withPart({ ...table, rows: Array.from({ length: 201 }, () => table.rows[0]) }),
    ],
    ["duplicate columns", withPart({ ...table, columns: [table.columns[0], table.columns[0]] })],
    [
      "extra row cells",
      withPart({
        ...table,
        rows: [
          { cells: { sku: "SKU-001", quantity: 12, verdict: "match", hidden: "unshown data" } },
        ],
      }),
    ],
    ["missing row cells", withPart({ ...table, rows: [{ cells: { sku: "SKU-001" } }] })],
    ["undeclared footer cells", withPart({ ...table, footer: { hidden: 12 } })],
    [
      "table beside another part",
      { blocks: [{ text: "Claim", parts: [table, { kind: "text", text: "Text" }] }] },
    ],
  ])("rejects %s", async (_name, data) => {
    expect((await validate(data)).issues?.length).toBeGreaterThan(0);
  });

  it("publishes bounded JSON Schema for model inputs", () => {
    const json = reportCard.schema["~standard"].jsonSchema.input({ target: "draft-07" });
    expect(json).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: { blocks: { type: "array", minItems: 1, maxItems: 8 } },
    });
    expect(JSON.stringify(json)).toContain('"timeline"');
    expect(JSON.stringify(json)).not.toContain("ApprovalBox");
  });
});
