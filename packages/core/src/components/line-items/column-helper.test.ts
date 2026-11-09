import { describe, expect, it } from "vitest";
import { createLineItemHelper } from "./column-helper";

const normalize = (value: number | null) => value;

describe("createLineItemHelper", () => {
  it("copies only the definition container and preserves configured callbacks and values", () => {
    const { column } = createLineItemHelper<{ quantity: number | null }>();
    const definition = Object.freeze({
      accessorKey: "quantity",
      type: "number",
      edit: Object.freeze({ editorType: "number" }),
      normalize,
    } as const);
    const result = column(definition);
    expect(result).toEqual(definition);
    expect(result).not.toBe(definition);
    expect(result.edit).toBe(definition.edit);
    expect(result.normalize).toBe(normalize);
    expect(result).not.toHaveProperty("id");
  });
});
