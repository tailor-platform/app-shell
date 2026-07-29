import * as React from "react";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline error state rendered inside an async dropdown popover when the fetcher
 * fails. Shared by `Combobox.Async`, `Autocomplete.Async`, and `Select.Async`.
 *
 * Renders the failure message plus a Retry affordance where the user is already
 * looking, instead of the misleading empty ("No results.") state.
 *
 * The content is padding-free so callers can place it inside their existing
 * padded empty/content slot; text color is inherited from that slot.
 */
function AsyncErrorState({
  message,
  retryText,
  onRetry,
  className,
  slot = "async-error",
  ...props
}: React.ComponentProps<"div"> & {
  /** The failure message, e.g. "Couldn't load results." */
  message: React.ReactNode;
  /** Label for the retry button, e.g. "Retry". */
  retryText: React.ReactNode;
  /** Re-runs the last fetch. */
  onRetry: () => void;
  /** `data-slot` value for CSS scoping. */
  slot?: string;
}) {
  return (
    <div
      data-slot={slot}
      className={cn("astw:flex astw:flex-col astw:items-center astw:gap-2", className)}
      {...props}
    >
      <span role="alert">{message}</span>
      <button
        type="button"
        // Keep focus on the input/trigger so clicking Retry doesn't close the popover.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRetry}
        className={cn(
          "astw:inline-flex astw:items-center astw:gap-1.5 astw:rounded-md astw:px-2 astw:py-1 astw:text-sm astw:font-medium astw:text-foreground astw:outline-none astw:transition-colors",
          "astw:hover:bg-accent astw:hover:text-accent-foreground",
          "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        )}
      >
        <RotateCwIcon className="astw:size-3.5" />
        {retryText}
      </button>
    </div>
  );
}
AsyncErrorState.displayName = "AsyncErrorState";

/**
 * Picks which popover content an async dropdown should render: loading takes
 * precedence, then the error state, then the default (items / empty) content.
 *
 * Extracted so callers avoid nested ternaries at the call site.
 */
function resolveAsyncContent<T>({
  loading,
  error,
  loadingContent,
  errorContent,
  defaultContent,
}: {
  loading: boolean;
  error: unknown;
  loadingContent: T;
  errorContent: T;
  defaultContent: T;
}): T {
  if (loading) return loadingContent;
  if (error) return errorContent;
  return defaultContent;
}

export { AsyncErrorState, resolveAsyncContent };
