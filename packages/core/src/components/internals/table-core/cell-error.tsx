import { useId, useRef, type ReactNode, type RefObject } from "react";
import { CircleAlert } from "lucide-react";

/** The surface only needs failure identity and source, not a document/session owner. */
export interface CellSurfaceFailure {
  source: string;
}

export interface CellErrorUI {
  failure: CellSurfaceFailure;
  id: string;
  message: string;
  content: ReactNode;
  triggerRef: RefObject<HTMLButtonElement | null>;
  popupRef: RefObject<HTMLDivElement | null>;
  containsTarget: (target: EventTarget | null) => boolean;
}

function DefaultCellErrorContent({ message }: { message: string }) {
  return (
    <div className="astw:flex astw:gap-1.5">
      <span className="astw:flex astw:h-lh astw:shrink-0 astw:items-center">
        <CircleAlert
          aria-hidden="true"
          strokeWidth={2.5}
          className="astw:size-3.5 astw:opacity-70"
        />
      </span>
      <p>{message}</p>
    </div>
  );
}

/** Error presentation and the portaled inspector form one logical focus group. */
export function useCellError({
  failure,
  message,
  renderContent,
}: {
  failure: CellSurfaceFailure | undefined;
  message: string;
  renderContent?: () => ReactNode;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const containsTarget = (target: EventTarget | null) =>
    target instanceof Node &&
    !!(triggerRef.current?.contains(target) || popupRef.current?.contains(target));
  const error: CellErrorUI | undefined = failure
    ? {
        failure,
        id,
        message,
        content: renderContent ? renderContent() : <DefaultCellErrorContent message={message} />,
        triggerRef,
        popupRef,
        containsTarget,
      }
    : undefined;
  return { error, containsTarget };
}
