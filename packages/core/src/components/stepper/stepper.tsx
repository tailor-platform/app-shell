import * as React from "react";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Text } from "../text";
import { Tooltip } from "../tooltip";
import { useStepperT } from "./i18n";
import type { StepperProgress, StepperProps, StepperStep, StepperStepStatus } from "./types";

/** Below this container width the Stepper shows only its markers. */
const COMPACT_WIDTH = 400;

// ============================================================================
// Deriving step statuses from progress
// ============================================================================

/** A step with the status derived from `progress`. */
type ResolvedStep<Id extends string> = StepperStep<Id> & { status: StepperStepStatus };

/** Passed steps — completed or skipped — are the ones you can go back to. */
const isPassed = (status: StepperStepStatus) => status === "complete" || status === "skipped";

/** Derives statuses from passed outcomes, reporting invalid runtime input rather than drawing it. */
function resolveSteps<Id extends string>(
  steps: readonly StepperStep<Id>[],
  progress: StepperProgress,
) {
  const problems: string[] = [];
  const seen = new Set<Id>();
  for (const step of steps) {
    if (seen.has(step.id)) problems.push(`duplicate step id "${step.id}"`);
    seen.add(step.id);
  }

  const passedSteps = progress.state === "started" ? progress.passedSteps : [];
  if (passedSteps.length > steps.length)
    problems.push("passedSteps contains more entries than steps; extra outcomes are ignored");
  const passedBefore = Math.min(passedSteps.length, steps.length);
  const currentIndex =
    progress.state === "started" && passedBefore < steps.length ? passedBefore : -1;

  const statusAt = (index: number): StepperStepStatus => {
    if (index === currentIndex) return "current";
    if (index >= passedBefore) return "upcoming";
    const outcome = passedSteps[index];
    if (outcome === "complete" || outcome === "skipped") return outcome;
    problems.push(`passedSteps[${index}] must be "complete" or "skipped"; shown as complete`);
    return "complete";
  };
  const resolved: ResolvedStep<Id>[] = steps.map((step, index) => ({
    ...step,
    status: statusAt(index),
  }));

  return { steps: resolved, currentIndex, passedBefore, problems };
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
 * The marker of a Stepper in a narrow container, where the labels
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
function Connector({ filled }: { filled: boolean }) {
  return (
    <span
      data-slot="stepper-connector"
      aria-hidden="true"
      className={cn(
        "astw:mx-2 astw:h-px astw:min-w-4 astw:flex-1",
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
  compact,
  className,
}: {
  step: ResolvedStep<Id>;
  /** Omitted when the label isn't the click target (the compact marker is). */
  onStepClick?: (id: Id) => void;
  labelId: string;
  compact: boolean;
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

  if (!compact && step.render) {
    const content = step.render({ label: step.label, status: step.status });
    return (
      <div className={cn("astw:min-w-0", className)}>
        {clickable ? (
          <button
            type="button"
            aria-labelledby={`${labelId}-content ${labelId}`}
            onClick={() => onStepClick(step.id)}
            className="astw:w-full astw:cursor-pointer astw:rounded-sm astw:text-left astw:outline-none astw:focus-visible:ring-[3px] astw:focus-visible:ring-ring/50"
          >
            <span id={labelId} className="astw:sr-only">
              {label}
            </span>
            <span id={`${labelId}-content`}>{content}</span>
          </button>
        ) : (
          <div id={labelId}>
            {content}
            {step.status !== "current" && <span className="astw:sr-only">, {t(step.status)}</span>}
          </div>
        )}
      </div>
    );
  }

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
function useCompact(ref: React.RefObject<HTMLElement | null>) {
  const [compact, setCompact] = React.useState(false);

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const width = element.clientWidth;
      setCompact(width > 0 && width < COMPACT_WIDTH);
    };

    update();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

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
 * `steps` lists the steps in order; `progress` gives an outcome for each passed
 * step, starting at the first. The next step is current, the ones after it
 * are upcoming, and all steps are passed once the outcomes cover the sequence.
 * The line is filled up to the current step. The current
 * step gets `aria-current="step"`. It only displays progress; the page owns it.
 *
 * The steps sit in a row, which scrolls sideways when they don't fit. Below
 * 400px of container width only the markers show, plus "Step 2 of 4" and the
 * current step's label; each marker then names its step in a tooltip.
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
 *   progress={{ state: "started", passedSteps: ["complete"] }}
 *   onStepClick={(id) => goTo(id)}
 * />
 * ```
 */
export function Stepper<Id extends string = string>({
  steps,
  progress,
  onStepClick,
  "aria-label": ariaLabel,
  className,
  style,
}: StepperProps<Id>) {
  const t = useStepperT();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const baseId = React.useId();
  const compact = useCompact(rootRef);
  const { steps: resolved, currentIndex, passedBefore, problems } = resolveSteps(steps, progress);
  const current = currentIndex >= 0 ? resolved[currentIndex] : undefined;

  const problemKey = problems.join("; ");
  React.useEffect(() => {
    if (problemKey) console.warn(`[Stepper] ${problemKey}.`);
  }, [problemKey]);

  const filledAfter = (index: number) => index < passedBefore;

  return (
    <div
      ref={rootRef}
      data-slot="stepper"
      className={cn("astw:@container astw:min-w-0", className)}
      style={style}
    >
      <ol
        aria-label={ariaLabel ?? t("label")}
        // Many steps scroll sideways rather than squeezing their labels.
        // The padding keeps focus rings clear of the scroll edge.
        className="astw:-m-1 astw:flex astw:overflow-x-auto astw:p-1"
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
                "astw:flex astw:min-w-0 astw:flex-1 astw:flex-col astw:gap-2 astw:@[400px]:min-w-24",
                // With labels hidden, the last step is only its marker, so the
                // lines before it span the whole width.
                last && "astw:flex-none astw:@[400px]:flex-1",
              )}
            >
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
                  {!last && <Connector filled={filledAfter(index)} />}
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
                    compact={compact}
                    className={last ? undefined : "astw:pr-4"}
                  />
                </div>
              </>
            </li>
          );
        })}
      </ol>
      {current != null && (
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
