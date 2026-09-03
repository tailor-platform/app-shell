import type * as React from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

type SuggestionsProps = React.ComponentProps<"div">;

/** Wraps a row of starter-prompt chips for the empty conversation state. */
function Suggestions({ className, children, ...props }: SuggestionsProps) {
  return (
    <div
      data-slot="ai-chat-suggestions"
      className={cn("astw:flex astw:flex-wrap astw:items-start astw:gap-1.5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

type SuggestionProps = Omit<React.ComponentProps<typeof Button>, "onClick" | "onSelect"> & {
  suggestion: string;
  onSelect?: (suggestion: string) => void;
};

/**
 * A starter-prompt chip. Submits `suggestion` as if the user had typed and
 * sent it — the fastest way to teach people what the assistant is good at.
 */
function Suggestion({
  suggestion,
  onSelect,
  className,
  variant = "secondary",
  size = "sm",
  children,
  ...props
}: SuggestionProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      data-slot="ai-chat-suggestion"
      className={cn(
        "astw:h-auto astw:cursor-pointer astw:justify-start astw:whitespace-normal astw:rounded-full astw:px-3 astw:py-1.5 astw:text-left",
        className,
      )}
      onClick={() => onSelect?.(suggestion)}
      {...props}
    >
      {children ?? suggestion}
    </Button>
  );
}

export { Suggestions, Suggestion, type SuggestionsProps, type SuggestionProps };
