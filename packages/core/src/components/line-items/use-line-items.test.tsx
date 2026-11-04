import { StrictMode, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLineItemHelper } from "./column-helper";
import { createLineItemsController, getLineItemsController } from "./controller";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn, UseLineItemsOptions, UseLineItemsReturn } from "./types";

afterEach(cleanup);

function Wrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

type Row = { id?: string; quantity: number | null; name: string | null };
const { column } = createLineItemHelper<Row>();
const columns = [
  column({
    accessorKey: "quantity",
    type: "number",
    edit: { editorType: "number" },
  }),
  column({ accessorKey: "name", edit: { editorType: "text" } }),
];
const initial: Row[] = [{ id: "A", quantity: 1, name: "One" }];
const validate: NonNullable<UseLineItemsOptions<Row>["validate"]> = (lines, { getLineKey }) =>
  lines.flatMap((line) =>
    line.quantity === null || line.quantity <= 0
      ? [
          {
            scope: "cell" as const,
            lineKey: getLineKey(line),
            columnId: "quantity",
            message: "Positive quantity required",
          },
        ]
      : [],
  );

function setup(options: UseLineItemsOptions<Row> = { columns, defaultLines: initial }) {
  return renderHook((props) => useLineItems<Row>({ validate, ...props }), {
    initialProps: options,
    wrapper: Wrapper,
  });
}

function registerQuantity(value: UseLineItemsReturn<Row>, index = 0) {
  const controller = getLineItemsController(value);
  const row = value.allLines[index]!;
  const clientKey = controller.getClientKey(row);
  const session = controller.getSession(row, "quantity");
  const commit = vi.fn(() => {
    const state = session.getState();
    if (state.status === "idle") return Promise.resolve(true);
    const parsed = Number(state.draft);
    if (!Number.isFinite(parsed)) {
      session.fail("Invalid number", "parse");
      return Promise.resolve(false);
    }
    return session.confirm(() => controller.commitField(clientKey, "quantity", parsed));
  });
  const detach = controller.registerEditor(row, "quantity", {
    commit,
    isChanged: () => {
      const state = session.getState();
      const current = controller.getCurrentRow(clientKey);
      return state.status !== "idle" && !!current && Number(state.draft) !== current.quantity;
    },
  });
  return { controller, clientKey, session, commit, detach };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((success) => {
    resolve = success;
  });
  return { promise, resolve };
}

