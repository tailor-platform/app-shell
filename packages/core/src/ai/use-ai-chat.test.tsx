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
      streamChatCompletion: vi.fn(async function* () {
        yield { type: "done" } as const;
      }),
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
      streamChatCompletion: vi.fn(async function* ({ signal }) {
        expect(signal).toBeInstanceOf(AbortSignal);
        yield { type: "text-delta", text: "Hello" } as const;
        await secondChunkGate;
        yield { type: "text-delta", text: " world" } as const;
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    let sendPromise: Promise<boolean> | undefined;
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

    expect(client.streamChatCompletion).toHaveBeenCalledWith({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: "Hi" }],
      signal: expect.any(AbortSignal),
    });

    releaseSecondChunk();
    await act(async () => {
      await expect(sendPromise).resolves.toBe(true);
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
      streamChatCompletion: vi.fn(async function* ({ signal }) {
        yield { type: "text-delta", text: "Partial" } as const;
        await secondChunkGate;
        if (signal?.aborted) {
          throw createAbortError();
        }
        yield { type: "text-delta", text: " later" } as const;
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    let sendPromise: Promise<boolean> | undefined;
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
      await expect(sendPromise).resolves.toBe(false);
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

  it("ignores stale chunks after stop and allows the next send", async () => {
    let releaseStoppedRequest!: () => void;
    const stoppedRequestGate = new Promise<void>((resolve) => {
      releaseStoppedRequest = resolve;
    });

    const client = {
      streamChatCompletion: vi.fn(async function* ({ messages }) {
        const text = messages.at(-1)?.content;

        if (text === "First") {
          yield { type: "text-delta", text: "Partial" } as const;
          await stoppedRequestGate;
          yield { type: "text-delta", text: " stale" } as const;
          yield { type: "done" } as const;
          return;
        }

        yield { type: "text-delta", text: "Fresh" } as const;
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    let firstSendPromise: Promise<boolean> | undefined;
    await act(async () => {
      firstSendPromise = result.current.sendMessage("First");
    });

    await waitFor(() => {
      expect(result.current.status).toBe("streaming");
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "First" },
        { id: "id-2", role: "assistant", content: "Partial" },
      ]);
    });

    act(() => {
      result.current.stop();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    await act(async () => {
      await expect(result.current.sendMessage("Second")).resolves.toBe(true);
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "First" },
        { id: "id-2", role: "assistant", content: "Partial" },
        { id: "id-3", role: "user", content: "Second" },
        { id: "id-4", role: "assistant", content: "Fresh" },
      ]);
    });

    releaseStoppedRequest();
    await act(async () => {
      await expect(firstSendPromise).resolves.toBe(false);
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual([
        { id: "id-1", role: "user", content: "First" },
        { id: "id-2", role: "assistant", content: "Partial" },
        { id: "id-3", role: "user", content: "Second" },
        { id: "id-4", role: "assistant", content: "Fresh" },
      ]);
    });
  });

  it("sets error state and recovers on the next successful send", async () => {
    let shouldFail = true;
    const client = {
      streamChatCompletion: vi.fn(async function* () {
        if (shouldFail) {
          throw new Error("boom");
        }
        yield { type: "text-delta", text: "Recovered" } as const;
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    await act(async () => {
      await expect(result.current.sendMessage("Hi")).resolves.toBe(false);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.error?.message).toBe("boom");
      expect(result.current.messages).toEqual([{ id: "id-1", role: "user", content: "Hi" }]);
    });

    shouldFail = false;

    await act(async () => {
      await expect(result.current.sendMessage("Retry")).resolves.toBe(true);
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
      streamChatCompletion: vi.fn(async function* () {
        await requestGate;
        yield { type: "text-delta", text: "Done" } as const;
        yield { type: "done" } as const;
      }),
    } satisfies AIGatewayClient;

    const { result } = renderHook(() => useAIChat({ client, model: "gpt-5-mini" }));

    await act(async () => {
      await expect(result.current.sendMessage("   ")).resolves.toBe(false);
    });

    expect(client.streamChatCompletion).not.toHaveBeenCalled();

    await act(async () => {
      void result.current.sendMessage("First");
    });

    await act(async () => {
      await expect(result.current.sendMessage("Second")).resolves.toBe(false);
    });

    expect(client.streamChatCompletion).toHaveBeenCalledTimes(1);

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
