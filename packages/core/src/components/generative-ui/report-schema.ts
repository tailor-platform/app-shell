import { z } from "zod/v4";

const label = z.string().min(1).max(80);
const ref = z
  .string()
  .min(1)
  .max(2000)
  .describe("Evidence reference from tool results; do not invent references");
const tone = z.enum(["ok", "warn", "neutral", "unknown"]);
const verdict = z.enum(["match", "diff", "missing", "unverifiable"]);
const cellValue = z.union([z.string().max(300), z.number(), z.null()]);
const cell = z.union([
  cellValue,
  z.strictObject({
    value: cellValue,
    verdict: verdict.optional(),
    tone: tone.optional(),
    sub: z.string().max(80).optional(),
  }),
]);

const table = z
  .strictObject({
    kind: z.literal("table"),
    columns: z
      .array(
        z.strictObject({
          key: z.string().min(1).max(40),
          label,
          kind: z.enum(["text", "number", "verdict"]).optional(),
        }),
      )
      .min(1)
      .max(8),
    rows: z
      .array(
        z.strictObject({
          cells: z.record(z.string(), cell),
          ref: ref.optional(),
          muted: z.boolean().optional(),
        }),
      )
      .min(1)
      .max(200),
    footer: z.record(z.string(), cell).optional(),
    refs: z.array(ref).min(1).max(20),
  })
  .superRefine((value, ctx) => {
    const keys = new Set(value.columns.map((column) => column.key));
    if (keys.size !== value.columns.length) {
      ctx.addIssue({ code: "custom", path: ["columns"], message: "Column keys must be unique" });
    }
    value.rows.forEach((row, index) => {
      const rowKeys = Object.keys(row.cells);
      if (rowKeys.length !== keys.size || rowKeys.some((key) => !keys.has(key))) {
        ctx.addIssue({
          code: "custom",
          path: ["rows", index, "cells"],
          message: "Row cells must match the declared columns; use null for empty cells",
        });
      }
    });
    if (value.footer && Object.keys(value.footer).some((key) => !keys.has(key))) {
      ctx.addIssue({
        code: "custom",
        path: ["footer"],
        message: "Footer cells must use declared column keys",
      });
    }
  })
  .describe(
    "Read-only table. Place it alone in a block; values and totals must come from tool results",
  );

const part = z.discriminatedUnion("kind", [
  z
    .strictObject({
      kind: z.literal("text"),
      text: z.string().min(1).max(1200),
    })
    .describe("Supplementary prose using the same safe Markdown subset as AIChat.Response"),
  z
    .strictObject({
      kind: z.literal("metrics"),
      items: z
        .array(
          z.strictObject({
            label,
            value: z.number(),
            unit: z.string().max(16).optional(),
            tone: z.enum(["ok", "warn", "neutral"]).optional(),
            ref,
          }),
        )
        .min(1)
        .max(6),
    })
    .describe("Numeric tiles. Use values from tool results rather than calculating or guessing"),
  z
    .strictObject({
      kind: z.literal("chips"),
      items: z
        .array(
          z.strictObject({
            label,
            value: z.string().min(1).max(80),
            tone: tone.optional(),
            sub: z.string().max(80).optional(),
            ref,
          }),
        )
        .min(1)
        .max(6),
    })
    .describe("Short status values with labels"),
  z
    .strictObject({
      kind: z.literal("fields"),
      items: z
        .array(
          z.strictObject({
            label,
            value: z.string().max(200).nullable(),
            verdict: verdict.optional(),
            previous: z.string().max(200).optional(),
            ref,
          }),
        )
        .min(1)
        .max(12),
    })
    .describe("Key-value fields. Use null for unreadable or unknown values, never guess"),
  table,
  z
    .strictObject({
      kind: z.literal("list"),
      items: z
        .array(
          z.strictObject({
            text: z.string().min(1).max(300),
            tone: tone.optional(),
            ref: ref.optional(),
          }),
        )
        .min(1)
        .max(20),
    })
    .describe("Bulleted findings or next steps"),
  z
    .strictObject({
      kind: z.literal("callout"),
      tone: z.enum(["info", "ok", "warn", "error"]),
      title: label.optional(),
      text: z.string().min(1).max(400),
      ref: ref.optional(),
    })
    .describe("Informational notice or warning; it performs no action"),
  z
    .strictObject({
      kind: z.literal("checklist"),
      items: z
        .array(
          z.strictObject({
            label,
            status: z.enum(["pass", "warn", "fail", "skip"]),
            detail: z.string().max(300).optional(),
            ref: ref.optional(),
          }),
        )
        .min(1)
        .max(20),
    })
    .describe("Read-only validation results. Copy statuses from tool results"),
  z
    .strictObject({
      kind: z.literal("timeline"),
      events: z
        .array(
          z.strictObject({
            at: z.iso.datetime({ offset: true }),
            kind: z.enum(["user", "system", "external"]),
            label,
            detail: z.string().max(300).optional(),
            ref,
          }),
        )
        .min(1)
        .max(50),
    })
    .describe("History copied from records; only labels and details are authored by the AI"),
]);

export const reportSchema = z
  .strictObject({
    blocks: z
      .array(
        z.strictObject({
          text: z
            .string()
            .min(1)
            .max(400)
            .describe("A short claim explaining what to look at in the accompanying parts"),
          parts: z.array(part).max(3).optional(),
        }),
      )
      .min(1)
      .max(8),
  })
  .superRefine((report, ctx) => {
    if (report.blocks.reduce((count, block) => count + (block.parts?.length ?? 0), 0) > 8) {
      ctx.addIssue({
        code: "custom",
        path: ["blocks"],
        message: "A Report can contain at most 8 parts",
      });
    }
    report.blocks.forEach((block, index) => {
      if ((block.parts?.length ?? 0) > 1 && block.parts?.some((entry) => entry.kind === "table")) {
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, "parts"],
          message: "A table must be alone in its block",
        });
      }
    });
  })
  .describe(
    "Read-only findings report: up to 8 blocks and 8 parts in total. Each block pairs a claim with at most 3 parts",
  );

export type ReportData = z.infer<typeof reportSchema>;
export type ReportPart = NonNullable<ReportData["blocks"][number]["parts"]>[number];
export type ReportCell = z.infer<typeof cell>;
