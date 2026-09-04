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

// Picked rather than inherited: a chip is a fixed pill with a fixed
// `secondary`/`sm` treatment, so `Button`'s variant, size, type and event
// surface are not ours to hand out. Widen deliberately if a case turns up.
type SuggestionProps = Pick<
  React.ComponentProps<typeof Button>,
  "className" | "disabled" | "children"
> & {
  /** Prompt text; submitted through `onSelect`, and shown unless `children` overrides it. */
  suggestion: string;
  onSelect?: (suggestion: string) => void;
};

/**
 * A starter-prompt chip. Submits `suggestion` as if the user had typed and
 * sent it — the fastest way to teach people what the assistant is good at.
 */
function Suggestion({ suggestion, onSelect, className, disabled, children }: SuggestionProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={disabled}
      data-slot="ai-chat-suggestion"
      className={cn(
        // `max-w-full` caps the chip at the container width so a long prompt
        // wraps instead of overflowing. `Button`'s base sets `shrink-0`, and
        // `twMerge` runs without the `astw:` prefix configured, so it cannot
        // dedupe a competing `shrink` utility — capping the width sidesteps
        // that entirely.
        "astw:h-auto astw:max-w-full astw:cursor-pointer astw:justify-start astw:whitespace-normal astw:rounded-full astw:px-3 astw:py-1.5 astw:text-left",
        className,
      )}
      onClick={() => onSelect?.(suggestion)}
    >
      {children ?? suggestion}
    </Button>
  );
}

export { Suggestions, Suggestion, type SuggestionsProps, type SuggestionProps };
