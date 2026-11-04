import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CellEditError } from "@/components/internals/table-core/cell-edit-error";
import { createLineItemHelper } from "./column-helper";
import { createLineItemsController } from "./controller";
import { useLineItems } from "./use-line-items";
import type { UseLineItemsOptions, LineItemsValidationIssue } from "./types";

afterEach(cleanup);
type Row = { id?: string; quantity: number | null; name: string | null };
const { column } = createLineItemHelper<Row>();
const columns = [
  column({ accessorKey: "quantity", edit: { editorType: "number" } }),
  column({ accessorKey: "name", edit: { editorType: "text" } }),
];
const rows: Row[] = [
  { id: "A", quantity: 1, name: "One" },
  { id: "B", quantity: 2, name: "Two" },
];
const issue: LineItemsValidationIssue = { scope: "document", message: "Document limit exceeded" };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}
function setup(
  validate?: UseLineItemsOptions<Row>["validate"],
  check?: (row: Readonly<Row>, value: number | null) => void | Promise<void>,
) {
  const options: UseLineItemsOptions<Row> = {
    columns: check
      ? [
          column({
            accessorKey: "quantity",
            edit: { editorType: "number", onValueCommitted: check },
          }),
          columns[1]!,
        ]
      : columns,
    defaultLines: rows,
    ordering: "manual",
    validate,
  };
  const controller = createLineItemsController(options);
  return { controller, commands: controller.commands, options };
}
function editor(controller: ReturnType<typeof createLineItemsController<Row>>, index = 0) {
  const row = controller.document.getRows()[index]!;
  const key = controller.getClientKey(row);
  const session = controller.getSession<string>(row, "quantity");
  const commit = () => {
    const state = session.getState();
    return state.status === "idle"
      ? Promise.resolve(true)
      : session.confirm(() => controller.commitField(key, "quantity", Number(state.draft)));
  };
  controller.registerEditor(row, "quantity", {
    commit,
    editorType: "number",
    isChanged: () => {
      const state = session.getState();
      return (
        state.status !== "idle" && Number(state.draft) !== controller.getCurrentRow(key)?.quantity
      );
    },
  });
  return { session, commit };
}

