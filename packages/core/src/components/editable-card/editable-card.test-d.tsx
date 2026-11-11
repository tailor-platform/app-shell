/**
 * Vitest type tests for `EditableCard`'s typed values and field props.
 *
 * To run: `pnpm test`
 */

import { describe, expectTypeOf, it } from "vitest";
import { EditableCard, type EditableCardFieldProps } from "./index";

interface OrderValues {
  shipTo: string;
  notes: string;
}

describe("EditableCard types", () => {
  it("types onSave's values with the type argument", () => {
    <EditableCard<OrderValues>
      title="Order"
      onSave={(values) => {
        expectTypeOf(values).toEqualTypeOf<OrderValues>();
      }}
    />;
  });

  it("defaults onSave's values to an unknown record", () => {
    <EditableCard
      title="Order"
      onSave={(values) => {
        expectTypeOf(values).toEqualTypeOf<Record<string, unknown>>();
      }}
    />;
  });

  it("takes errors in the shape Form takes", () => {
    <EditableCard title="Order" errors={{ shipTo: "Closed", notes: ["Too long", "Has a URL"] }} />;
  });

  it("requires a name on a field with a control", () => {
    <EditableCard title="Order">
      <EditableCard.Field name="shipTo" label="Ship to" value="Osaka DC">
        <input />
      </EditableCard.Field>
      {/* @ts-expect-error — a field with a control needs a name */}
      <EditableCard.Field label="Ship to" value="Osaka DC">
        <input />
      </EditableCard.Field>
      <EditableCard.Field
        label="Status"
        value="Confirmed"
        readOnly={{ reason: "Set by approval" }}
      />
    </EditableCard>;
  });

  it("exposes the read-only shape through the field props", () => {
    expectTypeOf<NonNullable<EditableCardFieldProps["readOnly"]>["kind"]>().toEqualTypeOf<
      "system" | "calculated" | "locked" | "permission" | undefined
    >();
  });
});
