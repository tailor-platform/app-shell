import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createCellEditSession } from "../cell-session";
import { useCellEditSession } from "./use-session";

afterEach(cleanup);

it("detaches a view without cancelling its externally owned session", () => {
  const session = createCellEditSession<unknown>();
  const { result, unmount } = renderHook(() => useCellEditSession<string>(true, session));
  expect(result.current.getState).toBe(session.getState);
  unmount();
  session.begin("Memo");
  const commit = vi.fn();
  session.confirm(commit);
  expect(commit).toHaveBeenCalledOnce();
  expect(session.getState()).toEqual({ status: "idle" });
});

it("does not activate an externally owned session whose owner has disposed it", () => {
  const session = createCellEditSession<unknown>();
  session.deactivate();
  const { result } = renderHook(() => useCellEditSession<string>(true, session));
  result.current.change("Detached");
  expect(session.getState()).toEqual({ status: "idle" });
});
