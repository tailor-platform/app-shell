import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { useRender } from "@base-ui/react/use-render";

import { cn } from "@/lib/utils";

const textVariants = cva("", {
  variants: {
    /** Typography role. Sets font size, line height, font weight, and letter spacing together. */
    variant: {
      "heading-lg": "astw:text-heading-lg",
      "heading-md": "astw:text-heading-md",
      "heading-sm": "astw:text-heading-sm",
      "body-md": "astw:text-body-md",
      "body-sm": "astw:text-body-sm",
      "label-md": "astw:text-label-md",
      "label-sm": "astw:text-label-sm",
      "code-sm": "astw:font-mono astw:text-code-sm",
      "body-md-relaxed": "astw:text-body-md-relaxed",
      "body-sm-relaxed": "astw:text-body-sm-relaxed",
    },
  },
  defaultVariants: {
    variant: "body-md",
  },
});

type TextVariant = NonNullable<VariantProps<typeof textVariants>["variant"]>;

/**
 * The element each role renders when no `render` prop is given. All heading
 * roles render `h2`: the heading level comes from the document structure, not
 * from the visual size, so pick the level with `render`.
 */
const defaultTagNames = {
  "heading-lg": "h2",
  "heading-md": "h2",
  "heading-sm": "h2",
  "body-md": "p",
  "body-sm": "p",
  "label-md": "span",
  "label-sm": "span",
  "code-sm": "span",
  "body-md-relaxed": "p",
  "body-sm-relaxed": "p",
} as const satisfies Record<TextVariant, keyof React.JSX.IntrinsicElements>;

type TextProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof textVariants> & {
    /** Ref to the rendered element. */
    ref?: React.Ref<HTMLElement>;
    /** Custom element to render as (Base UI render prop). Use it to set the heading level, for example `render={<h3 />}`. */
    render?: React.ReactElement;
  };

/**
 * Text with a typography role. The role sets the size, line height, weight,
 * and letter spacing. It does not set the color or choose the heading level.
 *
 * @example
 * ```tsx
 * import { Text } from "@tailor-platform/app-shell";
 *
 * <Text variant="heading-md" render={<h3 />}>Line items</Text>
 * <Text variant="body-md" className="text-muted-foreground">Orders sent this month.</Text>
 * <Text variant="label-md" className="tabular-nums">1,240</Text>
 * ```
 */
function Text({ className, variant, render, children, ref, ...props }: TextProps) {
  // cva returns no class for an explicit `null`, so fall back to the default role here too.
  const role = variant ?? "body-md";
  return useRender({
    defaultTagName: defaultTagNames[role],
    render,
    ref,
    props: {
      "data-slot": "text",
      className: cn(textVariants({ variant: role, className })),
      // Pass children only when given, so a `render` part that supplies its own
      // content (such as Base UI's Field.Error with the validation message) keeps it.
      ...(children !== undefined && { children }),
      ...props,
    },
  });
}

export { Text, type TextProps };
