import * as React from "react";
import { TooltipProvider } from "../ui/tooltip";
import { cn } from "../../lib/utils";

import type {
  DescriptionCardProps,
  FieldConfig,
  FieldDefinition,
  ResolvedField,
} from "./types";
import { isDivider, isFieldDefinition } from "./types";
import {
  renderField,
  shouldHideField,
  isFullWidthField,
  getNestedValue,
} from "./field-renderers";

// ============================================================================
// FIELD RESOLVER
// ============================================================================

/**
 * Resolve an inline field definition to a complete resolved field with value
 */
function resolveField(
  fieldDef: FieldDefinition,
  data: Record<string, unknown>,
  index: number
): ResolvedField {
  // Get value from data using the key path
  const value = getNestedValue(data, fieldDef.key);

  return {
    id: `${fieldDef.key}-${index}`,
    label: fieldDef.label,
    type: fieldDef.type ?? "text",
    value,
    emptyBehavior: fieldDef.emptyBehavior ?? "dash",
    meta: fieldDef.meta,
    data,
  };
}

/**
 * A section of fields separated by dividers
 */
interface FieldSection {
  id: string;
  fields: ResolvedField[];
}

/**
 * Resolve all fields and group them into sections based on dividers
 */
function resolveFieldsWithSections(
  fieldConfigs: FieldConfig[],
  data: Record<string, unknown>
): FieldSection[] {
  const sections: FieldSection[] = [];
  let currentSection: ResolvedField[] = [];
  let sectionIndex = 0;
  let fieldIndex = 0;

  for (const config of fieldConfigs) {
    if (isDivider(config)) {
      // Push current section if it has fields
      if (currentSection.length > 0) {
        sections.push({ id: `section-${sectionIndex}`, fields: currentSection });
        sectionIndex++;
        currentSection = [];
      }
    } else if (isFieldDefinition(config)) {
      const resolved = resolveField(config, data, fieldIndex);
      fieldIndex++;
      if (!shouldHideField(resolved)) {
        currentSection.push(resolved);
      }
    }
  }

  // Push final section
  if (currentSection.length > 0) {
    sections.push({ id: `section-${sectionIndex}`, fields: currentSection });
  }

  return sections;
}

// ============================================================================
// DESCRIPTION ITEM
// ============================================================================

interface DescriptionItemProps {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

function DescriptionItem({ label, children, fullWidth }: DescriptionItemProps) {
  return (
    <div
      className={cn(
        "astw:flex astw:flex-col astw:gap-1 astw:min-w-0 astw:py-2",
        fullWidth && "astw:col-span-full"
      )}
    >
      <p className="astw:text-sm astw:font-medium astw:text-muted-foreground astw:leading-none">
        {label}
      </p>
      <div className="astw:min-w-0">{children}</div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DescriptionCard - ERP document display component
 *
 * Renders structured key-value information with automatic layout.
 * Use { type: "divider" } in the fields array to add dividers between sections.
 *
 * @example
 * ```tsx
 * <DescriptionCard
 *   data={order}
 *   title="Order Summary"
 *   fields={[
 *     { key: "status", label: "Status", type: "badge", meta: { badgeVariantMap: { CONFIRMED: "success" } } },
 *     { key: "orderNumber", label: "Order #", meta: { copyable: true } },
 *     { type: "divider" },
 *     { key: "total", label: "Total", type: "money" },
 *   ]}
 * />
 * ```
 */
export function DescriptionCard({
  data,
  title,
  fields,
  columns = 3,
  className,
  headerAction,
}: DescriptionCardProps) {
  // Resolve fields into sections (split by dividers)
  const sections = resolveFieldsWithSections(fields, data);

  // Check if we have content
  const hasContent = sections.some((s) => s.fields.length > 0);

  // Grid classes - responsive breakpoints using CSS container queries (4 → 3 → 2 → 1)
  const gridClasses = cn(
    "astw:grid astw:gap-x-6 astw:gap-y-4",
    // Default: 1 column
    "astw:grid-cols-1",
    // Container queries for responsive columns
    columns === 4
      ? // 4-column mode: 1 → 2 → 3 → 4 columns
        "astw:@[400px]:grid-cols-2 astw:@[600px]:grid-cols-3 astw:@[800px]:grid-cols-4"
      : // 3-column mode: 1 → 2 → 3 columns
        "astw:@[400px]:grid-cols-2 astw:@[600px]:grid-cols-3"
  );

  // Render a single section
  const renderSection = (section: FieldSection) => {
    const regularFields = section.fields.filter((f) => !isFullWidthField(f));
    const fullWidthFields = section.fields.filter((f) => isFullWidthField(f));

    return (
      <div key={section.id} className="astw:space-y-4">
        {/* Regular fields in responsive grid */}
        {regularFields.length > 0 && (
          <div className={gridClasses}>
            {regularFields.map((field) => (
              <DescriptionItem key={field.id} label={field.label}>
                {renderField(field)}
              </DescriptionItem>
            ))}
          </div>
        )}

        {/* Full-width fields (addresses) */}
        {fullWidthFields.length > 0 && (
          <div className={gridClasses}>
            {fullWidthFields.map((field) => (
              <DescriptionItem key={field.id} label={field.label} fullWidth>
                {renderField(field)}
              </DescriptionItem>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "astw:@container astw:bg-card astw:text-card-foreground astw:rounded-xl astw:border",
          className
        )}
      >
        {/* Header */}
        <div className="astw:flex astw:items-center astw:justify-between astw:px-6 astw:py-6">
          <h3 className="astw:text-lg astw:font-semibold astw:leading-none">{title}</h3>
          {headerAction && <div>{headerAction}</div>}
        </div>

        {/* Content */}
        <div className="astw:px-6 astw:pb-4">
          {!hasContent ? (
            <p className="astw:text-sm astw:text-muted-foreground">
              No information available
            </p>
          ) : (
            <div className="astw:space-y-4">
              {sections.map((section, index) => (
                <React.Fragment key={section.id}>
                  {/* Divider between sections (except before first) */}
                  {index > 0 && (
                    <div className="astw:h-px astw:bg-border" role="separator" />
                  )}
                  {renderSection(section)}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  DescriptionCardProps,
  FieldConfig,
  FieldDefinition,
  FieldDivider,
  FieldType,
  FieldMeta,
  Columns,
  EmptyBehavior,
  DateFormat,
  BadgeVariantType,
} from "./types";

export { isDivider, isFieldDefinition } from "./types";

export default DescriptionCard;
