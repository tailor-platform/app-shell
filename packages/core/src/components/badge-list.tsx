"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { Badge } from "./badge";
import type { BadgeProps } from "./badge";

// ============================================================================
// BADGE UTILITIES (types & helpers)
// ============================================================================

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
  /** Variant used when the value is not in `badgeVariantMap`. Default: `"outline-neutral"`. */
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
  return options?.defaultBadgeVariant ?? "outline-neutral";
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

export function toValueArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value != null) return [value];
  return [];
}

// ============================================================================
// BADGE LIST COMPONENT
// ============================================================================

/**
 * Props for the BadgeList component.
 */
export interface BadgeListProps {
  /** Raw value(s) to render as badges. Accepts a single value or an array. */
  value: unknown;
  /** Badge options (variant map, label map, default variant). */
  options?: BadgeOptions;
  /** Maximum number of visible badges before showing "+N" overflow. */
  maxVisible?: number;
  /**
   * Custom label resolver. Called for each value to determine the display text.
   * When omitted, falls back to `badgeLabelMap` lookup then raw string value.
   */
  resolveLabel?: (value: string) => string;
  /** Additional className applied to each Badge element. */
  badgeClassName?: string;
}

/**
 * Shared badge list renderer used by DataTable and DescriptionCard.
 * Renders one or more Badge components with optional overflow popover.
 */
export function BadgeList({
  value,
  options,
  maxVisible,
  resolveLabel: resolveLabelProp,
  badgeClassName,
}: BadgeListProps): React.ReactNode {
  const values = toValueArray(value);
  const nonEmpty = values.filter((v) => v != null && v !== "");

  if (nonEmpty.length === 0) return null;

  const getLabel = (raw: unknown) => {
    const str = String(raw);
    if (resolveLabelProp) return resolveLabelProp(str);
    return resolveBadgeLabel(str, options) ?? str;
  };

  const visible = maxVisible != null ? nonEmpty.slice(0, maxVisible) : nonEmpty;
  const overflow = maxVisible != null ? nonEmpty.slice(maxVisible) : [];

  const renderSingleBadge = (raw: unknown, i: number) => {
    const str = String(raw);
    const variant = resolveBadgeVariant(str, options);
    const label = getLabel(raw);
    return (
      <Badge key={i} variant={variant} className={badgeClassName}>
        {label}
      </Badge>
    );
  };

  // Single badge — no wrapper div needed
  if (visible.length === 1 && overflow.length === 0) {
    return renderSingleBadge(visible[0], 0);
  }

  return (
    <div className="astw:flex astw:flex-wrap astw:gap-1">
      {visible.map((raw, i) => renderSingleBadge(raw, i))}
      {overflow.length > 0 && (
        <Popover.Root>
          <Popover.Trigger
            openOnHover
            className="astw:cursor-default astw:rounded-md astw:px-2 astw:py-0.5 astw:text-xs astw:font-medium astw:text-muted-foreground astw:hover:bg-muted astw:transition-colors"
          >
            +{overflow.length}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={4} side="bottom" align="start">
              <Popover.Popup className="astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:origin-(--transform-origin) astw:rounded-md astw:border astw:p-2 astw:shadow-md astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95">
                <div className="astw:flex astw:flex-wrap astw:gap-1">
                  {overflow.map((raw, i) => renderSingleBadge(raw, i))}
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
}