describe("useLineItems document ownership", () => {
  it("keeps commands and same-handler reads fresh and has no public session escape hatch", () => {
    const { result } = setup();
    const retained = result.current;
    act(() => {
      retained.updateField("A", "quantity", 2);
      expect(retained.hasUnsavedChanges()).toBe(true);
      expect(retained.getChangeSet().lineChanges).toEqual([
        { action: "update", lineId: "A", patch: { quantity: 2 } },
      ]);
    });
    expect(result.current.lines[0]!.quantity).toBe(2);
    expect(result.current.isDirty).toBe(true);
    expect(result.current).not.toHaveProperty("getSession");
    expect(result.current).not.toHaveProperty("document");
    expect(() => getLineItemsController({} as UseLineItemsReturn<Row>)).toThrow(/requires a value/);
    act(() => {
      result.current.revert();
      expect(result.current.hasUnsavedChanges()).toBe(false);
    });
    expect(result.current.lines[0]!.quantity).toBe(1);
  });

  it("seeds once and does not infer a new baseline from changing defaultLines", () => {
    const view = setup();
    act(() => view.result.current.updateField("A", "quantity", 2));
    view.rerender({ columns, defaultLines: [{ id: "B", quantity: 100, name: "Another" }] });
    expect(view.result.current.lines[0]!.id).toBe("A");
    expect(view.result.current.lines[0]!.quantity).toBe(2);
    expect(view.result.current.isDirty).toBe(true);
  });

  it("provides orderer and row actions without coupling document validity to editability", async () => {
    const render = vi.fn(() => null);
    const view = setup({
      columns,
      defaultLines: [{ id: "A", quantity: -1, name: "Invalid legacy row" }],
      orderer: "readonly",
      rowActions: { render, width: 120 },
    });
    expect(view.result.current.orderer).toBe("readonly");
    expect(view.result.current.rowActions).toEqual({ render, width: 120 });
    expect(render).not.toHaveBeenCalled();
    expect(view.result.current.errors).toEqual([]);
    expect(view.result.current.hasUnsavedChanges()).toBe(false);
    await act(async () => {
      await expect(view.result.current.commitEdits()).resolves.toBeNull();
    });
    expect(view.result.current.errors).toEqual([
      { scope: "cell", lineKey: "A", columnId: "quantity", message: "Positive quantity required" },
    ]);
    expect(view.result.current.getCellError("A", "quantity")).toBe("Positive quantity required");
  });

  it("adds, removes and reorders lines under one save/discard boundary", () => {
    const { result } = setup({ columns, defaultLines: initial });
    let key!: string;
    act(() => {
      key = result.current.addLine({ name: "New", quantity: 2 }, { afterLineKey: null });
      result.current.reorderLine(key, "A");
    });
    expect(result.current.allLines.map(result.current.getLineKey)).toEqual(["A", key]);
    expect(result.current.isNewLine(result.current.allLines[1]!)).toBe(true);
    expect(result.current.getChangeSet().order).toEqual([{ lineId: "A" }, { tempId: key }]);
    act(() => result.current.removeLines([key]));
    expect(result.current.isDirty).toBe(false);
    act(() => result.current.removeLine("A"));
    expect(result.current.lines).toEqual([]);
    act(() => result.current.revert());
    expect(result.current.lines).toHaveLength(1);
  });

  it("uses newly committed rules without reinitializing or normalizing on ordinary renders", async () => {
    const normalizer = vi.fn((value: number | null) => value);
    const starting = [column({ accessorKey: "quantity", normalize: normalizer })];
    const view = setup({ columns: starting, defaultLines: initial });
    const initialCalls = normalizer.mock.calls.length;
    expect(initialCalls).toBeGreaterThan(0);
    view.rerender({ columns: [...starting], defaultLines: initial });
    expect(normalizer).toHaveBeenCalledTimes(initialCalls);
    const next = [
      column({
        accessorKey: "quantity",
        normalize: (value) => (value === null ? null : Math.floor(value)),
      }),
    ];
    view.rerender({
      columns: next,
      defaultLines: initial,
      validate: (lines, { getLineKey }) =>
        lines
          .filter((line) => line.quantity === 1)
          .map((line) => ({
            scope: "cell",
            lineKey: getLineKey(line),
            columnId: "quantity",
            message: "New rule",
          })),
    });
    expect(view.result.current.errors).toEqual([]);
    await act(async () => {
      await view.result.current.commitEdits();
    });
    expect(view.result.current.errors[0]!.message).toBe("New rule");
    expect(view.result.current.getCellError("A", "quantity")).toBe("New rule");
    act(() => view.result.current.updateField("A", "quantity", 2.9));
    expect(view.result.current.lines[0]!.quantity).toBe(2);
    expect(view.result.current.errors).toEqual([]);
    expect(view.result.current.isDirty).toBe(true);
  });

  it("does not silently lose a draft when a column identity is removed", () => {
    const { result } = setup();
    const editor = registerQuantity(result.current);
    act(() => editor.session.change("2"));
    expect(() =>
      editor.controller.configure({
        columns: [
          column({ id: "renamed", accessorKey: "quantity", edit: { editorType: "number" } }),
          columns[1]!,
        ],
      }),
    ).toThrow(/Commit or discard draft edits/);
    expect(editor.session.getState()).toEqual({ status: "editing", draft: "2" });
    expect(result.current.hasUnsavedChanges()).toBe(true);
  });

  it("rejects unsupported metadata and controlled ownership rather than losing edits", () => {
    expect(() =>
      createLineItemsController<Row>({
        columns: [column({ accessorKey: "name", commit: "metadata" })],
      }),
    ).toThrow(/metadata persistence is not supported/);
    expect(() =>
      createLineItemsController({ columns, lines: initial } as unknown as UseLineItemsOptions<Row>),
    ).toThrow(/owns its rows/);
    const controller = createLineItemsController<Row>({ columns });
    expect(() => controller.configure({ columns, orderer: "readonly" })).not.toThrow();
    expect(() => controller.commands.reorderLine("A", null)).toThrow(/disabled/);
    expect(() => controller.configure({ columns, idKey: "name" })).toThrow(/Remount/);
    expect(() => controller.configure({ columns: columns.slice(0, 1) })).toThrow(
      /property ownership/,
    );
  });
});

