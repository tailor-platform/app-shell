/**
 * Compile-time type tests for `BuildQueryVariables`.
 *
 * These tests verify that `BuildQueryVariables` produces the correct
 * filter input types from table metadata.
 *
 * To run: `npx tsc --noEmit` — any assertion that evaluates to `never`
 * will cause a compile error, ensuring the test cases stay enforced.
 */

import type {
  BuildQueryVariables,
  TableFieldName,
  TableMetadata,
  TableOrderableFieldName,
} from "@/components/data-table/types";

// =============================================================================
// 1. BuildQueryVariables produces correct filter types per field type
// =============================================================================

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

// Verify TestTable is assignable to TableMetadata
type AssertValidTable = TestTable extends TableMetadata ? true : never;
export const assertValidTable: AssertValidTable = true;

type TestQuery = BuildQueryVariables<TestTable>;

// ✅ String fields produce string operators
type AssertStringField = TestQuery extends {
  title?: { eq?: string; contains?: string };
}
  ? true
  : never;
export const assertStringField: AssertStringField = true;

// ✅ Number fields produce number operators with between
type AssertNumberField = TestQuery extends {
  amount?: { eq?: number; gt?: number; between?: { min: number; max: number } };
}
  ? true
  : never;
export const assertNumberField: AssertNumberField = true;

// ✅ Enum fields produce literal union types from enumValues
type AssertEnumField = TestQuery extends {
  status?: {
    eq?: "active" | "inactive";
    in?: ("active" | "inactive")[];
    nin?: ("active" | "inactive")[];
  };
}
  ? true
  : never;
export const assertEnumField: AssertEnumField = true;

// ✅ Boolean fields produce eq/ne operators
type AssertBooleanField = TestQuery extends {
  isActive?: { eq?: boolean; ne?: boolean };
}
  ? true
  : never;
export const assertBooleanField: AssertBooleanField = true;

// ✅ UUID fields produce eq/ne/in/nin operators
type AssertUuidField = TestQuery extends {
  id?: { eq?: string; ne?: string; in?: string[]; nin?: string[] };
}
  ? true
  : never;
export const assertUuidField: AssertUuidField = true;

// ✅ Datetime fields produce date operators
type AssertDatetimeField = TestQuery extends {
  createdAt?: {
    eq?: string;
    gt?: string;
    between?: { min: string; max: string };
  };
}
  ? true
  : never;
export const assertDatetimeField: AssertDatetimeField = true;

// ✅ Array and nested fields are excluded (not filterable)
type AssertNoArrayField = "tags" extends keyof TestQuery ? never : true;
export const assertNoArrayField: AssertNoArrayField = true;

type AssertNoNestedField = "config" extends keyof TestQuery ? never : true;
export const assertNoNestedField: AssertNoNestedField = true;

// =============================================================================
// 2. TableFieldName extracts all field names
// =============================================================================

type TestFieldNames = TableFieldName<TestTable>;
type AssertFieldNames =
  | "id"
  | "title"
  | "amount"
  | "status"
  | "isActive"
  | "createdAt"
  | "tags"
  | "config" extends TestFieldNames
  ? true
  : never;
export const assertFieldNames: AssertFieldNames = true;

// =============================================================================
// 3. TableOrderableFieldName excludes non-orderable types
// =============================================================================

type TestOrderableNames = TableOrderableFieldName<TestTable>;

// uuid is NOT orderable
type AssertNoUuidOrder = "id" extends TestOrderableNames ? never : true;
export const assertNoUuidOrder: AssertNoUuidOrder = true;

// array and nested are NOT orderable
type AssertNoArrayOrder = "tags" extends TestOrderableNames ? never : true;
export const assertNoArrayOrder: AssertNoArrayOrder = true;

// string, number, enum, boolean, datetime ARE orderable
type AssertStringOrderable = "title" extends TestOrderableNames ? true : never;
export const assertStringOrderable: AssertStringOrderable = true;

type AssertNumberOrderable = "amount" extends TestOrderableNames ? true : never;
export const assertNumberOrderable: AssertNumberOrderable = true;

type AssertEnumOrderable = "status" extends TestOrderableNames ? true : never;
export const assertEnumOrderable: AssertEnumOrderable = true;