describe("save-boundary document validation", () => {
  it("checks a real cross-line total after pending drafts are adopted and can target the implicated cells", async () => {
    const validate: NonNullable<UseLineItemsOptions<Row>["validate"]> = (lines, { getLineKey }) =>
      lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0) <= 5
        ? []
        : [
            issue,
            ...lines.map((line) => ({
              scope: "cell" as const,
              lineKey: getLineKey(line),
              columnId: "quantity",
              message: "Reduce the combined quantity",
            })),
          ];
    const { controller, commands } = setup(validate);
    editor(controller).session.change("4");
    expect(await commands.commitEdits()).toBeNull();
    expect(controller.document.getRows()[0]!.quantity).toBe(4);
    expect(controller.getErrors()).toHaveLength(3);
    expect(commands.getCellError("B", "quantity")).toBe("Reduce the combined quantity");
  });

  it("does not run on render, search, or adoption, then checks unchanged/hidden/new rows in view mode", async () => {
    const validate = vi.fn<NonNullable<UseLineItemsOptions<Row>["validate"]>>(
      (lines, { getLineKey }) => [
        issue,
        {
          scope: "cell",
          lineKey: getLineKey(lines[2]!),
          columnId: "quantity",
          message: "New line invalid",
        },
      ],
    );
    const view = renderHook(() =>
      useLineItems<Row>({ columns, defaultLines: rows, mode: "view", validate }),
    );
    let key!: string;
    act(() => {
      key = view.result.current.addLine({ quantity: -1, name: "Hidden new line" });
      view.result.current.setSearchQuery("One");
    });
    expect(view.result.current.lines).toHaveLength(1);
    expect(validate).not.toHaveBeenCalled();
    expect(view.result.current.errors).toEqual([]);
    await act(async () => {
      expect(await view.result.current.commitEdits()).toBeNull();
    });
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate.mock.calls[0]![0]).toHaveLength(3);
    expect(view.result.current.getCellError(key, "quantity")).toBe("New line invalid");
    expect(view.result.current.errors).toEqual([
      issue,
      { scope: "cell", lineKey: key, columnId: "quantity", message: "New line invalid" },
    ]);
    act(() => view.result.current.updateField(key, "quantity", 3));
    expect(view.result.current.errors).toEqual([]);
    expect(view.result.current.getCellError(key, "quantity")).toBeUndefined();
  });

  it("waits for async validation, coalesces saves, and owns immutable results without dirtying the document", async () => {
    const request = deferred<LineItemsValidationIssue[]>();
    const validate = vi.fn(() => request.promise);
    const { controller, commands } = setup(validate);
    const first = commands.commitEdits();
    expect(commands.commitEdits()).toBe(first);
    await Promise.resolve();
    expect(validate).toHaveBeenCalledTimes(1);
    const result = [{ ...issue }];
    request.resolve(result);
    expect(await first).toBeNull();
    result[0]!.message = "Mutated by caller";
    expect(controller.getErrors()).toEqual([issue]);
    expect(commands.hasUnsavedChanges()).toBe(false);
    expect(commands.getChangeSet().isEmpty).toBe(true);
  });

  it.each([
    "write",
    "draft",
    "new-draft",
    "discard",
    "reset",
    "remove",
    "reorder",
    "validator",
    "unmount",
  ] as const)(
    "retires pending validation immediately on %s and permits another attempt before it settles",
    async (action) => {
      const request = deferred<readonly LineItemsValidationIssue[]>();
      const validate = vi
        .fn<NonNullable<UseLineItemsOptions<Row>["validate"]>>()
        .mockImplementationOnce(() => request.promise)
        .mockReturnValue([]);
      const { controller, commands, options } = setup(validate);
      const mounted = action === "draft" ? editor(controller) : undefined;
      const pending = commands.commitEdits();
      await Promise.resolve();
      expect(validate).toHaveBeenCalledTimes(1);
      if (action === "write") commands.updateField("A", "quantity", 4);
      if (action === "draft") mounted!.session.change("4");
      if (action === "new-draft") editor(controller).session.change("4");
      if (action === "discard") commands.revert();
      if (action === "reset") commands.reset(rows);
      if (action === "remove") commands.removeLine("A");
      if (action === "reorder") commands.reorderLine("B", null);
      if (action === "validator") controller.configure({ ...options, validate: () => [] });
      if (action === "unmount") controller.deactivate();
      expect(await pending).toBeNull();
      if (action !== "unmount") expect(await commands.commitEdits()).not.toBeNull();
      request.resolve([issue]);
      await request.promise;
      await Promise.resolve();
      expect(controller.getErrors()).toEqual([]);
    },
  );

  it("ignores a stale rejection without replacing a newer validation result", async () => {
    const request = deferred<readonly LineItemsValidationIssue[]>();
    const validate = vi
      .fn<NonNullable<UseLineItemsOptions<Row>["validate"]>>()
      .mockImplementationOnce(() => request.promise)
      .mockReturnValue([issue]);
    const { controller, commands } = setup(validate);
    const old = commands.commitEdits();
    await Promise.resolve();
    commands.updateField("A", "quantity", 4);
    expect(await old).toBeNull();
    expect(await commands.commitEdits()).toBeNull();
    request.reject(new Error("Old request failed"));
    await request.promise.catch(() => {});
    await Promise.resolve();
    expect(controller.getErrors()).toEqual([issue]);
  });

  it.each([false, true])(
    "propagates unexpected %s/async failures without converting them into issues",
    async (async) => {
      const error = new Error("Unavailable");
      const { controller, commands } = setup(() => {
        if (async) return Promise.reject(error);
        throw error;
      });
      await expect(commands.commitEdits()).rejects.toBe(error);
      expect(controller.getErrors()).toEqual([]);
    },
  );

  it.each(["discard", "reset"] as const)("clears recorded errors on %s", async (action) => {
    const { controller, commands } = setup(() => [issue]);
    expect(await commands.commitEdits()).toBeNull();
    if (action === "discard") commands.revert();
    else commands.reset(rows);
    expect(controller.getErrors()).toEqual([]);
  });
});

