import type * as React from "react";
import { Card, Fieldset, Grid, Text } from "@tailor-platform/app-shell";

// ✅ Reusable Component: the Grid-only recipe for a form section.
// Card + Fieldset + Grid makes one form section: the legend names the
// group, the description is announced with it, and `maxColumns` reflows with
// the section's own width (page, dialog or sheet).
export function FormSection({
  id,
  title,
  description,
  variant = "card",
  maxColumns = 2,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  variant?: "card" | "plain";
  maxColumns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  const body = (
    <Fieldset.Root
      className={variant === "card" ? "flex flex-col gap-4 p-6" : "flex flex-col gap-4"}
    >
      <div className="flex flex-col gap-1">
        <Fieldset.Legend>
          <Text.h3 variant="heading-md" className="leading-none">
            {title}
          </Text.h3>
        </Fieldset.Legend>
        {description != null && <Text.p className="text-muted-foreground">{description}</Text.p>}
      </div>
      <Grid maxColumns={maxColumns} gapX={6} gapY={4}>
        {children}
      </Grid>
    </Fieldset.Root>
  );
  if (variant === "plain") {
    return (
      <div id={id} className="border-border [&+&]:border-t [&+&]:pt-6">
        {body}
      </div>
    );
  }
  return <Card.Root id={id}>{body}</Card.Root>;
}
