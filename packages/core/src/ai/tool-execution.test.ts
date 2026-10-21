import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import type { AILocalTool } from "./tools";
import { resolveToolCalls } from "./tool-execution";

const toolCall = { id: "call-1", name: "lookup", argumentsText: "{}" };

describe("resolveToolCalls", () => {
  it.each([false, true])(
    "propagates cancellation while validation is pending (validation rejects: %s)",
    async (rejectValidation) => {
      let releaseValidation!: () => void;
      const validationGate = new Promise<void>((resolve) => {
        releaseValidation = resolve;
      });
      const schema = z.object({});
      const validate = vi.spyOn(schema["~standard"], "validate").mockImplementation(async () => {
        await validationGate;
        if (rejectValidation) throw new Error("validation failed");
        return { value: {} };
      });
      const execute = vi.fn(() => "found");
      const controller = new AbortController();
      const pending = resolveToolCalls({
        toolCalls: [toolCall],
        localTools: new Map<string, AILocalTool>([["lookup", { kind: "local", schema, execute }]]),
        signal: controller.signal,
        visibleMessages: [],
      });

      expect(validate).toHaveBeenCalledOnce();
      controller.abort();
      releaseValidation();

      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it("propagates cancellation errors from the executor", async () => {
    const error = new DOMException("Stopped", "AbortError");
    const execute = vi.fn().mockRejectedValue(error);

    await expect(
      resolveToolCalls({
        toolCalls: [toolCall],
        localTools: new Map<string, AILocalTool>([
          ["lookup", { kind: "local", schema: z.object({}), execute }],
        ]),
        signal: new AbortController().signal,
        visibleMessages: [],
      }),
    ).rejects.toBe(error);
  });

  it("still returns ordinary executor failures as tool results", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("lookup failed"));

    await expect(
      resolveToolCalls({
        toolCalls: [toolCall],
        localTools: new Map<string, AILocalTool>([
          ["lookup", { kind: "local", schema: z.object({}), execute }],
        ]),
        signal: new AbortController().signal,
        visibleMessages: [],
      }),
    ).resolves.toEqual([
      { role: "tool", toolCallId: "call-1", content: '{"error":"lookup failed"}' },
    ]);
  });
});
