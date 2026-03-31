import { describe, it, expect, expectTypeOf } from "vitest";
import { column, inferColumns, createColumnHelper } from "./field-helpers";
import type { TableMetadataMap } from "./types";
import { fieldTypeToSortConfig, fieldTypeToFilterConfig } from "./types";
import type { NodeType, TableFieldName } from "./types";

describe("NodeType", () => {
  it("extracts node type from a collection result", () => {
    type Result = { edges: { node: { id: string; name: string } }[] };
    type Row = NodeType<Result>;
    expectTypeOf<Row>().toEqualTypeOf<{ id: string; name: string }>();
  });

  it("handles nullable collection (e.g. gql-tada ResultOf)", () => {
    type Result = { edges: { node: { id: string; amount: number } }[] } | null | undefined;
    type Row = NodeType<Result>;
    expectTypeOf<Row>().toEqualTypeOf<{ id: string; amount: number }>();
  });
});

describe("column()", () => {
  type TestRow = { name: string; age: number };

  it("creates a column with render and sort/filter", () => {
    const col = column<TestRow>({
      label: "Name",
      render: (row) => row.name,
      sort: { field: "name", type: "string" },
      filter: { field: "name", type: "string" },
    });
    expect(col.label).toBe("Name");
    expect(col.sort).toEqual({ field: "name", type: "string" });
    expect(col.filter).toEqual({ field: "name", type: "string" });
    expect(typeof col.render).toBe("function");
  });

  it("creates minimal column with label and render", () => {
    const col = column<TestRow>({
      label: "Age",
      render: (row) => String(row.age),
    });
    expect(col.label).toBe("Age");
    expect(col.sort).toBeUndefined();
    expect(col.filter).toBeUndefined();
  });

  it("supports accessor and width", () => {
    const col = column<TestRow>({
      label: "Actions",
      width: 100,
      render: (row) => `${row.name}: ${row.age}`,
      accessor: (row) => row.name,
    });
    expect(col.label).toBe("Actions");
    expect(col.width).toBe(100);
    expect(typeof col.render).toBe("function");
    expect(typeof col.accessor).toBe("function");
  });

  it("allows undefined label", () => {
    const col = column<TestRow>({
      render: (row) => row.name,
    });
    expect(col.label).toBeUndefined();
    expect(typeof col.render).toBe("function");
  });
});

describe("inferColumns()", () => {
  it("returns a function that produces column options from metadata", () => {
    type TaskRow = { id: string; title: string; status: string };
    const metadata = {
      name: "task",
      pluralForm: "tasks",
      fields: [
        { name: "id", type: "uuid", required: true },
        { name: "title", type: "string", required: true },
        {
          name: "status",
          type: "enum",
          required: true,
          enumValues: ["todo", "done"],
        },
      ],
    } as const;

    const infer = inferColumns<TaskRow>(metadata);

    const titleOpts = infer("title");
    expect(titleOpts.label).toBe("title");
    expect(titleOpts.sort).toEqual({ field: "title", type: "string" });
    expect(typeof titleOpts.render).toBe("function");
    expect(typeof titleOpts.accessor).toBe("function");

    const titleCol = column(infer("title"));
    expect(titleCol.label).toBe("title");
    expect(titleCol.sort).toEqual({ field: "title", type: "string" });

    const customCol = column({
      ...infer("status"),
      label: "Custom Status",
    });
    expect(customCol.label).toBe("Custom Status");
  });
});

describe("fieldTypeToSortConfig", () => {
  it("maps string to string sort", () => {
    expect(fieldTypeToSortConfig("name", "string")).toEqual({
      field: "name",
      type: "string",
    });
  });

  it("maps number to number sort", () => {
    expect(fieldTypeToSortConfig("amount", "number")).toEqual({
      field: "amount",
      type: "number",
    });
  });

  it("maps datetime to date sort", () => {
    expect(fieldTypeToSortConfig("createdAt", "datetime")).toEqual({
      field: "createdAt",
      type: "date",
    });
  });

  it("maps date to date sort", () => {
    expect(fieldTypeToSortConfig("dueDate", "date")).toEqual({
      field: "dueDate",
      type: "date",
    });
  });

  it("maps enum to string sort", () => {
    expect(fieldTypeToSortConfig("status", "enum")).toEqual({
      field: "status",
      type: "string",
    });
  });

  it("returns undefined for uuid", () => {
    expect(fieldTypeToSortConfig("id", "uuid")).toBeUndefined();
  });

  it("returns undefined for array", () => {
    expect(fieldTypeToSortConfig("tags", "array")).toBeUndefined();
  });

  it("returns undefined for nested", () => {
    expect(fieldTypeToSortConfig("meta", "nested")).toBeUndefined();
  });
});

