type Props = { steps: string[]; current: number };

export function StepIndicator({ steps, current }: Props) {
  return (
    <ol className="flex gap-2">
      {steps.map((label, index) => (
        <li
          key={label}
          data-active={index === current ? "" : undefined}
          data-completed={index < current ? "" : undefined}
          className="
            flex items-center gap-2 rounded-md px-3 py-2
            bg-surface-2 text-body-sm text-fg-muted
            data-[active]:bg-primary data-[active]:text-fg-default
            data-[completed]:text-success
          "
        >
          {index < current ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="size-[var(--icon-sm)] shrink-0"
              fill="currentColor"
            >
              <path d="M6.8 11.2 3.6 8l-.9.9 4.1 4.1 6.5-6.5-.9-.9-5.6 5.6Z" />
            </svg>
          ) : null}
          {label}
        </li>
      ))}
    </ol>
  );
}