describe("document-owned draft preparation", () => {
  it("does not mark mere focus as unsaved, then confirms drafts and coalesces preparation", async () => {
    const { result } = setup();
    const editor = registerQuantity(result.current);
    act(() => editor.session.begin("1"));
    expect(result.current.hasUnsavedChanges()).toBe(false);
    act(() => editor.session.change("2"));
    expect(result.current.isDirty).toBe(false);
    expect(result.current.hasUnsavedChanges()).toBe(true);
    let first!: ReturnType<typeof result.current.commitEdits>;
    let second!: typeof first;
    await act(async () => {
      first = result.current.commitEdits();
      second = result.current.commitEdits();
      expect(first).toBe(second);
      await first;
    });
    expect(editor.commit).toHaveBeenCalledTimes(1);
    await expect(first).resolves.toMatchObject({
      isEmpty: false,
      lineChanges: [{ action: "update", lineId: "A", patch: { quantity: 2 } }],
    });
    expect(result.current.lines[0]!.quantity).toBe(2);
    expect(editor.session.getState()).toEqual({ status: "idle" });
  });

  it("returns an empty snapshot for a clean valid document", async () => {
    const { result } = setup();
    await expect(result.current.commitEdits()).resolves.toEqual({ isEmpty: true, lineChanges: [] });
  });

  it("blocks malformed and failed drafts instead of saving the store's old value", async () => {
    const { result } = setup();
    const editor = registerQuantity(result.current);
    act(() => editor.session.change("-"));
    await act(async () => {
      await expect(result.current.commitEdits()).resolves.toBeNull();
    });
    expect(editor.session.getFailure()?.source).toBe("parse");
    expect(result.current.lines[0]!.quantity).toBe(1);
    expect(result.current.hasUnsavedChanges()).toBe(true);
    expect(editor.commit).toHaveBeenCalledTimes(1);
    await expect(result.current.commitEdits()).resolves.toBeNull();
    expect(editor.commit).toHaveBeenCalledTimes(1);
  });

  it("keeps adopted business-invalid values but blocks document submission", async () => {
    const { result } = setup();
    const editor = registerQuantity(result.current);
    act(() => editor.session.change("0"));
    await act(async () => {
      await expect(result.current.commitEdits()).resolves.toBeNull();
    });
    expect(result.current.lines[0]!.quantity).toBe(0);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.errors).toHaveLength(1);
  });

  it("can prepare a detached editor because its logical session reads the current row", async () => {
    const { result } = setup();
    const editor = registerQuantity(result.current);
    act(() => editor.session.change("3"));
    editor.detach();
    await act(async () => {
      await expect(result.current.commitEdits()).resolves.toMatchObject({ isEmpty: false });
    });
    expect(result.current.lines[0]!.quantity).toBe(3);
  });

  it("invalidates an async preparation when another command changes the document", async () => {
    const { result } = setup();
    const editor = registerQuantity(result.current);
    const request = deferred();
    const row = result.current.lines[0]!;
    editor.controller.registerEditor(row, "quantity", {
      commit: () => editor.session.confirm(() => request.promise),
      isChanged: () => editor.session.getState().status !== "idle",
    });
    act(() => editor.session.change("2"));
    let pending!: ReturnType<typeof result.current.commitEdits>;
    act(() => {
      pending = result.current.commitEdits();
    });
    act(() => result.current.updateField("A", "name", "Later edit"));
    await act(async () => {
      request.resolve();
      await expect(pending).resolves.toBeNull();
    });
    expect(result.current.lines[0]!.name).toBe("Later edit");
  });

  it("retains the editor's explicit callback-interception opt-out", () => {
    const { result } = setup({
      columns: [
        column({ accessorKey: "quantity", edit: { editorType: "number", error: false } }),
        columns[1]!,
      ],
      defaultLines: initial,
    });
    const editor = registerQuantity(result.current);
    const error = new Error("Consumer-owned failure");
    act(() => {
      editor.session.change("2");
      expect(() =>
        editor.session.confirm(() => {
          throw error;
        }),
      ).toThrow(error);
    });
    expect(editor.session.getFailure()).toBeUndefined();
  });

  it("does not implicitly retry a failed commit", async () => {
    const { result } = setup();
    const editor = registerQuantity(result.current);
    const callback = vi.fn(() => {
      throw new Error("Confirmation failed");
    });
    act(() => {
      editor.session.change("2");
      void editor.session.confirm(callback);
    });
    await expect(result.current.commitEdits()).resolves.toBeNull();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(result.current.hasUnsavedChanges()).toBe(true);
  });

  it("makes explicit writes and Discard supersede old drafts before a later blur", async () => {
    const { result } = setup();
    const editor = registerQuantity(result.current);
    act(() => {
      editor.session.change("9");
      result.current.updateLines([{ lineKey: "A", patch: { quantity: 4 } }]);
    });
    expect(editor.session.getState()).toEqual({ status: "idle" });
    await expect(editor.commit()).resolves.toBe(true);
    expect(result.current.lines[0]!.quantity).toBe(4);
    act(() => {
      editor.session.change("8");
      result.current.revert();
    });
    await expect(editor.commit()).resolves.toBe(true);
    expect(result.current.lines[0]!.quantity).toBe(1);
    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  it("invalidates preparation and retained commands when the hook unmounts", async () => {
    const view = setup();
    const editor = registerQuantity(view.result.current);
    const request = deferred();
    editor.controller.registerEditor(view.result.current.lines[0]!, "quantity", {
      commit: () => editor.session.confirm(() => request.promise),
      isChanged: () => editor.session.getState().status !== "idle",
    });
    const retained = view.result.current;
    let pending!: ReturnType<typeof retained.commitEdits>;
    act(() => {
      editor.session.change("2");
      pending = retained.commitEdits();
    });
    view.unmount();
    await expect(pending).resolves.toBeNull();
    await expect(retained.commitEdits()).resolves.toBeNull();
    request.resolve();
    await request.promise;
  });
});

describe("useLineItems save acknowledgment", () => {
  it("retains edits made while saving and immediately reports the remainder", async () => {
    const { result } = setup();
    act(() => result.current.updateField("A", "quantity", 2));
    const sent = await result.current.commitEdits();
    expect(sent).not.toBeNull();
    act(() => {
      result.current.updateField("A", "quantity", 3);
      result.current.reset([{ id: "A", quantity: 2, name: "Canonical" }], { sent: sent! });
      expect(result.current.hasUnsavedChanges()).toBe(true);
    });
    expect(result.current.lines[0]).toMatchObject({ quantity: 3, name: "Canonical" });
    expect(result.current.getChangeSet().lineChanges).toEqual([
      { action: "update", lineId: "A", patch: { quantity: 3 } },
    ]);
  });

  it("keeps stable session identity and an unfinished draft across a creation acknowledgment", async () => {
    const { result } = setup({ columns, defaultLines: [] });
    act(() => result.current.addLine({ quantity: 1, name: "New" }));
    const editor = registerQuantity(result.current);
    const tempId = result.current.getLineKey(result.current.lines[0]!);
    const sent = await result.current.commitEdits();
    act(() => editor.session.change("3"));
    act(() => result.current.reset({ idMap: { [tempId]: "N" } }, { sent: sent! }));
    const row = result.current.lines[0]!;
    expect(result.current.getLineKey(row)).toBe("N");
    expect(editor.controller.getClientKey(row)).toBe(editor.clientKey);
    expect(editor.controller.getSession(row, "quantity")).toBe(editor.session);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.hasUnsavedChanges()).toBe(true);
    await act(async () => {
      await expect(result.current.commitEdits()).resolves.toMatchObject({
        lineChanges: [{ action: "update", lineId: "N", patch: { quantity: 3 } }],
      });
    });
  });

  it("explicit replacement cancels obsolete drafts and resets ownership without saving them", () => {
    const { result } = setup();
    const editor = registerQuantity(result.current);
    act(() => editor.session.change("9"));
    act(() => result.current.reset([{ id: "B", quantity: 5, name: "Replacement" }]));
    expect(result.current.lines[0]!.id).toBe("B");
    expect(result.current.isDirty).toBe(false);
    expect(result.current.hasUnsavedChanges()).toBe(false);
    expect(editor.session.getState()).toEqual({ status: "idle" });
  });
});

// Keep direct public option usage checked independently of the test factory.
const checked: readonly LineItemsColumn<Row>[] = columns;
void checked;
