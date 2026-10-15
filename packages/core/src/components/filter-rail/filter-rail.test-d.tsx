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

  it("checks sections against the row's fields even with an untyped control", () => {
    type Row = { category: string; status: string; price: number };
    type RowField = keyof Row & string;
    const untyped = control as unknown as CollectionControl;
    const sections: FilterRailSection<RowField>[] = [
      { id: "category", label: "Category", control: "checkbox", field: "category", options: [] },
      // @ts-expect-error — "warehouse" is not a field of Row
      { id: "warehouse", label: "Warehouse", control: "checkbox", field: "warehouse", options: [] },
    ];
    <FilterRail.Root control={untyped} sections={sections}>
      <FilterRail.Sections />
    </FilterRail.Root>;
    <FilterRail.Provider control={untyped} sections={sections}>
      <FilterRail.Root>
        <FilterRail.Sections />
      </FilterRail.Root>
    </FilterRail.Provider>;
  });

  it("rejects sections whose field a typed control does not have", () => {
    const sections: FilterRailSection<"category" | "warehouse">[] = [];
    // @ts-expect-error — "warehouse" is not a field of the control
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
