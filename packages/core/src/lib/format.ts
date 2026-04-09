/**
 * Formats a number as a currency string using Intl.NumberFormat.
 * Returns a plain number string if the currency code is invalid.
 */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
