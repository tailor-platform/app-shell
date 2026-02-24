"use client";

import * as React from "react";
import { Badge } from "../badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";
import { Copy, Check, ExternalLink } from "lucide-react";
import type { ResolvedField, DateFormat, BadgeVariantType } from "./types";

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get a value from a nested object using dot notation
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Check if a value is empty (null, undefined, or empty string)
 */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/**
 * Convert a string to sentence case (first letter uppercase, rest lowercase)
 * Handles snake_case and SCREAMING_SNAKE_CASE by replacing underscores with spaces
 * Examples: "CONFIRMED" → "Confirmed", "NOT_RECEIVED" → "Not received"
 */
function toSentenceCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Format a date value
 */
function formatDate(value: unknown, format: DateFormat = "medium"): string {
  if (isEmpty(value)) return "";

  const date = value instanceof Date ? value : new Date(String(value));

  if (isNaN(date.getTime())) return String(value);

  switch (format) {
    case "short":
      return date.toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
      });
    case "medium":
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case "long":
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "relative": {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    }
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Format a money value with currency
 */
function formatMoney(value: unknown, currencyCode?: string): string {
  if (isEmpty(value)) return "";

  const numValue =
    typeof value === "number" ? value : parseFloat(String(value));

  if (isNaN(numValue)) return String(value);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "USD",
    }).format(numValue);
  } catch {
    // Fallback if currency code is invalid
    return `${currencyCode || "$"}${numValue.toFixed(2)}`;
  }
}

/**
 * Format an address (string or object) into displayable lines
 */
function formatAddress(value: unknown): string[] {
  if (isEmpty(value)) return [];

  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (typeof value === "object" && value !== null) {
    const addr = value as Record<string, unknown>;
    const lines: string[] = [];

    if (addr.line1) lines.push(String(addr.line1));
    if (addr.line2) lines.push(String(addr.line2));

    const cityStateZip = [
      addr.city,
      addr.state || addr.province,
      addr.zip || addr.postalCode,
    ]
      .filter(Boolean)
      .join(", ");

    if (cityStateZip) lines.push(cityStateZip);
    if (addr.country) lines.push(String(addr.country));

    return lines;
  }

  return [String(value)];
}

// ============================================================================
// COPY BUTTON
// ============================================================================

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail if clipboard access is denied
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            onClick={handleCopy}
            className="astw:ml-0.5 astw:inline-flex astw:items-center astw:justify-center astw:p-1 astw:rounded astw:hover:bg-muted astw:transition-colors astw:text-muted-foreground astw:hover:text-foreground"
          />
        }
      >
        {copied ? (
          <Check className="astw:h-3 astw:w-3" strokeWidth={2.5} />
        ) : (
          <Copy className="astw:h-3 astw:w-3" strokeWidth={2.5} />
        )}
      </TooltipTrigger>
      <TooltipContent side="top">{copied ? "Copied!" : "Copy"}</TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// FIELD RENDERERS
// ============================================================================

/**
 * Empty value placeholder
 */
const EMPTY_DASH = "–";

/**
 * Render a text field
 */
function TextFieldRenderer({ field }: { field: ResolvedField }) {
  const value = isEmpty(field.value) ? EMPTY_DASH : String(field.value);
  const showCopy = field.meta?.copyable && !isEmpty(field.value);
  const truncateLines = field.meta?.truncateLines;
  const textRef = React.useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  // Check if text is actually truncated after layout
  React.useEffect(() => {
    if (!truncateLines) {
      setIsTruncated(false);
      return;
    }

    const checkTruncation = () => {
      if (textRef.current) {
        const el = textRef.current;
        // Check if content overflows
        setIsTruncated(el.scrollHeight > el.clientHeight + 1);
      }
    };

    // Check after a small delay to ensure layout is complete
    const timeoutId = setTimeout(checkTruncation, 50);

    // Also check on resize
    window.addEventListener("resize", checkTruncation);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkTruncation);
    };
  }, [value, truncateLines]);

  // Line clamp - use inline style for arbitrary values to ensure it works with prefix
  const lineClampStyle =
    truncateLines && truncateLines > 0
      ? {
          display: "-webkit-box",
          WebkitLineClamp: truncateLines,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }
      : undefined;

  // Always render the same structure, conditionally wrap with tooltip
  const content = (
    <div className="astw:flex astw:items-start astw:gap-1 astw:min-w-0">
      <p
        ref={textRef}
        className="astw:text-sm astw:font-medium astw:text-foreground astw:wrap-break-word astw:m-0"
        style={lineClampStyle}
      >
        {value}
      </p>
      {showCopy && <CopyButton value={String(field.value)} />}
    </div>
  );

  // Wrap in tooltip only if actually truncated
  if (truncateLines && isTruncated) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="astw:cursor-default" />}>
          {content}
        </TooltipTrigger>
        <TooltipContent side="bottom" style={{ maxWidth: 320 }}>
          <p className="astw:text-sm">{value}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

/**
 * Render a badge field
 */
function BadgeFieldRenderer({ field }: { field: ResolvedField }) {
  if (isEmpty(field.value)) {
    return (
      <span className="astw:text-sm astw:font-medium astw:text-foreground">
        {EMPTY_DASH}
      </span>
    );
  }

  const value = String(field.value);
  const variantMap = field.meta?.badgeVariantMap || {};

  // Try to find a matching variant (case-insensitive)
  const lowerValue = value.toLowerCase();
  const variant: BadgeVariantType =
    variantMap[value] || variantMap[lowerValue] || "outline-neutral";

  return (
    <Badge variant={variant} className="astw:w-fit">
      {toSentenceCase(value)}
    </Badge>
  );
}

