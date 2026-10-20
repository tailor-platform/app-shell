import type { ComponentProps, ReactNode } from "react";
import { CheckCircle2, CircleDashed, Loader2, Wrench, XCircle } from "lucide-react";

import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";
import {
  DisclosureRoot,
  DisclosureTrigger,
  DisclosureChevron,
  DisclosurePanel,
} from "./disclosure";
import { Text } from "../text";

/**
 * Maps 1:1 to the AI SDK's tool-part lifecycle, so a streaming loop can
 * update a call in place as parts arrive:
 * - `input-streaming` — the model is still writing the arguments
 * - `input-available` — arguments complete, tool executing
 * - `output-available` — finished with a result
 * - `output-error` — finished with an error
 */
type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

// Success is the expected outcome, so it stays quiet: the check icon carries
// it and its label is screen-reader-only. The in-flight and error states keep
// visible labels since those are the ones worth a glance.
const STATUS_LABEL_KEYS = {
  "input-streaming": "aiChatToolPreparing",
  "input-available": "aiChatToolRunning",
  "output-available": null,
  "output-error": "aiChatToolError",
} as const satisfies Record<
  ToolState,
  "aiChatToolPreparing" | "aiChatToolRunning" | "aiChatToolError" | null
>;

const STATUS_ICONS: Record<ToolState, ReactNode> = {
  "input-streaming": <CircleDashed className="astw:size-3.5" aria-hidden />,
  "input-available": <Loader2 className="astw:size-3.5 astw:animate-spin" aria-hidden />,
  "output-available": <CheckCircle2 className="astw:size-3.5" aria-hidden />,
  "output-error": <XCircle className="astw:size-3.5 astw:text-danger-text" aria-hidden />,
};

type ToolProps = Omit<ComponentProps<typeof DisclosureRoot>, "children"> & {
  children: ReactNode;
};

/**
 * Collapsible tool-call card. Shows which tool the model invoked and its live
 * status in the header; expanding reveals the input parameters and the result
 * (or error) as JSON.
 *
 * @example
 * ```tsx
 * <AIChat.Tool>
 *   <AIChat.ToolHeader toolName="search_kb" state={call.state} />
 *   <AIChat.ToolContent>
 *     <AIChat.ToolInput input={call.input} />
 *     <AIChat.ToolOutput output={call.output} errorText={call.errorText} />
 *   </AIChat.ToolContent>
 * </AIChat.Tool>
 * ```
 */
function Tool({ className, children, ...props }: ToolProps) {
  return (
    <DisclosureRoot className={cn("astw:rounded-md astw:border", className)} {...props}>
      {children}
    </DisclosureRoot>
  );
}

type ToolHeaderProps = Omit<ComponentProps<typeof DisclosureTrigger>, "children" | "title"> & {
  toolName: string;
  state: ToolState;
  /** Human-readable label shown instead of the raw tool name. */
  title?: string;
};

function ToolHeader({ toolName, state, title, className, ...props }: ToolHeaderProps) {
  const t = useT();
  const labelKey = STATUS_LABEL_KEYS[state];

  return (
    <DisclosureTrigger
      className={cn("astw:w-full astw:justify-between astw:px-3 astw:py-2", className)}
      {...props}
    >
      <span className="astw:flex astw:min-w-0 astw:items-center astw:gap-1.5">
        <Wrench className="astw:size-3.5 astw:shrink-0" aria-hidden />
        <span className="astw:truncate astw:font-medium astw:text-foreground">
          {title ?? toolName}
        </span>
      </span>
      <span className="astw:flex astw:shrink-0 astw:items-center astw:gap-2">
        <span className="astw:flex astw:items-center astw:gap-1 astw:text-body-sm astw:text-muted-foreground">
          {STATUS_ICONS[state]}
          {labelKey ? t(labelKey) : <span className="astw:sr-only">{t("aiChatToolDone")}</span>}
        </span>
        <DisclosureChevron className="astw:size-3.5" />
      </span>
    </DisclosureTrigger>
  );
}

type ToolContentProps = ComponentProps<typeof DisclosurePanel>;

function ToolContent({ className, ...props }: ToolContentProps) {
  return (
    <DisclosurePanel
      className={cn("astw:mt-0 astw:space-y-2 astw:border-t astw:px-3 astw:py-2", className)}
      {...props}
    />
  );
}

function JsonBlock({ value }: { value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <Text
      variant="code-sm"
      className="astw:overflow-x-auto astw:rounded astw:bg-muted/50 astw:p-2 astw:whitespace-pre-wrap"
      render={<pre />}
    >
      {text}
    </Text>
  );
}

type ToolInputProps = ComponentProps<"div"> & { input: unknown };

function ToolInput({ input, className, ...props }: ToolInputProps) {
  const t = useT();

  return (
    <div className={cn("astw:space-y-1", className)} {...props}>
      <Text
        variant="label-sm"
        className="astw:uppercase astw:tracking-wide astw:text-muted-foreground"
        // eslint-disable-next-line jsx-a11y/heading-has-content
        render={<h4 />}
      >
        {t("aiChatToolParameters")}
      </Text>
      <JsonBlock value={input} />
    </div>
  );
}

type ToolOutputProps = ComponentProps<"div"> & {
  output?: unknown;
  errorText?: string;
};

function ToolOutput({ output, errorText, className, ...props }: ToolOutputProps) {
  const t = useT();

  if (output == null && !errorText) return null;
  return (
    <div className={cn("astw:space-y-1", className)} {...props}>
      <Text
        variant="label-sm"
        className={cn(
          "astw:uppercase astw:tracking-wide",
          errorText ? "astw:text-danger-text" : "astw:text-muted-foreground",
        )}
        // eslint-disable-next-line jsx-a11y/heading-has-content
        render={<h4 />}
      >
        {errorText ? t("aiChatToolError") : t("aiChatToolResult")}
      </Text>
      <JsonBlock value={errorText ?? output} />
    </div>
  );
}

export {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
  type ToolState,
  type ToolProps,
  type ToolHeaderProps,
  type ToolContentProps,
  type ToolInputProps,
  type ToolOutputProps,
};
