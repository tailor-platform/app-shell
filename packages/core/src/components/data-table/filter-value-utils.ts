const DECIMAL_RE = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/;

export function isDecimalFilterValueValid(value: string): boolean {
  return DECIMAL_RE.test(value.trim());
}

function decimalParts(value: string) {
  const match = DECIMAL_RE.exec(value.trim());
  if (!match) return undefined;
  const fraction = match[3] ?? match[4] ?? "";
  const digits = `${match[2] ?? ""}${fraction}`.replace(/^0+/, "");
  const sign = match[1] === "-" ? -1 : 1;
  return {
    digits,
    sign: digits === "" ? 0 : sign,
    magnitude: BigInt(digits.length - fraction.length) + BigInt(match[5] ?? "0"),
  };
}

export function isDecimalRangeOrdered(min: string, max: string): boolean {
  const lower = decimalParts(min);
  const upper = decimalParts(max);
  if (!lower || !upper) return false;
  if (lower.sign !== upper.sign) return lower.sign < upper.sign;
  if (lower.sign === 0) return true;

  // Compare magnitude, then significant digits, without rounding or expanding exponents.
  if (lower.magnitude !== upper.magnitude) {
    return lower.sign === 1 ? lower.magnitude < upper.magnitude : lower.magnitude > upper.magnitude;
  }
  const width = Math.max(lower.digits.length, upper.digits.length);
  const left = lower.digits.padEnd(width, "0");
  const right = upper.digits.padEnd(width, "0");
  return lower.sign === 1 ? left <= right : left >= right;
}
