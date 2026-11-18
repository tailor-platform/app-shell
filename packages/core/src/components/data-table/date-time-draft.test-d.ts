import { expectTypeOf, test } from "vitest";
import type { DateCellEditOptions, DateTimeDraft } from "@/index";
import type { DateTimeDraft as DataTableDateTimeDraft } from "./index";
import type { DateTimeDraft as InternalDateTimeDraft } from "@/components/internals/table-core/editing/date";

type Row = { id: string; date: string | null };

test("DateTimeDraft remains available through the public entrypoints", () => {
  expectTypeOf<DateTimeDraft>().toEqualTypeOf<{
    day: string | null;
    time: string | null;
  }>();
  expectTypeOf<DateTimeDraft>().toEqualTypeOf<DataTableDateTimeDraft>();
  expectTypeOf<DateTimeDraft>().toEqualTypeOf<InternalDateTimeDraft>();
});

test("date change callbacks use the same public DateTimeDraft", () => {
  type Draft = Parameters<NonNullable<DateCellEditOptions<Row>["onValueChange"]>>[1];
  expectTypeOf<Draft>().toEqualTypeOf<string | DateTimeDraft | null>();
  expectTypeOf<Extract<Draft, object>>().toEqualTypeOf<DateTimeDraft>();
});
