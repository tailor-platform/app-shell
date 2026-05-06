/**
 * Vitest type tests for `BuildQueryVariables`.
 *
 * These tests verify that `BuildQueryVariables` produces the correct
 * filter input types from table metadata using Vitest's `expectTypeOf`.
 *
 * To run: `pnpm test`
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  BuildQueryVariables,
  TableFieldName,
  TableMetadata,
  TableOrderableFieldName,
} from "@/types/collection";

type TestTable = {
  readonly name: "test";
  readonly pluralForm: "tests";
  readonly fields: readonly [
    { readonly name: "id"; readonly type: "uuid"; readonly required: true },
    {
      readonly name: "title";
      readonly type: "string";
      readonly required: true;
    },
    {
      readonly name: "amount";
      readonly type: "number";
      readonly required: false;
    },
    {
      readonly name: "status";
      readonly type: "enum";
      readonly required: true;
      readonly enumValues: readonly ["active", "inactive"];
    },
    {
      readonly name: "isActive";
      readonly type: "boolean";
      readonly required: false;
    },
    {
      readonly name: "createdAt";
      readonly type: "datetime";
      readonly required: false;
    },
    { readonly name: "tags"; readonly type: "array"; readonly required: false },
    {
      readonly name: "config";
      readonly type: "nested";
      readonly required: false;
    },
  ];
};

type TestQuery = BuildQueryVariables<TestTable>;

describe("BuildQueryVariables", () => {
  it("TestTable is assignable to TableMetadata", () => {
    expectTypeOf<TestTable>().toExtend<TableMetadata>();
  });

  describe("produces correct filter types per field type", () => {
    it("string fields produce string operators", () => {
      expectTypeOf<TestQuery>().toExtend<{
        title?: { eq?: string; contains?: string };
      }>();
    });

    it("number fields produce number operators with between", () => {
      expectTypeOf<TestQuery>().toExtend<{
        amount?: {
          eq?: number;
          gt?: number;
          between?: { min: number; max: number };
        };
      }>();
    });

    it("enum fields produce literal union types from enumValues", () => {
      expectTypeOf<TestQuery>().toExtend<{
        status?: {
          eq?: "active" | "inactive";
          in?: ("active" | "inactive")[];
          nin?: ("active" | "inactive")[];
        };
      }>();
    });

    it("boolean fields produce eq/ne operators", () => {
      expectTypeOf<TestQuery>().toExtend<{
        isActive?: { eq?: boolean; ne?: boolean };
      }>();
    });

    it("uuid fields produce eq/ne/in/nin operators", () => {
      expectTypeOf<TestQuery>().toExtend<{
        id?: { eq?: string; ne?: string; in?: string[]; nin?: string[] };
      }>();
    });

    it("datetime fields produce date operators", () => {
      expectTypeOf<TestQuery>().toExtend<{
        createdAt?: {
          eq?: string;
          gt?: string;
          between?: { min: string; max: string };
        };
      }>();
    });

    it("array fields are excluded (not filterable)", () => {
      expectTypeOf<"tags" & keyof TestQuery>().toBeNever();
    });

    it("nested fields are excluded (not filterable)", () => {
      expectTypeOf<"config" & keyof TestQuery>().toBeNever();
    });
  });
});

describe("TableFieldName", () => {
  it("extracts all field names", () => {
    type AllNames =
      | "id"
      | "title"
      | "amount"
      | "status"
      | "isActive"
      | "createdAt"
      | "tags"
      | "config";
    expectTypeOf<AllNames>().toExtend<TableFieldName<TestTable>>();
  });
});

describe("TableOrderableFieldName", () => {
  it("excludes uuid fields", () => {
    expectTypeOf<"id" & TableOrderableFieldName<TestTable>>().toBeNever();
  });

  it("excludes array and nested fields", () => {
    expectTypeOf<"tags" & TableOrderableFieldName<TestTable>>().toBeNever();
  });

  it("includes string fields", () => {
    expectTypeOf<"title">().toExtend<TableOrderableFieldName<TestTable>>();
  });

  it("includes number fields", () => {
    expectTypeOf<"amount">().toExtend<TableOrderableFieldName<TestTable>>();
  });

  it("includes enum fields", () => {
    expectTypeOf<"status">().toExtend<TableOrderableFieldName<TestTable>>();
  });
});
