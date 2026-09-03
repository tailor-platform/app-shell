import { ArrowDown } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";

// How close (px) to the bottom still counts as "pinned".
const AT_BOTTOM_THRESHOLD_PX = 32;

type ConversationContextValue = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
};

const ConversationContext = createContext<ConversationContextValue | null>(null);

function useConversationContext(component: string): ConversationContextValue {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error(`<${component}> must be used within <Conversation>`);
  return ctx;
}

type ConversationProps = ComponentProps<"div"> & {
  /**
   * Follow content growth (streaming text, new turns) while the reader is
   * pinned to the bottom. Set `false` for a plain scrollable region with no
   * auto-follow — `<ConversationScrollButton>` still works if rendered.
   * @default true
   */
  autoScroll?: boolean;
};

/**
 * Scroll container that follows streaming output. While the reader is pinned
 * to the bottom, growing content keeps the view scrolled down; as soon as
 * they scroll up to reread earlier messages, following stops — a plain
 * scrollIntoView-on-change can't tell the difference and yanks the view back
 * mid-read.
 */
function Conversation({ className, autoScroll = true, children, ...props }: ConversationProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const prevScrollTopRef = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < AT_BOTTOM_THRESHOLD_PX;
    const scrolledUp = el.scrollTop < prevScrollTopRef.current;
    prevScrollTopRef.current = el.scrollTop;
    if (atBottom) {
      pinnedRef.current = true;
      setIsAtBottom(true);
    } else if (scrolledUp) {
      // Only an upward move counts as the reader leaving — content growing
      // underneath (scrollTop unchanged, bottom moving away) must not unpin.
      pinnedRef.current = false;
      setIsAtBottom(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    pinnedRef.current = true;
    setIsAtBottom(true);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  // Start at the latest message when mounting with existing history, then
  // follow content growth (streaming text, new turns) only while pinned.
  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content || !autoScroll) return;
    viewport.scrollTop = viewport.scrollHeight;
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) {
        viewport.scrollTop = viewport.scrollHeight;
        setIsAtBottom(true);
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [autoScroll]);

  return (
    <ConversationContext.Provider value={{ isAtBottom, scrollToBottom }}>
      <div
        data-slot="ai-chat-conversation"
        className={cn("astw:relative astw:min-h-0 astw:flex-1", className)}
        {...props}
      >
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          role="log"
          className="astw:h-full astw:overflow-y-auto"
        >
          {/* The scroll button escapes this box via absolute positioning
              against the relative root above, so it stays pinned while
              content scrolls underneath it. */}
          <div ref={contentRef} className="astw:flex astw:min-h-full astw:flex-col">
            {children}
          </div>
        </div>
      </div>
    </ConversationContext.Provider>
  );
}

type ConversationContentProps = ComponentProps<"div">;

function ConversationContent({ className, ...props }: ConversationContentProps) {
  return (
    <div
      className={cn(
        "astw:flex astw:flex-1 astw:flex-col astw:gap-3 astw:px-3 astw:py-3",
        className,
      )}
      {...props}
    />
  );
}

type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: ReactNode;
};

/** Centered placeholder shown while the conversation has no turns yet. */
function ConversationEmptyState({
  className,
  title,
  description,
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) {
  return (
    <div
      data-slot="ai-chat-empty-state"
      className={cn(
        "astw:flex astw:flex-1 astw:flex-col astw:items-center astw:justify-center astw:gap-3 astw:p-8 astw:text-center",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon}
          <div className="astw:space-y-1">
            {title ? <h3 className="astw:text-sm astw:font-medium">{title}</h3> : null}
            {description ? (
              <p className="astw:text-sm astw:text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

type ConversationScrollButtonProps = ComponentProps<typeof Button>;

/** Floating "scroll to latest" button, shown only once the reader has scrolled away from the bottom. */
function ConversationScrollButton({ className, ...props }: ConversationScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useConversationContext("ConversationScrollButton");
  const t = useT();

  if (isAtBottom) return null;

  return (
    <Button
      className={cn(
        "astw:absolute astw:bottom-3 astw:left-1/2 astw:aspect-square astw:size-8 astw:-translate-x-1/2 astw:rounded-full astw:p-0",
        className,
      )}
      onClick={scrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      aria-label={t("aiChatScrollToLatest")}
      {...props}
    >
      <ArrowDown className="astw:size-4" aria-hidden />
    </Button>
  );
}

export {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  type ConversationProps,
  type ConversationContentProps,
  type ConversationEmptyStateProps,
  type ConversationScrollButtonProps,
};
