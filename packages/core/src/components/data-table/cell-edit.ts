/**
 * Pure helpers behind DataTable's inline cell editing: which keystrokes a number
 * cell accepts, how typed or pasted text becomes a value, which rules a draft
 * breaks, and whether a draft is a real change or a cosmetic one (`10` vs
 * `10.00`). Kept free of React so every rule can be unit-tested directly.
 *
 * @internal
 */

/** Rules a `number` / `money` cell enforces while the user types and on commit. */
export interface NumberEditRules {
  min?: number;
  max?: number;
  /** Digits allowed after the decimal point. `0` means whole numbers only. */
  maxDecimals: number;
  required: boolean;
}

/** Why a draft can't be committed. The cell maps each code to an i18n message. */
export type CellEditError =
  | { code: "required" }
  | { code: "number" }
  | { code: "decimals"; maxDecimals: number }
  | { code: "min"; min: number }
  | { code: "max"; max: number }
  | { code: "custom"; message: string };

/** A draft's parsed value alongside the first rule it breaks, if any. */
export interface DraftEvaluation<TValue> {
  value: TValue | null;
  error: CellEditError | null;
}

type Validate<TValue> = ((value: TValue | null) => string | null | undefined) | undefined;

/**
 * Errors worth showing while the user is still typing. More keystrokes can't
 * fix these (a value over `max` only grows), whereas `min`, `required` and a
 * half-typed number are ordinary mid-typing states — those wait until the user
 * tries to save, so the cell doesn't flash red on every keystroke.
 */
export function isLiveError(error: CellEditError): boolean {
  return error.code === "max" || error.code === "decimals" || error.code === "custom";
}

/**
 * Whether `text` is something the user could be partway through typing into a
 * number cell. Characters that can never be valid are rejected here: a minus
 * sign when negatives aren't allowed, a decimal point for whole numbers, and
 * digits past `maxDecimals`.
 */
export function isAllowedNumberText(
  text: string,
  rules: Pick<NumberEditRules, "min" | "maxDecimals">,
): boolean {
  const sign = rules.min === undefined || rules.min < 0 ? "-?" : "";
  const fraction = rules.maxDecimals > 0 ? `(?:\\.\\d{0,${rules.maxDecimals}})?` : "";
  return new RegExp(`^${sign}\\d*${fraction}$`).test(text);
}

// Thousands grouping with commas, e.g. "1,234,567.89".
const GROUPED_NUMBER = /^-?\d{1,3}(?:,\d{3})+(?:\.\d*)?$/;

/**
 * Cleans number text that arrived all at once (a paste, or the end of an IME
 * composition): full-width digits and signs become ASCII, whitespace and
 * currency symbols are dropped, and commas are removed only when they form
 * strict thousands groups — so "1,234.5" becomes "1234.5", while "1,5" is left
 * alone to fail as "not a number" instead of silently turning into 15.
 */
export function normalizeNumberText(text: string): string {
  const compact = text
    .normalize("NFKC")
    .replace(/[\s\p{Sc}]/gu, "")
    .replace(/^−/, "-");
  return GROUPED_NUMBER.test(compact) ? compact.replace(/,/g, "") : compact;
}

/** `""` → `null`, `"5."` → `5`; `"-"`, `"."` and anything non-numeric → `undefined`. */
export function parseNumberText(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) return undefined;
  // `+ 0` folds -0 into 0 so "-0" doesn't read as a change from 0.
  return value + 0;
}

// Digits after the decimal point, ignoring trailing zeros ("2.50" has one).
function significantDecimals(text: string): number {
  const dot = text.indexOf(".");
  if (dot === -1) return 0;
  return text.slice(dot + 1).replace(/0+$/, "").length;
}

/**
 * Parses a number draft and checks it against the column's rules, in order:
 * required → not a number → decimals → min → max → the consumer's `validate`.
 */
export function evaluateNumberDraft(
  text: string,
  rules: NumberEditRules,
  validate?: Validate<number>,
): DraftEvaluation<number> {
  const value = parseNumberText(text);
  if (value === undefined) return { value: null, error: { code: "number" } };
  if (value === null) {
    return { value, error: rules.required ? { code: "required" } : customError(validate, value) };
  }
  if (significantDecimals(text) > rules.maxDecimals) {
    return { value, error: { code: "decimals", maxDecimals: rules.maxDecimals } };
  }
  if (rules.min !== undefined && value < rules.min) {
    return { value, error: { code: "min", min: rules.min } };
  }
  if (rules.max !== undefined && value > rules.max) {
    return { value, error: { code: "max", max: rules.max } };
  }
  return { value, error: customError(validate, value) };
}

/** Text drafts: an empty field is `null`; otherwise the text exactly as typed. */
export function evaluateTextDraft(
  text: string,
  required: boolean,
  validate?: Validate<string>,
): DraftEvaluation<string> {
  const value = text === "" ? null : text;
  if (value === null && required) return { value, error: { code: "required" } };
  return { value, error: customError(validate, value) };
}

function customError<TValue>(validate: Validate<TValue>, value: TValue | null) {
  const message = validate?.(value);
  return message ? ({ code: "custom", message } as const) : null;
}

/** Reads a raw cell value as a number the way the `number` renderer does. */
export function toNumberValue(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Reads a raw cell value as text; `null`, `undefined` and `""` are all empty. */
export function toTextValue(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  return String(raw);
}

// 15 significant digits drops floating-point noise (0.1 + 0.2 → 0.3).
function roundNoise(value: number): number {
  return Number(value.toPrecision(15));
}

/** `10`, `10.0` and `9.999999999999998` are the same number to a user. */
export function sameNumber(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return roundNoise(a) === roundNoise(b);
}

/** A number as the user types it: no grouping, no exponent, no float noise. */
export function toNumberEditText(value: number | null): string {
  if (value === null) return "";
  return roundNoise(value).toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 20,
  });
}

const currencyDigits = new Map<string, number>();

/**
 * Decimal places a currency uses (USD 2, JPY 0, KWD 3). Fraction digits come
 * from ISO 4217 and don't depend on locale. An invalid code resolves to USD's,
 * matching the `money` renderer's fallback.
 */
export function currencyFractionDigits(currency: string): number {
  let digits = currencyDigits.get(currency);
  if (digits === undefined) {
    try {
      digits =
        new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions()
          .maximumFractionDigits ?? 2;
    } catch {
      digits = 2;
    }
    currencyDigits.set(currency, digits);
  }
  return digits;
}

/** Whether a value `onCommit` returned is a promise-like the cell should wait on. */
export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}
