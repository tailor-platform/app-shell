import type { BadgeProps } from "./badge";

/**
 * Variant union accepted by the app-shell `<Badge>` component.
 * Shared across DataTable, DescriptionCard, and any other badge consumers.
 */
export type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Common options for badge rendering.
 */
export interface BadgeOptions {
  /**
   * Maps each value (stringified) to a Badge variant. Values not in the
   * map fall back to `defaultBadgeVariant`.
   */
  badgeVariantMap?: Record<string, BadgeVariant>;
  /**
   * Maps each value (stringified) to a display label. Values not in the
   * map render the raw value (or sentence-cased value if enabled).
   */
  badgeLabelMap?: Record<string, string>;
  /** Variant used when the value is not in `badgeVariantMap`. Default: `"neutral"`. */
  defaultBadgeVariant?: BadgeVariant;
}

/**
 * Resolve badge variant for a given value string.
 * Supports case-insensitive lookup as a fallback.
 */
export function resolveBadgeVariant(
  value: string,
  options: BadgeOptions | undefined,
): BadgeVariant {
  const map = options?.badgeVariantMap;
  if (map) {
    const direct = map[value];
    if (direct) return direct;
    const lower = map[value.toLowerCase()];
    if (lower) return lower;
  }
  return options?.defaultBadgeVariant ?? "neutral";
}

/**
 * Resolve badge display label for a given value string.
 */
export function resolveBadgeLabel(
  value: string,
  options: BadgeOptions | undefined,
): string | undefined {
  return options?.badgeLabelMap?.[value];
}
