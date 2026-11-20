import * as React from "react";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Text } from "../text";
import { Tooltip } from "../tooltip";
import { useStepperT } from "./i18n";
import type { StepperProgress, StepperProps, StepperStep, StepperStepStatus } from "./types";

/** Below this container width a horizontal Stepper shows only its markers. */
const COMPACT_WIDTH = 400;

// ============================================================================
// Deriving step statuses from progress
// ============================================================================

/** A step with the status derived from `progress`. */
type ResolvedStep<Id extends string> = StepperStep<Id> & { status: StepperStepStatus };

/** Passed steps — completed or skipped — are the ones you can go back to. */
const isPassed = (status: StepperStepStatus) => status === "complete" || status === "skipped";

/**
 * Turns the steps and one progress position into a status per step. Problems
 * a type can't rule out — ids that aren't steps, duplicate ids, skipping a
 * step not yet reached — are reported rather than drawn.
 */
function resolveSteps<Id extends string>(
  steps: readonly StepperStep<Id>[],
  progress: StepperProgress<Id>,
) {
  const problems: string[] = [];
  const indexById = new Map<string, number>();
  steps.forEach((step, index) => {
    if (indexById.has(step.id)) problems.push(`duplicate step id "${step.id}"`);
    else indexById.set(step.id, index);
  });

  let currentIndex = -1;
  // Steps before this index have been passed.
  let passedBefore = 0;
  if (progress.state === "in-progress") {
    currentIndex = indexById.get(progress.currentStepId) ?? -1;
    if (currentIndex < 0) problems.push(`currentStepId "${progress.currentStepId}" is not a step`);
    passedBefore = Math.max(currentIndex, 0);
  } else if (progress.state === "complete") {
    passedBefore = steps.length;
  }

  const skipped = new Set<number>();
  if (progress.state !== "not-started") {
    for (const id of progress.skippedStepIds ?? []) {
      const index = indexById.get(id);
      if (index == null) problems.push(`skipped step id "${id}" is not a step`);
      else if (index >= passedBefore)
        problems.push(`step "${id}" can't be skipped before it has been passed`);
      else skipped.add(index);
    }
  }

  const statusAt = (index: number): StepperStepStatus => {
    if (index === currentIndex) return "current";
    if (index >= passedBefore) return "upcoming";
    return skipped.has(index) ? "skipped" : "complete";
  };
  const resolved: ResolvedStep<Id>[] = steps.map((step, index) => ({
    ...step,
    status: statusAt(index),
  }));

  // The line is filled up to the furthest step reached.
  const reachedIndex = progress.state === "complete" ? steps.length - 1 : currentIndex;

  return { steps: resolved, currentIndex, reachedIndex, problems };
}

// ============================================================================
// Marker
// ============================================================================

const MARKER_CLASSES: Record<StepperStepStatus, string> = {
  complete: "astw:bg-primary astw:text-primary-foreground",
  current: "astw:border-2 astw:border-primary astw:bg-background astw:text-primary",
  upcoming: "astw:border astw:border-border astw:bg-background astw:text-muted-foreground",
  skipped:
    "astw:border astw:border-dashed astw:border-muted-foreground astw:bg-background astw:text-muted-foreground",
};

function Marker({ status, index }: { status: StepperStepStatus; index: number }) {
  return (
    <span
      data-slot="stepper-marker"
      aria-hidden="true"
      className={cn(
        "astw:flex astw:size-6 astw:shrink-0 astw:items-center astw:justify-center astw:rounded-full astw:text-label-sm",
        MARKER_CLASSES[status],
      )}
    >
      {status === "complete" ? <CheckIcon className="astw:size-3.5" /> : index + 1}
    </span>
  );
}

/**
 * The marker of a horizontal Stepper in a narrow container, where the labels
 * are hidden: a tooltip names the step, and a completed step's marker is the
 * button that goes back to it.
 */
