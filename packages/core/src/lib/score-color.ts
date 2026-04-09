/**
 * Returns a Tailwind color class based on a numeric score (0-100).
 * Green for >= 90, yellow for >= 70, red/destructive for < 70.
 */
export function scoreColor(score: number): string {
  if (score >= 90) return "astw:text-green-700 astw:dark:text-green-500";
  if (score >= 70) return "astw:text-yellow-700 astw:dark:text-yellow-500";
  return "astw:text-destructive";
}
