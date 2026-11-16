import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ComponentProps, ComponentType } from "react";
import type { AIChatToolSchema } from "../../ai/tools";

/** A registered card's model input and its application-owned view. */
export interface GenerativeUICardDefinition<
  TSchema extends AIChatToolSchema<any, any> = AIChatToolSchema<any, any>,
> {
  schema: TSchema;
  component: ComponentType<{ data: StandardSchemaV1.InferOutput<TSchema> }>;
}

/** Serializable model input, retained in the conversation rather than React elements. */
export interface GenerativeUIDocument {
  cards: { type: string; data: unknown }[];
}

export type GenerativeUIRendererProps = Omit<ComponentProps<"div">, "children"> & {
  /** Untrusted input is validated against the registered card schemas before rendering. */
  document: unknown;
};