describe("fieldTypeToFilterConfig", () => {
  it("maps string to string filter", () => {
    expect(fieldTypeToFilterConfig("name", "string")).toEqual({
      field: "name",
      type: "string",
    });
  });

  it("maps number to number filter", () => {
    expect(fieldTypeToFilterConfig("amount", "number")).toEqual({
      field: "amount",
      type: "number",
    });
  });

  it("maps uuid to uuid filter", () => {
    expect(fieldTypeToFilterConfig("id", "uuid")).toEqual({
      field: "id",
      type: "uuid",
    });
  });

  it("maps enum with values to enum filter", () => {
    expect(fieldTypeToFilterConfig("status", "enum", ["a", "b", "c"])).toEqual({
      field: "status",
      type: "enum",
      options: [
        { value: "a", label: "a" },
        { value: "b", label: "b" },
        { value: "c", label: "c" },
      ],
    });
  });

  it("returns undefined for array", () => {
    expect(fieldTypeToFilterConfig("tags", "array")).toBeUndefined();
  });
});

describe("inferColumns() with metadata", () => {
  const testMetadata = {
    task: {
      name: "task",
      pluralForm: "tasks",
      fields: [
        { name: "id", type: "uuid", required: true },
        { name: "title", type: "string", required: true },
        {
          name: "status",
          type: "enum",
          required: true,
          enumValues: ["todo", "in_progress", "done"],
        },
        { name: "dueDate", type: "date", required: false },
        { name: "count", type: "number", required: false },
        { name: "isActive", type: "boolean", required: false },
        {
          name: "tags",
          type: "array",
          required: false,
          arrayItemType: "string",
        },
      ],
    },
  } as const satisfies TableMetadataMap;

  type TaskRow = {
    id: string;
    title: string;
    status: string;
    dueDate: string;
    count: number;
    isActive: boolean;
    tags: string[];
  };

  it("creates column options with auto-detected sort/filter", () => {
    const infer = inferColumns<TaskRow>(testMetadata.task);

    const titleOpts = infer("title");
    expect(titleOpts.label).toBe("title");
    expect(titleOpts.sort).toEqual({ field: "title", type: "string" });
    expect(titleOpts.filter).toEqual({ field: "title", type: "string" });
    expect(typeof titleOpts.render).toBe("function");
    expect(typeof titleOpts.accessor).toBe("function");
  });

  it("auto-detects enum options", () => {
    const infer = inferColumns<TaskRow>(testMetadata.task);
    const statusOpts = infer("status");
    expect(statusOpts.filter).toEqual({
      field: "status",
      type: "enum",
      options: [
        { value: "todo", label: "todo" },
        { value: "in_progress", label: "in_progress" },
        { value: "done", label: "done" },
      ],
    });
    expect(statusOpts.sort).toEqual({ field: "status", type: "string" });
  });

  it("auto-detects date type", () => {
    const infer = inferColumns<TaskRow>(testMetadata.task);
    const dateOpts = infer("dueDate");
    expect(dateOpts.sort).toEqual({ field: "dueDate", type: "date" });
    expect(dateOpts.filter).toEqual({ field: "dueDate", type: "date" });
  });

  it("disables sort with sort: false", () => {
    const infer = inferColumns<TaskRow>(testMetadata.task);
    const opts = infer("title", { sort: false });
    expect(opts.sort).toBeUndefined();
    expect(opts.filter).toEqual({ field: "title", type: "string" });
  });

  it("disables filter with filter: false", () => {
    const infer = inferColumns<TaskRow>(testMetadata.task);
    const opts = infer("title", { filter: false });
    expect(opts.sort).toEqual({ field: "title", type: "string" });
    expect(opts.filter).toBeUndefined();
  });

  it("uuid has no sort, has uuid filter", () => {
    const infer = inferColumns<TaskRow>(testMetadata.task);
    const opts = infer("id");
    expect(opts.sort).toBeUndefined();
    expect(opts.filter).toEqual({ field: "id", type: "uuid" });
  });

  it("array type has no sort/filter", () => {
    const infer = inferColumns<TaskRow>(testMetadata.task);
    const opts = infer("tags");
    expect(opts.sort).toBeUndefined();
    expect(opts.filter).toBeUndefined();
  });

  it("generates default render and accessor functions", () => {
    const infer = inferColumns<TaskRow>(testMetadata.task);

    const opts = infer("title");
    const testRow = {
      id: "1",
      title: "Test Task",
      status: "todo",
      dueDate: "2024-01-01",
      count: 5,
      isActive: true,
      tags: ["a"],
    };

    expect(opts.render(testRow)).toBe("Test Task");
    expect(opts.accessor!(testRow)).toBe("Test Task");
  });

  it("throws for non-existent field", () => {
    const infer = inferColumns<TaskRow>(testMetadata.task);
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      infer("nonExistent" as any),
    ).toThrow('Field "nonExistent" not found in table "task" metadata');
  });

  it("infers TableFieldName type correctly", () => {
    type TaskFieldNames = TableFieldName<(typeof testMetadata)["task"]>;
    expectTypeOf<TaskFieldNames>().toEqualTypeOf<
      "id" | "title" | "status" | "dueDate" | "count" | "isActive" | "tags"
    >();
  });

  it("spread override works with column()", () => {
    const infer = inferColumns<TaskRow>(testMetadata.task);

    const col = column({
      ...infer("title"),
      label: "Custom Title",
      width: 200,
    });
    expect(col.label).toBe("Custom Title");
    expect(col.width).toBe(200);
    expect(col.sort).toEqual({ field: "title", type: "string" });
  });
});

