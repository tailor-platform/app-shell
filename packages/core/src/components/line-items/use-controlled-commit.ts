import { useCallback, useLayoutEffect, useReducer, useRef } from "react";

type ControlledOwner<T> = {
  value: T;
  onChange: (next: T) => void;
  equals?: (left: T, right: T) => boolean;
  scope?: unknown;
};

type Proposal<T> = {
  value: T;
  scope: unknown;
  promise: Promise<boolean>;
  resolve: (accepted: boolean) => void;
  reject: (error: unknown) => void;
};

/** Waits for one React commit, not indefinite acceptance of a controlled proposal. @internal */
export function useControlledCommit<T>(owner: ControlledOwner<T>): (next: T) => Promise<boolean> {
  const committed = useRef(owner);
  const proposal = useRef<Proposal<T> | null>(null);
  const mounted = useRef(false);
  const [, checkpoint] = useReducer((revision: number) => revision + 1, 0);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      proposal.current?.resolve(false);
      proposal.current = null;
    };
  }, []);

  // Only committed props can acknowledge adoption; a render can be abandoned.
  useLayoutEffect(() => {
    committed.current = owner;
    const pending = proposal.current;
    if (!pending) return;
    proposal.current = null;
    try {
      pending.resolve(
        Object.is(pending.scope, owner.scope) &&
          (owner.equals ?? Object.is)(owner.value, pending.value),
      );
    } catch (error) {
      pending.reject(error);
    }
  });

  return useCallback((next: T) => {
    if (!mounted.current) return Promise.resolve(false);
    const current = committed.current;
    const equals = current.equals ?? Object.is;
    const pending = proposal.current;
    try {
      if (pending && Object.is(pending.scope, current.scope) && equals(pending.value, next))
        return pending.promise;
      pending?.resolve(false);
      proposal.current = null;
      if (!pending && equals(current.value, next)) return Promise.resolve(true);
    } catch (error) {
      return Promise.reject(error);
    }

    let resolve!: (accepted: boolean) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<boolean>((accept, fail) => {
      resolve = accept;
      reject = fail;
    });
    const attempt: Proposal<T> = { value: next, scope: current.scope, promise, resolve, reject };
    proposal.current = attempt;
    try {
      current.onChange(next);
      if (mounted.current) checkpoint();
    } catch (error) {
      if (proposal.current === attempt) proposal.current = null;
      reject(error);
    }
    return promise;
  }, []);
}
