import * as React from "react";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Text } from "../text";
import { Tooltip } from "../tooltip";
import { useStepperT } from "./i18n";
import type { StepperProps, StepperStep, StepperStepStatus } from "./types";

/** Below this container width a horizontal Stepper shows only its markers. */
const COMPACT_WIDTH = 400;

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
  step: StepperStep<Id>;
  index: number;
  labelId: string;
  onStepClick?: (id: Id) => void;
}) {
  const t = useStepperT();
  const clickable = onStepClick != null && step.status === "complete";
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
  step: StepperStep<Id>;
  /** Omitted when the label isn't the click target (the compact marker is). */
  onStepClick?: (id: Id) => void;
  labelId?: string;
  className?: string;
}) {
  const t = useStepperT();
  const clickable = onStepClick != null && step.status === "complete";
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
 * Each step has a `status` (`complete`, `current`, `upcoming` or `skipped`),
 * and the line between steps is filled up to the furthest step reached. The
 * current step gets `aria-current="step"`. It only displays progress; the
 * page decides which step is current.
 *
 * @example
 * ```tsx
 * <Stepper
 *   aria-label="New purchase order"
 *   steps={[
 *     { id: "supplier", label: "Supplier", status: "complete" },
 *     { id: "lines", label: "Lines", status: "current" },
 *     { id: "review", label: "Review", status: "upcoming" },
 *   ]}
 *   onStepClick={(id) => goTo(id)}
 * />
 * ```
 */
export function Stepper<Id extends string = string>({
  steps,
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
  const currentIndex = steps.findIndex((step) => step.status === "current");
  const current = currentIndex >= 0 ? steps[currentIndex] : undefined;

  // The furthest step reached: the last one that is complete or current.
  // Skipped steps before it are passed; those after it were never reached.
  let reachedIndex = -1;
  steps.forEach((step, index) => {
    if (step.status === "complete" || step.status === "current") reachedIndex = index;
  });
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
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
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
            {t("stepOf", { current: currentIndex + 1, total: steps.length })}
          </span>
          <span className="astw:truncate astw:text-label-md astw:text-foreground">
            {current.label}
          </span>
        </Text.p>
      )}
    </div>
  );
}
