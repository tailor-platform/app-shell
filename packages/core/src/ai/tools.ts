import type { StandardJSONSchemaV1, StandardSchemaV1 } from "@standard-schema/spec";
import type { AIChatMessage } from "./use-ai-chat";

export type AIChatToolSchema<Input = unknown, Output = Input> = StandardSchemaV1<Input, Output> &
  StandardJSONSchemaV1<Input, Output>;

type AnyAIChatToolSchema = AIChatToolSchema<any, any>;
const OPTIONAL_TOOL_SCHEMA = Symbol("optional-tool-schema");

type AIOptionalToolSchema<TSchema extends AnyAIChatToolSchema = AnyAIChatToolSchema> =
  AIChatToolSchema<
    StandardSchemaV1.InferInput<TSchema> | undefined,
    StandardSchemaV1.InferOutput<TSchema> | undefined
  > & {
    [OPTIONAL_TOOL_SCHEMA]: TSchema;
  };

type AISchemaShape = Record<string, AnyAIChatToolSchema | AIOptionalToolSchema>;

type UnwrapOptionalSchema<TSchema extends AnyAIChatToolSchema | AIOptionalToolSchema> =
  TSchema extends AIOptionalToolSchema<infer TInner extends AnyAIChatToolSchema>
    ? TInner
    : TSchema extends AnyAIChatToolSchema
      ? TSchema
      : never;

type SchemaInput<TSchema extends AnyAIChatToolSchema | AIOptionalToolSchema> =
  StandardSchemaV1.InferInput<UnwrapOptionalSchema<TSchema>>;

type SchemaOutput<TSchema extends AnyAIChatToolSchema | AIOptionalToolSchema> =
  StandardSchemaV1.InferOutput<UnwrapOptionalSchema<TSchema>>;

type ObjectInput<TShape extends AISchemaShape> = {
  [K in keyof TShape as TShape[K] extends AIOptionalToolSchema ? never : K]: SchemaInput<TShape[K]>;
} & {
  [K in keyof TShape as TShape[K] extends AIOptionalToolSchema ? K : never]?: SchemaInput<
    TShape[K]
  >;
};

type ObjectOutput<TShape extends AISchemaShape> = {
  [K in keyof TShape as TShape[K] extends AIOptionalToolSchema ? never : K]: SchemaOutput<
    TShape[K]
  >;
} & {
  [K in keyof TShape as TShape[K] extends AIOptionalToolSchema ? K : never]?: SchemaOutput<
    TShape[K]
  >;
};

function success<T>(value: T): StandardSchemaV1.SuccessResult<T> {
  return { value };
}

function failure(message: string): StandardSchemaV1.FailureResult {
  return { issues: [{ message }] };
}

function prefixIssues(
  issues: readonly StandardSchemaV1.Issue[],
  key: PropertyKey,
): StandardSchemaV1.FailureResult {
  return {
    issues: issues.map((issue) => ({
      ...issue,
      path: [key, ...(issue.path ?? [])],
    })),
  };
}

function createToolSchema<Input, Output>(config: {
  validate: (
    value: unknown,
  ) => StandardSchemaV1.Result<Output> | Promise<StandardSchemaV1.Result<Output>>;
  jsonSchemaInput: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
  jsonSchemaOutput?: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
}): AIChatToolSchema<Input, Output> {
  return {
    "~standard": {
      version: 1,
      vendor: "app-shell",
      validate: config.validate,
      jsonSchema: {
        input: config.jsonSchemaInput,
        output: config.jsonSchemaOutput ?? config.jsonSchemaInput,
      },
    },
  } as AIChatToolSchema<Input, Output>;
}

function isOptionalSchema(
  schema: AnyAIChatToolSchema | AIOptionalToolSchema,
): schema is AIOptionalToolSchema {
  return OPTIONAL_TOOL_SCHEMA in schema;
}

function unwrapOptionalSchema<TSchema extends AnyAIChatToolSchema | AIOptionalToolSchema>(
  schema: TSchema,
): UnwrapOptionalSchema<TSchema> {
  return (
    isOptionalSchema(schema) ? schema[OPTIONAL_TOOL_SCHEMA] : schema
  ) as UnwrapOptionalSchema<TSchema>;
}

