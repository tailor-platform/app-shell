import { StrictMode, startTransition, useState, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useControlledCommit } from "./use-controlled-commit";

afterEach(cleanup);

function Wrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

type Row = { id: string; quantity: number };
const initial: readonly Row[] = [{ id: "A", quantity: 1 }];
const next: readonly Row[] = [{ id: "A", quantity: 2 }];

function sameRows(left: readonly Row[], right: readonly Row[]) {
  return (
    left.length === right.length &&
    left.every(
      (row, index) => row.id === right[index]?.id && row.quantity === right[index]?.quantity,
    )
  );
}

function setup(policy: "accept" | "ignore" | "transform" | "transition" = "accept") {
  const notify = vi.fn();
  const view = renderHook(
    ({ scope }: { scope: string }) => {
      const [rows, setRows] = useState(initial);
      const commit = useControlledCommit({
        value: rows,
        onChange: (value) => {
          notify(value);
          if (policy === "accept") setRows(value);
          else if (policy === "transform")
            setRows(value.map((row) => ({ ...row, quantity: row.quantity + 1 })));
          else if (policy === "transition") startTransition(() => setRows(value));
        },
        equals: sameRows,
        scope,
      });
      return { rows, setRows, commit };
    },
    { initialProps: { scope: "document-A" }, wrapper: Wrapper },
  );
  return { ...view, notify };
}

describe("useControlledCommit", () => {
  it("acknowledges adoption from the parent, once under StrictMode", async () => {
    const { result, notify } = setup();
    let request!: Promise<boolean>;
    act(() => {
      request = result.current.commit(next);
      expect(result.current.rows).toBe(initial);
    });
    await expect(request).resolves.toBe(true);
    expect(result.current.rows).toBe(next);
    expect(notify).toHaveBeenCalledExactlyOnceWith(next);
  });

  it("finishes at a local checkpoint when the parent ignores a proposal", async () => {
    const { result, notify } = setup("ignore");
    let request!: Promise<boolean>;
    act(() => {
      request = result.current.commit(next);
    });
    await expect(request).resolves.toBe(false);
    expect(result.current.rows).toBe(initial);
    expect(notify).toHaveBeenCalledExactlyOnceWith(next);
  });

  it("does not report transformed parent values as the submitted values", async () => {
    const { result } = setup("transform");
    let request!: Promise<boolean>;
    act(() => {
      request = result.current.commit(next);
    });
    await expect(request).resolves.toBe(false);
    expect(result.current.rows).toEqual([{ id: "A", quantity: 3 }]);
  });

  it("does not wait indefinitely for transition-delayed parent adoption", async () => {
    const { result, notify } = setup("transition");
    let request!: Promise<boolean>;
    act(() => {
      request = result.current.commit(next);
    });
    await expect(request).resolves.toBe(false);
    expect(result.current.rows).toBe(next);
    await expect(result.current.commit(next)).resolves.toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("permits retry after delayed external adoption without sending the proposal twice", async () => {
    const { result, notify } = setup("ignore");
    let request!: Promise<boolean>;
    act(() => {
      request = result.current.commit(next);
    });
    await expect(request).resolves.toBe(false);
    act(() => result.current.setRows(next));
    await expect(result.current.commit(next)).resolves.toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("coalesces repeated confirmation of the same candidate before React commits", async () => {
    const { result, notify } = setup();
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.commit(next);
      second = result.current.commit(next.map((row) => ({ ...row })));
      expect(first).toBe(second);
    });
    await expect(first).resolves.toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("supersedes a different pending candidate without privately adopting either proposal", async () => {
    const { result, notify } = setup();
    const newer = [{ id: "A", quantity: 3 }];
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.commit(next);
      second = result.current.commit(newer);
      expect(result.current.rows).toBe(initial);
    });
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    expect(result.current.rows).toBe(newer);
    expect(notify.mock.calls).toEqual([[next], [newer]]);
  });

  it("confirms a return to the original value instead of accepting an older queued proposal", async () => {
    const { result, notify } = setup();
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.commit(next);
      second = result.current.commit(initial);
    });
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    expect(result.current.rows).toBe(initial);
    expect(notify.mock.calls).toEqual([[next], [initial]]);
  });

  it("invalidates an attempt when document identity changes even if the rows match", async () => {
    const view = setup();
    let request!: Promise<boolean>;
    act(() => {
      request = view.result.current.commit(next);
      view.rerender({ scope: "document-B" });
    });
    await expect(request).resolves.toBe(false);
  });

  it("rejects callback failures and permits a later attempt", async () => {
    const error = new Error("Proposal rejected");
    const onChange = vi.fn(() => {
      throw error;
    });
    const { result, rerender } = renderHook(
      ({ value }) => useControlledCommit({ value, onChange }),
      { initialProps: { value: initial }, wrapper: Wrapper },
    );
    await expect(result.current(next)).rejects.toBe(error);
    expect(onChange).toHaveBeenCalledTimes(1);
    rerender({ value: next });
    await expect(result.current(next)).resolves.toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("rejects comparator failures without throwing from React's commit effect", async () => {
    const error = new Error("Invalid comparison");
    const equals = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockImplementation(() => {
        throw error;
      });
    const onChange = vi.fn();
    const { result } = renderHook(() => useControlledCommit({ value: initial, onChange, equals }), {
      wrapper: Wrapper,
    });
    let request!: Promise<boolean>;
    act(() => {
      request = result.current(next);
    });
    await expect(request).rejects.toBe(error);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(next);
  });

  it("uses current committed callbacks through a retained command", async () => {
    const old = vi.fn();
    const current = vi.fn();
    const view = renderHook(({ onChange }) => useControlledCommit({ value: initial, onChange }), {
      initialProps: { onChange: old },
      wrapper: Wrapper,
    });
    const retained = view.result.current;
    view.rerender({ onChange: current });
    let request!: Promise<boolean>;
    act(() => {
      request = retained(next);
    });
    await expect(request).resolves.toBe(false);
    expect(old).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledExactlyOnceWith(next);
  });

  it("settles outstanding attempts and ignores retained commands after unmount", async () => {
    const { result, unmount, notify } = setup("ignore");
    const retained = result.current.commit;
    let request!: Promise<boolean>;
    act(() => {
      request = retained(next);
      unmount();
    });
    await expect(request).resolves.toBe(false);
    await expect(retained(next)).resolves.toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