function CompactMarker<Id extends string>({
  step,
  index,
  labelId,
  onStepClick,
}: {
  step: ResolvedStep<Id>;
  index: number;
  labelId: string;
  onStepClick?: (id: Id) => void;
}) {
  const t = useStepperT();
  const clickable = onStepClick != null && isPassed(step.status);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        data-slot="stepper-marker-trigger"
        render={
          clickable ? (
            <button
              type="button"
              aria-labelledby={labelId}
              onClick={() => onStepClick(step.id)}
              className="astw:cursor-pointer astw:rounded-full astw:outline-none astw:focus-visible:ring-[3px] astw:focus-visible:ring-ring/50"
            />
          ) : (
            <span />
          )
        }
      >
        <Marker status={step.status} index={index} />
      </Tooltip.Trigger>
      <Tooltip.Content>
        {step.label}
        {step.status !== "current" && <span className="astw:opacity-70"> · {t(step.status)}</span>}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

/** The line from a step to the next one. It is filled up to the furthest step reached. */
function Connector({ filled, vertical }: { filled: boolean; vertical: boolean }) {
  return (
    <span
      data-slot="stepper-connector"
      aria-hidden="true"
      className={cn(
        vertical
          ? "astw:my-1 astw:min-h-4 astw:w-px astw:flex-1"
          : "astw:mx-2 astw:h-px astw:min-w-4 astw:flex-1",
        filled ? "astw:bg-primary" : "astw:bg-border",
      )}
    />
  );
}

// ============================================================================
// Step text
// ============================================================================

function StepText<Id extends string>({
  step,
  onStepClick,
  labelId,
  className,
}: {
  step: ResolvedStep<Id>;
  /** Omitted when the label isn't the click target (the compact marker is). */
  onStepClick?: (id: Id) => void;
  labelId?: string;
  className?: string;
}) {
  const t = useStepperT();
  const clickable = onStepClick != null && isPassed(step.status);
  const muted = step.status === "upcoming" || step.status === "skipped";

  const label = (
    <>
      {step.label}
      {/* `current` is announced through aria-current; the others say where they stand */}
      {step.status !== "current" && <span className="astw:sr-only">, {t(step.status)}</span>}
    </>
  );

  return (
    <div className={cn("astw:flex astw:min-w-0 astw:flex-col astw:gap-0.5", className)}>
      <div className="astw:flex astw:min-h-6 astw:min-w-0 astw:flex-wrap astw:items-center astw:gap-x-2 astw:gap-y-1">
        {clickable ? (
          <button
            type="button"
            id={labelId}
            onClick={() => onStepClick(step.id)}
            className="astw:cursor-pointer astw:rounded-sm astw:text-left astw:text-label-md astw:text-foreground astw:outline-none astw:hover:underline astw:focus-visible:ring-[3px] astw:focus-visible:ring-ring/50"
          >
            {label}
          </button>
        ) : (
          <span
            id={labelId}
            className={cn(
              "astw:text-label-md",
              muted ? "astw:text-muted-foreground" : "astw:text-foreground",
            )}
          >
            {label}
          </span>
        )}
        {step.badge}
      </div>
      {step.description != null && (
        <Text.div variant="body-sm" className="astw:text-muted-foreground">
          {step.description}
        </Text.div>
      )}
    </div>
  );
}

// ============================================================================
// Container width
// ============================================================================

/**
 * Whether the root is narrower than the compact breakpoint. The layout itself
 * switches with a container query; this only decides which element is
 * interactive, so a zero width (not laid out yet) counts as wide.
 */
function useCompact(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [compact, setCompact] = React.useState(false);

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) {
      setCompact(false);
      return;
    }

    const update = () => {
      const width = element.clientWidth;
      setCompact(width > 0 && width < COMPACT_WIDTH);
    };

    update();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);

  return compact;
}

// ============================================================================
// Stepper
// ============================================================================

/**
 * Stepper — Shows how far something has progressed through a fixed sequence
 * of steps: the steps of a wizard form, the stages of an approval flow, the
 * quality gates of a project.
 *
 * `steps` lists the steps in order; `progress` says how far the flow has got
 * — not started, on one current step, or complete — and which passed steps
 * were skipped. Steps before the current one show as complete, the ones after
 * it as upcoming, and the line is filled up to the current step. The current
 * step gets `aria-current="step"`. It only displays progress; the page owns it.
 *
 * @example
 * ```tsx
 * <Stepper
 *   aria-label="New purchase order"
 *   steps={[
 *     { id: "supplier", label: "Supplier" },
 *     { id: "lines", label: "Lines" },
 *     { id: "review", label: "Review" },
 *   ]}
 *   progress={{ state: "in-progress", currentStepId: "lines" }}
 *   onStepClick={(id) => goTo(id)}
 * />
 * ```
 */
