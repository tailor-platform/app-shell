import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const gridVariants = cva("astw:grid", {
  variants: {
    cols: {
      1: "astw:grid-cols-1",
      2: "astw:grid-cols-2",
      3: "astw:grid-cols-3",
      4: "astw:grid-cols-4",
      5: "astw:grid-cols-5",
      6: "astw:grid-cols-6",
    },
    gap: {
      none: "astw:gap-0",
      sm: "astw:gap-2",
      md: "astw:gap-4",
      lg: "astw:gap-6",
    },
  },
  defaultVariants: {
    cols: 1,
    gap: "md",
  },
});

type GridProps = React.ComponentProps<"div"> & VariantProps<typeof gridVariants>;

function Grid({ className, cols, gap, ...props }: GridProps) {
  return <div data-slot="grid" className={cn(gridVariants({ cols, gap }), className)} {...props} />;
}

export { Grid, gridVariants, type GridProps };