/**
 * Render a money field
 */
function MoneyFieldRenderer({ field }: { field: ResolvedField }) {
  if (isEmpty(field.value)) {
    return (
      <span className="astw:text-sm astw:font-medium astw:text-foreground">
        {EMPTY_DASH}
      </span>
    );
  }

  const currencyKey = field.meta?.currencyKey || "currency";
  const currency = getNestedValue(field.data, currencyKey) as
    | string
    | undefined;
  const formatted = formatMoney(field.value, currency);

  return (
    <span className="astw:text-sm astw:font-medium astw:text-foreground astw:tabular-nums">
      {formatted}
    </span>
  );
}

/**
 * Render a date field
 */
function DateFieldRenderer({ field }: { field: ResolvedField }) {
  if (isEmpty(field.value)) {
    return (
      <span className="astw:text-sm astw:font-medium astw:text-foreground">
        {EMPTY_DASH}
      </span>
    );
  }

  const format = field.meta?.dateFormat || "medium";
  const formatted = formatDate(field.value, format);

  return (
    <span className="astw:text-sm astw:font-medium astw:text-foreground">
      {formatted}
    </span>
  );
}

/**
 * Render a link field
 */
function LinkFieldRenderer({ field }: { field: ResolvedField }) {
  if (isEmpty(field.value)) {
    return (
      <span className="astw:text-sm astw:font-medium astw:text-foreground">
        {EMPTY_DASH}
      </span>
    );
  }

  const hrefKey = field.meta?.hrefKey;
  const href = hrefKey
    ? (getNestedValue(field.data, hrefKey) as string)
    : undefined;
  const isExternal = field.meta?.external ?? false;
  const value = String(field.value);

  if (!href) {
    return (
      <span className="astw:text-sm astw:font-medium astw:text-foreground">
        {value}
      </span>
    );
  }

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="astw:inline-flex astw:items-center astw:gap-1 astw:text-sm astw:text-primary astw:hover:underline"
    >
      {value}
      {isExternal && <ExternalLink className="astw:h-3 astw:w-3" />}
    </a>
  );
}

/**
 * Render an address field (full address with line breaks)
 */
function AddressFieldRenderer({ field }: { field: ResolvedField }) {
  if (isEmpty(field.value)) {
    return (
      <span className="astw:text-sm astw:font-medium astw:text-foreground">
        {EMPTY_DASH}
      </span>
    );
  }

  const lines = formatAddress(field.value);
  const showCopy = field.meta?.copyable && !isEmpty(field.value);
  // Format address as string for copying (join lines with newlines)
  const addressString = lines.join("\n");

  return (
    <div className="astw:flex astw:items-start astw:gap-1 astw:min-w-0">
      <address className="astw:text-sm astw:font-medium astw:text-foreground astw:not-italic">
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </address>
      {showCopy && <CopyButton value={addressString} />}
    </div>
  );
}

/**
 * Render a reference field (link to another document)
 */
function ReferenceFieldRenderer({ field }: { field: ResolvedField }) {
  if (isEmpty(field.value)) {
    return (
      <span className="astw:text-sm astw:font-medium astw:text-foreground">
        {EMPTY_DASH}
      </span>
    );
  }

  const idKey = field.meta?.referenceIdKey;
  const urlPattern = field.meta?.referenceUrlPattern;
  const id = idKey ? (getNestedValue(field.data, idKey) as string) : undefined;
  const value = String(field.value);

  if (!id || !urlPattern) {
    return (
      <span className="astw:text-sm astw:font-medium astw:text-foreground">
        {value}
      </span>
    );
  }

  const href = urlPattern.replace("{id}", id);

  return (
    <a
      href={href}
      className="astw:text-sm astw:text-primary astw:hover:underline"
    >
      {value}
    </a>
  );
}

// ============================================================================
// MAIN RENDERER
// ============================================================================

/**
 * Render a field based on its type
 */
export function renderField(field: ResolvedField): React.ReactNode {
  switch (field.type) {
    case "text":
      return <TextFieldRenderer field={field} />;
    case "badge":
      return <BadgeFieldRenderer field={field} />;
    case "money":
      return <MoneyFieldRenderer field={field} />;
    case "date":
      return <DateFieldRenderer field={field} />;
    case "link":
      return <LinkFieldRenderer field={field} />;
    case "address":
      return <AddressFieldRenderer field={field} />;
    case "reference":
      return <ReferenceFieldRenderer field={field} />;
    default:
      return (
        <span className="astw:text-sm astw:font-medium astw:text-foreground">
          {EMPTY_DASH}
        </span>
      );
  }
}

/**
 * Check if a field should be hidden (empty with hide behavior)
 */
export function shouldHideField(field: ResolvedField): boolean {
  if (field.emptyBehavior !== "hide") return false;

  const value = field.value;
  return value === null || value === undefined || value === "";
}

/**
 * Check if a field should span full width
 * Currently no fields are full-width by default - all render in the grid
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isFullWidthField(_field: ResolvedField): boolean {
  return false;
}