export const aiToolSchema = {
  string(options?: {
    description?: string;
    minLength?: number;
    maxLength?: number;
  }): AIChatToolSchema<string> {
    return createToolSchema({
      validate: (value) => {
        if (typeof value !== "string") {
          return failure("Must be a string");
        }
        if (options?.minLength !== undefined && value.length < options.minLength) {
          return failure(`Must be at least ${options.minLength} character(s)`);
        }
        if (options?.maxLength !== undefined && value.length > options.maxLength) {
          return failure(`Must be at most ${options.maxLength} character(s)`);
        }
        return success(value);
      },
      jsonSchemaInput: () => ({
        type: "string",
        ...(options?.description ? { description: options.description } : {}),
        ...(options?.minLength !== undefined ? { minLength: options.minLength } : {}),
        ...(options?.maxLength !== undefined ? { maxLength: options.maxLength } : {}),
      }),
    });
  },

  number(options?: {
    description?: string;
    minimum?: number;
    maximum?: number;
    integer?: boolean;
  }): AIChatToolSchema<number> {
    return createToolSchema({
      validate: (value) => {
        if (typeof value !== "number" || Number.isNaN(value)) {
          return failure("Must be a number");
        }
        if (options?.integer && !Number.isInteger(value)) {
          return failure("Must be an integer");
        }
        if (options?.minimum !== undefined && value < options.minimum) {
          return failure(`Must be at least ${options.minimum}`);
        }
        if (options?.maximum !== undefined && value > options.maximum) {
          return failure(`Must be at most ${options.maximum}`);
        }
        return success(value);
      },
      jsonSchemaInput: () => ({
        type: options?.integer ? "integer" : "number",
        ...(options?.description ? { description: options.description } : {}),
        ...(options?.minimum !== undefined ? { minimum: options.minimum } : {}),
        ...(options?.maximum !== undefined ? { maximum: options.maximum } : {}),
      }),
    });
  },

  boolean(options?: { description?: string }): AIChatToolSchema<boolean> {
    return createToolSchema({
      validate: (value) =>
        typeof value === "boolean" ? success(value) : failure("Must be a boolean"),
      jsonSchemaInput: () => ({
        type: "boolean",
        ...(options?.description ? { description: options.description } : {}),
      }),
    });
  },

  enum<const TValues extends readonly string[]>(
    values: TValues,
    options?: { description?: string },
  ): AIChatToolSchema<TValues[number]> {
    return createToolSchema({
      validate: (value) =>
        typeof value === "string" && values.includes(value)
          ? success(value as TValues[number])
          : failure(`Must be one of: ${values.join(", ")}`),
      jsonSchemaInput: () => ({
        type: "string",
        enum: [...values],
        ...(options?.description ? { description: options.description } : {}),
      }),
    });
  },

  array<TSchema extends AnyAIChatToolSchema>(
    schema: TSchema,
    options?: { description?: string },
  ): AIChatToolSchema<
    StandardSchemaV1.InferInput<TSchema>[],
    StandardSchemaV1.InferOutput<TSchema>[]
  > {
    return createToolSchema({
      validate: async (value) => {
        if (!Array.isArray(value)) {
          return failure("Must be an array");
        }

        const output: StandardSchemaV1.InferOutput<TSchema>[] = [];
        for (const [index, entry] of value.entries()) {
          const result = await schema["~standard"].validate(entry);
          if (result.issues) {
            return prefixIssues(result.issues, index);
          }
          output.push(result.value);
        }

        return success(output);
      },
      jsonSchemaInput: (jsonSchemaOptions) => ({
        type: "array",
        items: schema["~standard"].jsonSchema.input(jsonSchemaOptions),
        ...(options?.description ? { description: options.description } : {}),
      }),
      jsonSchemaOutput: (jsonSchemaOptions) => ({
        type: "array",
        items: schema["~standard"].jsonSchema.output(jsonSchemaOptions),
        ...(options?.description ? { description: options.description } : {}),
      }),
    });
  },

  object<const TShape extends AISchemaShape>(
    shape: TShape,
    options?: { description?: string },
  ): AIChatToolSchema<ObjectInput<TShape>, ObjectOutput<TShape>> {
    return createToolSchema({
      validate: async (value) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return failure("Must be an object");
        }

        const output: Record<string, unknown> = {};

        for (const [key, rawSchema] of Object.entries(shape)) {
          const schema = unwrapOptionalSchema(rawSchema);
          const isOptional = isOptionalSchema(rawSchema);
          const inputValue = (value as Record<string, unknown>)[key];

          if (inputValue === undefined) {
            if (!isOptional) {
              return prefixIssues(failure("Required").issues, key);
            }
            continue;
          }

          const result = await schema["~standard"].validate(inputValue);
          if (result.issues) {
            return prefixIssues(result.issues, key);
          }
          output[key] = result.value;
        }

        return success(output as ObjectOutput<TShape>);
      },
      jsonSchemaInput: (jsonSchemaOptions) => ({
        type: "object",
        properties: Object.fromEntries(
          Object.entries(shape).map(([key, rawSchema]) => [
            key,
            unwrapOptionalSchema(rawSchema)["~standard"].jsonSchema.input(jsonSchemaOptions),
          ]),
        ),
        required: Object.entries(shape)
          .filter(([, rawSchema]) => !isOptionalSchema(rawSchema))
          .map(([key]) => key),
        additionalProperties: false,
        ...(options?.description ? { description: options.description } : {}),
      }),
      jsonSchemaOutput: (jsonSchemaOptions) => ({
        type: "object",
        properties: Object.fromEntries(
          Object.entries(shape).map(([key, rawSchema]) => [
            key,
            unwrapOptionalSchema(rawSchema)["~standard"].jsonSchema.output(jsonSchemaOptions),
          ]),
        ),
        required: Object.entries(shape)
          .filter(([, rawSchema]) => !isOptionalSchema(rawSchema))
          .map(([key]) => key),
        additionalProperties: false,
        ...(options?.description ? { description: options.description } : {}),
      }),
    });
  },

  optional<TSchema extends AnyAIChatToolSchema>(schema: TSchema): AIOptionalToolSchema<TSchema> {
    return {
      ...createToolSchema({
        validate: async (value) =>
          value === undefined ? success(undefined) : await schema["~standard"].validate(value),
        jsonSchemaInput: (jsonSchemaOptions) =>
          schema["~standard"].jsonSchema.input(jsonSchemaOptions),
        jsonSchemaOutput: (jsonSchemaOptions) =>
          schema["~standard"].jsonSchema.output(jsonSchemaOptions),
      }),
      [OPTIONAL_TOOL_SCHEMA]: schema,
    } as AIOptionalToolSchema<TSchema>;
  },
};

export interface AIChatToolContext {
  signal: AbortSignal;
  messages: AIChatMessage[];
}

export interface AILocalTool<
  TSchema extends AIChatToolSchema<any, any> = AIChatToolSchema<any, any>,
> {
  kind: "local";
  description?: string;
  schema: TSchema;
  execute: (
    args: StandardSchemaV1.InferOutput<TSchema>,
    context: AIChatToolContext,
  ) => unknown | Promise<unknown>;
}

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

export interface OpenAIWebSearchToolOptions {
  externalWebAccess?: boolean;
  searchContextSize?: "low" | "medium" | "high";
  userLocation?: {
    type: "approximate";
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
  };
  filters?: {
    allowedDomains?: string[];
  };
}

export interface AIOpenAIWebSearchTool {
  kind: "provider";
  provider: "openai";
  tool: "webSearch";
  options?: OpenAIWebSearchToolOptions;
}

export type AIChatConfiguredTool = AILocalTool | AIOpenAIWebSearchTool;

export const aiProviderTool = {
  openai: {
    webSearch(options?: OpenAIWebSearchToolOptions): AIOpenAIWebSearchTool {
      return {
        kind: "provider",
        provider: "openai",
        tool: "webSearch",
        options,
      };
    },
  },
};