describe("LineItems onValueCommitted", () => {
  it("waits for the cell check before adoption and document validation", async () => {
    const request = deferred<void>();
    const check = vi.fn(() => request.promise);
    const validate = vi.fn(() => []);
    const { controller, commands } = setup(validate, check);
    const { session } = editor(controller);
    session.change("4");
    const pending = commands.commitEdits();
    expect(check).toHaveBeenCalledWith(controller.document.getRows()[0], 4);
    expect(controller.document.getRows()[0]!.quantity).toBe(1);
    expect(validate).not.toHaveBeenCalled();
    request.resolve();
    expect(await pending).toMatchObject({
      lineChanges: [{ action: "update", lineId: "A", patch: { quantity: 4 } }],
    });
    expect(validate).toHaveBeenCalledTimes(1);
    expect(controller.document.getRows()[0]!.quantity).toBe(4);
  });

  it("retains rejected drafts, does not implicitly retry, and accepts an explicit correction", async () => {
    const check = vi.fn((_row: Readonly<Row>, value: number | null) => {
      if (value === 0) throw new CellEditError("Positive quantity required");
    });
    const { controller, commands } = setup(undefined, check);
    const { session, commit } = editor(controller);
    session.change("0");
    expect(await commit()).toBe(false);
    expect(session.getFailure()?.error).toBeInstanceOf(CellEditError);
    expect(controller.document.getRows()[0]!.quantity).toBe(1);
    expect(await commands.commitEdits()).toBeNull();
    expect(check).toHaveBeenCalledTimes(1);
    session.change("4");
    expect(await commit()).toBe(true);
    expect(controller.document.getRows()[0]!.quantity).toBe(4);
  });

  it.each(["write", "draft", "discard", "reset", "remove", "callback", "unmount"] as const)(
    "never adopts a late cell success after %s",
    async (action) => {
      const request = deferred<void>();
      const { controller, commands, options } = setup(undefined, () => request.promise);
      const { session, commit } = editor(controller);
      session.change("9");
      const pending = commit();
      if (action === "write") commands.updateField("A", "quantity", 4);
      if (action === "draft") session.change("5");
      if (action === "discard") commands.revert();
      if (action === "reset") commands.reset(rows);
      if (action === "remove") commands.removeLine("A");
      if (action === "callback") controller.configure({ ...options, columns });
      if (action === "unmount") controller.deactivate();
      expect(await pending).toBe(false);
      request.resolve();
      await request.promise;
      await Promise.resolve();
      let expected: number | undefined = 1;
      if (action === "remove") expected = undefined;
      if (action === "write") expected = 4;
      expect(controller.document.getRows().find((row) => row.id === "A")?.quantity).toBe(expected);
    },
  );

  it("direct document commands bypass the cell callback but still undergo document validation", async () => {
    const check = vi.fn();
    const { controller, commands } = setup(() => [issue], check);
    commands.updateField("A", "quantity", -1);
    commands.addLine({ quantity: -2, name: "New" });
    expect(check).not.toHaveBeenCalled();
    expect(await commands.commitEdits()).toBeNull();
    expect(controller.getErrors()).toEqual([issue]);
  });

  it("prepares a focused error:false draft in one attempt and still runs document validation", async () => {
    const validate = vi.fn(() => [issue]);
    const { controller, commands, options } = setup(validate);
    controller.configure({
      ...options,
      columns: [
        column({
          accessorKey: "quantity",
          edit: {
            editorType: "number",
            error: false,
          },
        }),
        columns[1]!,
      ],
    });
    editor(controller).session.change("4");
    expect(await commands.commitEdits()).toBeNull();
    expect(controller.document.getRows()[0]!.quantity).toBe(4);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(controller.getErrors()).toEqual([issue]);
  });

  it("retains eager error:false adoption without disabling document validation", async () => {
    const error = new CellEditError("Consumer-owned failure");
    const { controller, commands, options } = setup(() => [issue]);
    controller.configure({
      ...options,
      columns: [
        column({
          accessorKey: "quantity",
          edit: {
            editorType: "number",
            error: false,
            onValueCommitted: () => {
              throw error;
            },
          },
        }),
        columns[1]!,
      ],
    });
    const { session, commit } = editor(controller);
    session.change("4");
    expect(commit).toThrow(error);
    expect(session.getFailure()).toBeUndefined();
    expect(controller.document.getRows()[0]!.quantity).toBe(4);
    expect(await commands.commitEdits()).toBeNull();
    expect(controller.getErrors()).toEqual([issue]);
  });
});
