import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAIChat } from "./use-ai-chat";
import type { AIGatewayClient } from "./client";

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

beforeEach(() => {
  let id = 0;
  vi.stubGlobal("crypto", {
    randomUUID: () => `id-${++id}`,
  });
});

describe("useAIChat", () => {
  it("returns the initial ready state", () => {
    const client = {
      chatCompletionStream: vi.fn(async function* () {}),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe("ready");
    expect(result.current.error).toBeUndefined();
  });

  it("appends user and assistant messages while streaming", async () => {
    let releaseSecondChunk!: () => void;
    const secondChunkGate = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve;
    });

    const client = {
      chatCompletionStream: vi.fn(async function* ({ signal }) {
        expect(signal).toBeInstanceOf(AbortSignal);
        yield "Hello";
        await secondChunkGate;
        yield " world";
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    let sendPromise: Promise<void> | undefined;
    await act(async () => {
      sendPromise = result.current.sendMessage("Hi");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("streaming");
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "Hi" },
        { id: "id-2", role: "assistant", content: "Hello" },
      ]);
    });

    expect(client.chatCompletionStream).toHaveBeenCalledWith({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: "Hi" }],
      signal: expect.any(AbortSignal),
    });

    releaseSecondChunk();
    await act(async () => {
      await sendPromise;
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "Hi" },
        { id: "id-2", role: "assistant", content: "Hello world" },
      ]);
    });
  });

  it("keeps partial assistant text when stopped", async () => {
    let releaseSecondChunk!: () => void;
    const secondChunkGate = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve;
    });

    const client = {
      chatCompletionStream: vi.fn(async function* ({ signal }) {
        yield "Partial";
        await secondChunkGate;
        if (signal?.aborted) {
          throw createAbortError();
        }
        yield " later";
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    let sendPromise: Promise<void> | undefined;
    await act(async () => {
      sendPromise = result.current.sendMessage("Hi");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("streaming");
      expect(result.current.messages[1]?.content).toBe("Partial");
    });

    act(() => {
      result.current.stop();
    });
    releaseSecondChunk();

    await act(async () => {
      await sendPromise;
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.error).toBeUndefined();
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "Hi" },
        { id: "id-2", role: "assistant", content: "Partial" },
      ]);
    });
  });

  it("sets error state and recovers on the next successful send", async () => {
    let shouldFail = true;
    const client = {
      chatCompletionStream: vi.fn(async function* () {
        if (shouldFail) {
          throw new Error("boom");
        }
        yield "Recovered";
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.error?.message).toBe("boom");
      expect(result.current.messages).toEqual([{ id: "id-1", role: "user", content: "Hi" }]);
    });

    shouldFail = false;

    await act(async () => {
      await result.current.sendMessage("Retry");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.error).toBeUndefined();
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "Hi" },
        { id: "id-2", role: "user", content: "Retry" },
        { id: "id-3", role: "assistant", content: "Recovered" },
      ]);
    });
  });

  it("ignores blank and concurrent sends", async () => {
    let releaseRequest!: () => void;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });

    const client = {
      chatCompletionStream: vi.fn(async function* () {
        await requestGate;
        yield "Done";
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    await act(async () => {
      await result.current.sendMessage("   ");
    });

    expect(client.chatCompletionStream).not.toHaveBeenCalled();

    await act(async () => {
      void result.current.sendMessage("First");
    });

    await act(async () => {
      await result.current.sendMessage("Second");
    });

    expect(client.chatCompletionStream).toHaveBeenCalledTimes(1);

    releaseRequest();
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "First" },
        { id: "id-2", role: "assistant", content: "Done" },
      ]);
    });
  });
});
