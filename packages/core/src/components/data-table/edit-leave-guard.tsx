import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { useInAppShellRouter } from "@/routing/router-context";
import { useDataTableT } from "./i18n";
import { useCellEditStatus, type CellEditStore } from "./use-cell-edit-store";

// Reloading or closing the tab gets the browser's own prompt.
function warnBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  // Older browsers only show their prompt when a return value is set.
  event.returnValue = "";
}

/**
 * Warns before the user leaves a page whose table has unsaved edits: a cell
 * mid-edit, a value left in a cell that breaks a rule, or an autosave still in
 * flight. A save in flight is waited for, and the page is left as soon as it
 * succeeds, so the prompt only appears when something can't be saved.
 *
 * @internal
 */
export function CellEditLeaveGuard({ store }: { store: CellEditStore }) {
  const status = useCellEditStatus(store);
  const unsaved = status.editing + status.kept + status.saving > 0;
  const inRouter = useInAppShellRouter();
  // While a blocked navigation is being handled, the blocker stays mounted even
  // after the last unsaved change settles, so it can still let the user leave.
  const [handling, setHandling] = useState(false);

  useEffect(() => {
    if (!unsaved) return;
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [unsaved]);

  // A router supports one blocker at a time, so this one exists only while
  // there's something to protect.
  if (!inRouter || !(unsaved || handling)) return null;
  return <LeaveBlocker store={store} onHandlingChange={setHandling} />;
}

function LeaveBlocker({
  store,
  onHandlingChange,
}: {
  store: CellEditStore;
  onHandlingChange: (handling: boolean) => void;
}) {
  const t = useDataTableT();
  // Same-page navigations (search params, a hash) aren't leaving the page.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      store.hasUnsaved() && currentLocation.pathname !== nextLocation.pathname,
  );
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const [prompting, setPrompting] = useState(false);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    onHandlingChange(true);
    const { editing, kept } = store.getStatus();
    if (editing + kept > 0) {
      setPrompting(true);
      return;
    }
    // Only autosaves in flight: leave as soon as they've all succeeded.
    let cancelled = false;
    void store.settle().then((saved) => {
      if (cancelled) return;
      if (saved && !store.hasUnsaved()) {
        onHandlingChange(false);
        blockerRef.current.proceed?.();
      } else {
        setPrompting(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [blocker.state, store, onHandlingChange]);

  const finish = (leave: boolean) => {
    setPrompting(false);
    onHandlingChange(false);
    if (leave) blockerRef.current.proceed?.();
    else blockerRef.current.reset?.();
  };

  return (
    <Dialog.Root
      open={prompting}
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
    >
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{t("editLeaveTitle")}</Dialog.Title>
          <Dialog.Description>{t("editLeaveDescription")}</Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button variant="outline" onClick={() => finish(true)}>
            {t("editLeaveConfirm")}
          </Button>
          <Button onClick={() => finish(false)}>{t("editLeaveStay")}</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
