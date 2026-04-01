import type { StandardSchemaV1 } from "@standard-schema/spec";

function success<T>(value: T): StandardSchemaV1.SuccessResult<T> {
  return { value };
}

function failure(message: string): StandardSchemaV1.FailureResult {
  return { issues: [{ message }] };
}

function createSchema<I, O>(
  validate: (value: unknown) => StandardSchemaV1.Result<O>,
): StandardSchemaV1<I, O> {
  return { "~standard": { version: 1, vendor: "csv-importer", validate } };
}

/** Built-in Standard Schema helpers for common CSV column types. */
export const csv = {
  /** Pass-through with optional length constraints. `min: 1` serves as a required check. */
  string(options?: { min?: number; max?: number }): StandardSchemaV1<string, string> {
    return createSchema((value) => {
      const str = String(value ?? "");
      if (options?.min !== undefined && str.length < options.min) {
        return failure(`Must be at least ${options.min} character(s)`);
      }
      if (options?.max !== undefined && str.length > options.max) {
        return failure(`Must be at most ${options.max} character(s)`);
      }
      return success(str);
    });
  },

  /** Coerces the raw CSV string to a number. Rejects `NaN`. */
  number(options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  }): StandardSchemaV1<string, number> {
    return createSchema((value) => {
      const num = Number(value);
      if (Number.isNaN(num)) {
        return failure("Must be a valid number");
      }
      if (options?.integer && !Number.isInteger(num)) {
        return failure("Must be an integer");
      }
      if (options?.min !== undefined && num < options.min) {
        return failure(`Must be at least ${options.min}`);
      }
      if (options?.max !== undefined && num > options.max) {
        return failure(`Must be at most ${options.max}`);
      }
      return success(num);
    });
  },

  /** Coerces common CSV boolean representations to `true`/`false`. Case-insensitive. */
  boolean(options?: { truthy?: string[]; falsy?: string[] }): StandardSchemaV1<string, boolean> {
    const truthyValues = (options?.truthy ?? ["true", "1", "yes"]).map((v) => v.toLowerCase());
    const falsyValues = (options?.falsy ?? ["false", "0", "no"]).map((v) => v.toLowerCase());
    return createSchema((value) => {
      const str = String(value ?? "").toLowerCase();
      if (truthyValues.includes(str)) return success(true);
      if (falsyValues.includes(str)) return success(false);
      return failure(`Must be one of: ${[...truthyValues, ...falsyValues].join(", ")}`);
    });
  },

  /** Coerces the raw CSV string to a `Date` object. Rejects unparseable values. */
  date(): StandardSchemaV1<string, Date> {
    return createSchema((value) => {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) {
        return failure("Must be a valid date");
      }
      return success(d);
    });
  },

  /** Validates the value is one of the allowed strings. Case-sensitive. */
  enum<T extends string>(values: T[]): StandardSchemaV1<string, T> {
    return createSchema((value) => {
      const str = String(value ?? "");
      if (values.includes(str as T)) {
        return success(str as T);
      }
      return failure(`Must be one of: ${values.join(", ")}`);
    });
  },
};