export function Stepper<Id extends string = string>({
  steps,
  progress,
  orientation = "horizontal",
  onStepClick,
  "aria-label": ariaLabel,
  className,
  style,
}: StepperProps<Id>) {
  const t = useStepperT();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const baseId = React.useId();
  const vertical = orientation === "vertical";
  const compact = useCompact(rootRef, !vertical);
  const { steps: resolved, currentIndex, reachedIndex, problems } = resolveSteps(steps, progress);
  const current = currentIndex >= 0 ? resolved[currentIndex] : undefined;

  const problemKey = problems.join("; ");
  React.useEffect(() => {
    if (problemKey) console.warn(`[Stepper] ${problemKey}.`);
  }, [problemKey]);

  const filledAfter = (index: number) => index < reachedIndex;

  return (
    <div
      ref={rootRef}
      data-slot="stepper"
      data-orientation={orientation}
      className={cn("astw:@container astw:min-w-0", className)}
      style={style}
    >
      <ol
        aria-label={ariaLabel ?? t("label")}
        className={cn(
          "astw:flex",
          vertical
            ? "astw:flex-col"
            : // Many steps scroll sideways rather than squeezing their labels.
              // The padding keeps focus rings clear of the scroll edge.
              "astw:-m-1 astw:overflow-x-auto astw:p-1",
        )}
      >
        {resolved.map((step, index) => {
          const last = index === resolved.length - 1;
          const labelId = `${baseId}-${index}`;
          return (
            <li
              key={step.id}
              data-slot="stepper-step"
              data-status={step.status}
              aria-current={step.status === "current" ? "step" : undefined}
              className={cn(
                "astw:flex astw:min-w-0",
                vertical
                  ? "astw:gap-3"
                  : "astw:flex-1 astw:flex-col astw:gap-2 astw:@[400px]:min-w-24",
                // With labels hidden, the last step is only its marker, so the
                // lines before it span the whole width.
                !vertical && last && "astw:flex-none astw:@[400px]:flex-1",
              )}
            >
              {vertical ? (
                <>
                  <div className="astw:flex astw:flex-col astw:items-center">
                    <Marker status={step.status} index={index} />
                    {!last && <Connector filled={filledAfter(index)} vertical />}
                  </div>
                  <StepText
                    step={step}
                    onStepClick={onStepClick}
                    className={last ? undefined : "astw:pb-6"}
                  />
                </>
              ) : (
                <>
                  <div className="astw:flex astw:items-center">
                    {compact ? (
                      <CompactMarker
                        step={step}
                        index={index}
                        labelId={labelId}
                        onStepClick={onStepClick}
                      />
                    ) : (
                      <Marker status={step.status} index={index} />
                    )}
                    {!last && <Connector filled={filledAfter(index)} vertical={false} />}
                  </div>
                  {/* Below 400px only the markers fit; the caption below names
                      the current step and each marker's tooltip names its own.
                      The label stays for screen readers, and while the marker
                      is the click target it isn't a second one. */}
                  <div className="astw:sr-only astw:@[400px]:not-sr-only">
                    <StepText
                      step={step}
                      onStepClick={compact ? undefined : onStepClick}
                      labelId={labelId}
                      className={last ? undefined : "astw:pr-4"}
                    />
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>
      {!vertical && current != null && (
        <Text.p
          variant="body-sm"
          data-slot="stepper-caption"
          aria-hidden="true"
          className="astw:mt-2 astw:flex astw:min-w-0 astw:items-baseline astw:gap-1.5 astw:@[400px]:hidden"
        >
          <span className="astw:shrink-0 astw:text-muted-foreground">
            {t("stepOf", { current: currentIndex + 1, total: resolved.length })}
          </span>
          <span className="astw:truncate astw:text-label-md astw:text-foreground">
            {current.label}
          </span>
        </Text.p>
      )}
    </div>
  );
}
