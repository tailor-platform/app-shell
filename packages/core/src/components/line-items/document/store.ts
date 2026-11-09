import { createLineItemsDocument } from "./model";
import type { DocumentOptions } from "./types";

/**
 * Makes one document model observable without duplicating its row state or domain rules.
 * The model stays private so all writes pass through the notifying command boundary.
 *
 * React adapters retain one store per mounted document with a lazy useState initializer,
 * then pass the stable subscribe/getSnapshot functions to useSyncExternalStore. The model's
 * cached row view is the snapshot: adoption changes its reference before listeners run
 * synchronously. Invalid writes and no-ops do not notify; revert always adopts and notifies.
 * Returned methods do not depend on this and may be retained across renders.
 *
 * @example
 * const [store] = useState(() => createLineItemsDocumentStore({ columns, lines }));
 * const rows = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
 *
 * @internal
 */
export function createLineItemsDocumentStore<T extends Record<string, unknown>>(
  options: DocumentOptions<T>,
) {
  const document = createLineItemsDocument(options);
  const listeners = new Set<() => void>();

  function mutate<Result>(operation: () => Result): Result {
    const before = document.getRows();
    const result = operation();
    if (document.getRows() !== before) {
      // oxlint-disable-next-line unicorn/no-useless-spread -- Subscriptions can change during notification.
      for (const listener of [...listeners]) listener();
    }
    return result;
  }

  return {
    idKey: document.idKey,
    /** Cached immutable row view, suitable for both getSnapshot and getServerSnapshot. */
    getSnapshot: document.getRows,
    getLineKey: document.getLineKey,
    setColumns: document.setColumns,
    isDirty: document.isDirty,
    /**
     * Registers a payload-free listener without invoking it immediately. Notifications run
     * after model adoption; listeners reread getSnapshot/isDirty, not veto the write.
     * Returns idempotent cleanup that removes the listener from future notifications.
     */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Delegates the typed field update to the model, then notifies if a row view was adopted. */
    updateField<K extends keyof T & string>(lineKey: string, property: K, value: T[K]) {
      mutate(() => document.updateField(lineKey, property, value));
    },
    /** Appends a model-owned creation and returns its key after notifying subscribers. */
    addLine(input: T): string {
      return mutate(() => document.addLine(input));
    },
    /** Removes a current line through the model and publishes the resulting snapshot. */
    removeLine(lineKey: string) {
      mutate(() => document.removeLine(lineKey));
    },
    /** Publishes a valid model move; movement permission remains the caller's responsibility. */
    reorderLine(lineKey: string, afterLineKey: string | null) {
      mutate(() => document.reorderLine(lineKey, afterLineKey));
    },
    /** Restores the model baseline and notifies even if the document was already clean. */
    revert() {
      mutate(() => document.revert());
    },
  };
}