describe("createColumnHelper()", () => {
  type OrderRow = { id: string; name: string; amount: number };

  it("returns column and inferColumns with TRow bound", () => {
    const helper = createColumnHelper<OrderRow>();
    expect(typeof helper.column).toBe("function");
    expect(typeof helper.inferColumns).toBe("function");
  });

  it("column() works without type parameter", () => {
    const { column: helperColumn } = createColumnHelper<OrderRow>();
    const col = helperColumn({
      label: "Name",
      render: (row) => row.name,
      sort: { field: "name", type: "string" },
    });
    expect(col.label).toBe("Name");
    expect(col.sort).toEqual({ field: "name", type: "string" });
  });

  it("inferColumns() works without type parameter", () => {
    const metadata = {
      name: "order",
      pluralForm: "orders",
      fields: [
        { name: "id", type: "uuid", required: true },
        { name: "name", type: "string", required: true },
        { name: "amount", type: "number", required: false },
      ],
    } as const;

    const { column: helperColumn, inferColumns: helperInferColumns } =
      createColumnHelper<OrderRow>();
    const infer = helperInferColumns(metadata);

    const col = helperColumn(infer("name"));
    expect(col.label).toBe("name");
    expect(col.sort).toEqual({ field: "name", type: "string" });
  });

  it("column + inferColumns spread override", () => {
    const metadata = {
      name: "order",
      pluralForm: "orders",
      fields: [
        { name: "id", type: "uuid", required: true },
        { name: "name", type: "string", required: true },
        { name: "amount", type: "number", required: false },
      ],
    } as const;

    const { column: helperColumn, inferColumns: helperInferColumns } =
      createColumnHelper<OrderRow>();
    const infer = helperInferColumns(metadata);

    const col = helperColumn({
      ...infer("name"),
      label: "Custom Name",
      render: (row) => `Name: ${row.name}`,
    });
    expect(col.label).toBe("Custom Name");
    expect(col.sort).toEqual({ field: "name", type: "string" });
    expect(col.render({ id: "1", name: "Test", amount: 0 })).toBe("Name: Test");
  });
});
