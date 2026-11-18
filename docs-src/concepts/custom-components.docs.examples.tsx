import { Check } from "lucide-react";

export function StepIndicatorExample() {
  type Props = { steps: string[]; current: number };

  function StepIndicator({ steps, current }: Props) {
    return (
      <ol aria-label="Order progress" className="flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={i === current ? "step" : undefined}
            data-active={i === current ? "" : undefined}
            data-completed={i < current ? "" : undefined}
            className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-label-md text-muted-foreground data-[active]:bg-primary data-[active]:text-primary-foreground data-[completed]:text-success-text"
          >
            {i < current && (
              <>
                <Check className="size-4" aria-hidden="true" />
                <span className="sr-only">Completed: </span>
              </>
            )}
            {label}
          </li>
        ))}
      </ol>
    );
  }

  return <StepIndicator steps={["Draft", "Review", "Complete"]} current={1} />;
}
