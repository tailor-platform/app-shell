import type { StandardJSONSchemaV1, StandardSchemaV1 } from "@standard-schema/spec";
import type { AIChatMessage } from "./use-ai-chat";

/**
 * Schema contract for local AI chat tools.
 *
 * A schema must validate runtime inputs and generate JSON Schema for the AI
 * Gateway request. Zod 4 implements both Standard Schema contracts directly.
 *
 * @example
 * ```ts
 * import { z } from "zod/v4";
 *
 * const schema = z.object({
 *   customerId: z.string(),
 *   includeInactive: z.boolean().optional(),
 * });
 * ```
 */
export type AIChatToolSchema<Input = unknown, Output = Input> = StandardSchemaV1<Input, Output> &
  StandardJSONSchemaV1<Input, Output>;

/** Context passed to local tool executors. */
export interface AIChatToolContext {
  /** Abort signal for the in-flight chat request. */
  signal: AbortSignal;
  /** Public user/assistant transcript visible to the current chat turn. */
  messages: AIChatMessage[];
}

/**
 * A tool executed locally inside AppShell.
 *
 * Local tools are validated with Standard Schema, executed in-process, and then
 * written back into the internal AI Gateway transcript as `role: "tool"`
 * messages for the next model round.
 * Schema and executor are split so heterogeneous schemas compare structurally.
 */
export type AILocalTool<TSchema extends AIChatToolSchema<any, any> = AIChatToolSchema<any, any>> = {
  kind: "local";
  description?: string;
  schema: TSchema;
} & {
  execute: (
    args: StandardSchemaV1.InferOutput<TSchema>,
    context: AIChatToolContext,
  ) => unknown | Promise<unknown>;
};

/**
 * Small typed helper for defining local AI chat tools.
 *
 * This is mostly an identity function, but it keeps `execute(args)` inferred
 * from the provided schema when tools are declared inline.
 *
 * @example
 * ```ts
 * import { defineAIChatTool } from "@tailor-platform/app-shell";
 * import { z } from "zod/v4";
 *
 * const lookupCustomer = defineAIChatTool({
 *   description: "Look up a customer in the current workspace",
 *   schema: z.object({
 *     customerId: z.string(),
 *   }),
 *   async execute({ customerId }, { signal }) {
 *     const customer = await fetchCustomer(customerId, { signal });
 *     return {
 *       id: customer.id,
 *       name: customer.name,
 *       status: customer.status,
 *     };
 *   },
 * });
 * ```
 */
export function defineAIChatTool<const TSchema extends AIChatToolSchema<any, any>>(tool: {
  description?: string;
  schema: TSchema;
  execute: (
    args: StandardSchemaV1.InferOutput<TSchema>,
    context: AIChatToolContext,
  ) => unknown | Promise<unknown>;
}): AILocalTool<TSchema> {
  return {
    kind: "local",
    ...tool,
  };
}
