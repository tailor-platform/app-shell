import type { CsvColumnRule } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Built-in validation rules for CSV columns. */
export const csvRules = {
  /** Rejects empty, null, or undefined values. */
  required: (message?: string): CsvColumnRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === "") {
        return message ?? "This field is required";
      }
      return undefined;
    },
  }),

  /** Validates against a regular expression. */
  pattern: (regex: RegExp, message?: string): CsvColumnRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      if (!regex.test(String(value))) {
        return message ?? `Must match pattern ${regex.source}`;
      }
      return undefined;
    },
  }),

  /** Validates a number is within a range (inclusive). */
  range: (min: number, max: number, message?: string): CsvColumnRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      const num = Number(value);
      if (Number.isNaN(num) || num < min || num > max) {
        return message ?? `Must be between ${min} and ${max}`;
      }
      return undefined;
    },
  }),

  /** Validates the value is one of the allowed values. */
  oneOf: (values: unknown[], message?: string): CsvColumnRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      if (!values.includes(value)) {
        return message ?? `Must be one of: ${values.join(", ")}`;
      }
      return undefined;
    },
  }),

  /** Validates an email address format. */
  email: (message?: string): CsvColumnRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      if (!EMAIL_RE.test(String(value))) {
        return message ?? "Must be a valid email address";
      }
      return undefined;
    },
  }),

  /** Validates the value can be parsed as a date. */
  date: (message?: string): CsvColumnRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) {
        return message ?? "Must be a valid date";
      }
      return undefined;
    },
  }),

  /** Validates string length (min and optional max). */
  length: (min: number, max?: number, message?: string): CsvColumnRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      const len = String(value).length;
      if (len < min || (max !== undefined && len > max)) {
        const range = max !== undefined ? `${min}-${max}` : `at least ${min}`;
        return message ?? `Length must be ${range} characters`;
      }
      return undefined;
    },
  }),
};
