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
 * from the visual size, so pick the level with `Text.h1` to `Text.h6`.
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
    /** Custom element to render as (Base UI render prop). Use it to compose with another component. For a plain HTML element, use `Text.h1` to `Text.h6`, `Text.p`, `Text.span`, or `Text.div`. */
    render?: React.ReactElement;
  };

function TextRoot({ className, variant, render, children, ref, ...props }: TextProps) {
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

/**
 * The role each element component applies when no `variant` is given. They
 * follow `defaultTagNames`: body roles render `p`, label roles render `span`.
 * `div` is a block element like `p`, so it gets the default role of `Text`.
 */
const elementDefaultVariants = {
  h1: "heading-lg",
  h2: "heading-md",
  h3: "heading-sm",
  h4: "heading-sm",
  h5: "heading-sm",
  h6: "heading-sm",
  p: "body-md",
  span: "label-md",
  div: "body-md",
} as const satisfies Record<string, TextVariant>;

type TextTagName = keyof typeof elementDefaultVariants;

type TextElementProps<T extends TextTagName> = React.ComponentProps<T> &
  VariantProps<typeof textVariants>;

type TextElementComponent<T extends TextTagName> = {
  (props: TextElementProps<T>): React.JSX.Element;
  displayName?: string;
};

function createTextElement<T extends TextTagName>(tagName: T): TextElementComponent<T> {
  const defaultVariant: TextVariant = elementDefaultVariants[tagName];
  const Element: React.ElementType = tagName;
  function TextElement({ className, variant, ...props }: TextElementProps<T>) {
    return (
      <Element
        data-slot="text"
        className={cn(textVariants({ variant: variant ?? defaultVariant, className }))}
        {...props}
      />
    );
  }
  TextElement.displayName = `Text.${tagName}`;
  return TextElement;
}

/**
 * Keep the exported static API type explicit instead of relying on
 * `Object.assign(...)` inference, as `Layout` and `Autocomplete` do.
 */
type TextComponent = typeof TextRoot & {
  [T in TextTagName]: TextElementComponent<T>;
};

/**
 * Text with a typography role. The role sets the size, line height, weight,
 * and letter spacing. It does not set the color or choose the heading level.
 *
 * `Text.h1` to `Text.h6`, `Text.p`, `Text.span`, and `Text.div` always render
 * their named element, with a default role for that element. They take
 * `variant`, the element's own attributes, and a ref, but not `render`.
 *
 * @example
 * ```tsx
 * import { Text } from "@tailor-platform/app-shell";
 *
 * <Text.h1>Purchase orders</Text.h1>
 * <Text.h3 variant="heading-md">Line items</Text.h3>
 * <Text.p className="text-muted-foreground">Orders sent this month.</Text.p>
 * <Text.span className="tabular-nums">1,240</Text.span>
 * <Text variant="label-md" render={<CustomLabel />}>Quantity</Text>
 * ```
 */
const Text: TextComponent = Object.assign(TextRoot, {
  h1: createTextElement("h1"),
  h2: createTextElement("h2"),
  h3: createTextElement("h3"),
  h4: createTextElement("h4"),
  h5: createTextElement("h5"),
  h6: createTextElement("h6"),
  p: createTextElement("p"),
  span: createTextElement("span"),
  div: createTextElement("div"),
});

export { Text, type TextProps };
