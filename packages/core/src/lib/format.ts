/**
 * Formats a number as a currency string using Intl.NumberFormat.
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}
