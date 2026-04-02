import { describe, expect, it } from "vitest";
import { csv } from "./validators";

function validate<T>(
  schema: { "~standard": { validate: (v: unknown) => unknown } },
  value: unknown,
) {
  return schema["~standard"].validate(value) as { value: T } | { issues: { message: string }[] };
}

describe("csv.string", () => {
  it("passes through without options", () => {
    const result = validate<string>(csv.string(), "hello");
    expect(result).toEqual({ value: "hello" });
  });

  it("coerces null/undefined to empty string", () => {
    expect(validate(csv.string(), null)).toEqual({ value: "" });
    expect(validate(csv.string(), undefined)).toEqual({ value: "" });
  });

  it("enforces min length", () => {
    const schema = csv.string({ min: 3 });
    expect(validate(schema, "ab")).toEqual({
      issues: [{ message: "Must be at least 3 character(s)" }],
    });
    expect(validate<string>(schema, "abc")).toEqual({ value: "abc" });
  });

  it("enforces max length", () => {
    const schema = csv.string({ max: 5 });
    expect(validate(schema, "toolong")).toEqual({
      issues: [{ message: "Must be at most 5 character(s)" }],
    });
    expect(validate<string>(schema, "ok")).toEqual({ value: "ok" });
  });

  it("min: 1 acts as required check", () => {
    const schema = csv.string({ min: 1 });
    expect(validate(schema, "")).toEqual({
      issues: [{ message: "Must be at least 1 character(s)" }],
    });
    expect(validate<string>(schema, "a")).toEqual({ value: "a" });
  });

  it("enforces min and max together", () => {
    const schema = csv.string({ min: 2, max: 4 });
    expect(validate(schema, "a")).toEqual({
      issues: [{ message: "Must be at least 2 character(s)" }],
    });
    expect(validate(schema, "abcde")).toEqual({
      issues: [{ message: "Must be at most 4 character(s)" }],
    });
    expect(validate<string>(schema, "abc")).toEqual({ value: "abc" });
  });
});

describe("csv.number", () => {
  it("coerces a valid number string", () => {
    expect(validate<number>(csv.number(), "42")).toEqual({ value: 42 });
  });

  it("handles decimal values", () => {
    expect(validate<number>(csv.number(), "3.14")).toEqual({ value: 3.14 });
  });

  it("rejects NaN", () => {
    expect(validate(csv.number(), "abc")).toEqual({
      issues: [{ message: "Must be a valid number" }],
    });
  });

  it("rejects empty string", () => {
    expect(validate(csv.number(), "")).toEqual({
      issues: [{ message: "Must be a valid number" }],
    });
  });

  it("enforces integer", () => {
    const schema = csv.number({ integer: true });
    expect(validate(schema, "3.5")).toEqual({
      issues: [{ message: "Must be an integer" }],
    });
    expect(validate<number>(schema, "3")).toEqual({ value: 3 });
  });

  it("enforces min", () => {
    const schema = csv.number({ min: 10 });
    expect(validate(schema, "5")).toEqual({
      issues: [{ message: "Must be at least 10" }],
    });
    expect(validate<number>(schema, "10")).toEqual({ value: 10 });
  });

  it("enforces max", () => {
    const schema = csv.number({ max: 100 });
    expect(validate(schema, "101")).toEqual({
      issues: [{ message: "Must be at most 100" }],
    });
    expect(validate<number>(schema, "100")).toEqual({ value: 100 });
  });

  it("enforces min, max, and integer together", () => {
    const schema = csv.number({ min: 1, max: 10, integer: true });
    expect(validate(schema, "0")).toEqual({
      issues: [{ message: "Must be at least 1" }],
    });
    expect(validate(schema, "11")).toEqual({
      issues: [{ message: "Must be at most 10" }],
    });
    expect(validate(schema, "5.5")).toEqual({
      issues: [{ message: "Must be an integer" }],
    });
    expect(validate<number>(schema, "5")).toEqual({ value: 5 });
  });
});

describe("csv.boolean", () => {
  it("accepts default truthy values", () => {
    for (const v of ["true", "1", "yes", "TRUE", "Yes"]) {
      expect(validate<boolean>(csv.boolean(), v)).toEqual({ value: true });
    }
  });

  it("accepts default falsy values", () => {
    for (const v of ["false", "0", "no", "FALSE", "No"]) {
      expect(validate<boolean>(csv.boolean(), v)).toEqual({ value: false });
    }
  });

  it("rejects unrecognized values", () => {
    const result = validate(csv.boolean(), "maybe");
    expect(result).toHaveProperty("issues");
  });

  it("uses custom truthy/falsy values", () => {
    const schema = csv.boolean({ truthy: ["on"], falsy: ["off"] });
    expect(validate<boolean>(schema, "on")).toEqual({ value: true });
    expect(validate<boolean>(schema, "OFF")).toEqual({ value: false });
    // default "true" should not work with custom values
    const result = validate(schema, "true");
    expect(result).toHaveProperty("issues");
  });
});

describe("csv.date", () => {
  it("parses a valid ISO date string", () => {
    const result = validate<Date>(csv.date(), "2024-01-15");
    expect(result).toHaveProperty("value");
    expect((result as { value: Date }).value).toBeInstanceOf(Date);
    expect((result as { value: Date }).value.getFullYear()).toBe(2024);
  });

  it("parses a datetime string", () => {
    const result = validate<Date>(csv.date(), "2024-06-15T10:30:00Z");
    expect(result).toHaveProperty("value");
  });

  it("rejects invalid date strings", () => {
    expect(validate(csv.date(), "not-a-date")).toEqual({
      issues: [{ message: "Must be a valid date" }],
    });
  });

  it("rejects empty string", () => {
    expect(validate(csv.date(), "")).toEqual({
      issues: [{ message: "Must be a valid date" }],
    });
  });
});

describe("csv.enum", () => {
  it("accepts a value in the allowed list", () => {
    const schema = csv.enum(["active", "inactive"]);
    expect(validate<string>(schema, "active")).toEqual({ value: "active" });
  });

  it("rejects a value not in the list", () => {
    const schema = csv.enum(["active", "inactive"]);
    expect(validate(schema, "deleted")).toEqual({
      issues: [{ message: "Must be one of: active, inactive" }],
    });
  });

  it("is case-sensitive", () => {
    const schema = csv.enum(["Active"]);
    expect(validate(schema, "active")).toEqual({
      issues: [{ message: "Must be one of: Active" }],
    });
    expect(validate<string>(schema, "Active")).toEqual({ value: "Active" });
  });

  it("handles empty string against non-empty enum", () => {
    const schema = csv.enum(["a", "b"]);
    expect(validate(schema, "")).toEqual({
      issues: [{ message: "Must be one of: a, b" }],
    });
  });
});
