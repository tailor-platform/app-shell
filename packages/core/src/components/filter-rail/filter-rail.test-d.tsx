/**
 * Vitest type tests for `FilterRail`'s field typing and Root/Provider config.
 *
 * To run: `pnpm test`
 */

import { describe, expectTypeOf, it } from "vitest";
import type { CollectionControl } from "@/types/collection";
import { FilterRail, type FilterRailRootProps, type FilterRailSection } from "./index";

type Field = "category" | "status";

declare const control: CollectionControl<Field>;

describe("FilterRail types", () => {
  it("accepts sections whose field belongs to the control", () => {
    const sections: FilterRailSection<Field>[] = [
      { id: "category", label: "Category", control: "checkbox", field: "category", options: [] },
    ];
    <FilterRail.Root control={control} sections={sections}>
      <FilterRail.Sections />
    </FilterRail.Root>;
  });

  it("rejects a misspelled field", () => {
    const sections: FilterRailSection<Field>[] = [
      // @ts-expect-error — "categroy" is not a field of the control
      { id: "category", label: "Category", control: "checkbox", field: "categroy", options: [] },
    ];
    expectTypeOf(sections).toBeArray();
  });

  it("types a custom section's fields and setFilter", () => {
    const section: FilterRailSection<Field> = {
      id: "custom",
      label: "Custom",
      control: "custom",
      fields: ["status"],
      render: ({ setFilter }) => {
        setFilter("status", { operator: "eq", value: "active" });
        // @ts-expect-error — unknown field
        setFilter("warehouse", null);
        return null;
      },
    };
    expectTypeOf(section).not.toBeAny();
  });

  it("requires both control and sections when Root is standalone", () => {
    // @ts-expect-error — `sections` is missing
    const missing: FilterRailRootProps<Field> = { control, children: null };
    expectTypeOf(missing).not.toBeAny();
  });

  it("allows a Root with no config (inside a Provider)", () => {
    const inside: FilterRailRootProps<Field> = { children: null };
    expectTypeOf(inside).not.toBeAny();
  });
});
