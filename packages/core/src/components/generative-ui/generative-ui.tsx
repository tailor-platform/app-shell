import type { StandardSchemaV1 } from "@standard-schema/spec";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { defineAIChatTool, type AIChatToolSchema, type AILocalTool } from "../../ai/tools";
import { useResolvedLocale } from "../../contexts/appshell-context";
import { cn } from "../../lib/utils";
import { Text } from "../text";
import type {
  GenerativeUICardDefinition,
  GenerativeUIDocument,
  GenerativeUIRendererProps,
} from "./types";

const labels = {
  en: "This generated content cannot be displayed.",
  ja: "生成された内容を表示できません。",
};

const MAX_CARDS = 5;
type ParsedCard = { component: ComponentType<{ data: any }>; data: unknown };
type ParsedDocument = { document: GenerativeUIDocument; cards: ParsedCard[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// shortcut: reference-based card schemas are unsupported; rebase refs when recursive cards are needed.
function hasSchemaReferences(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasSchemaReferences);
  if (!isObject(value)) return false;
  return Object.entries(value).some(
    ([key, child]) =>
      ((key === "$ref" || key === "$dynamicRef" || key === "$recursiveRef") &&
        typeof child === "string") ||
      hasSchemaReferences(child),
  );
}

/**
 * Defines a stateless card renderer and its ui_render local tool.
 * Only registered schemas are advertised to the model. Card data, not React elements,
 * is retained in useAIChat's ordered message parts.
 */
export function defineGenerativeUI<
  const Schemas extends Record<string, AIChatToolSchema<any, any>>,
>(config: {
  cards: { [Name in keyof Schemas]: GenerativeUICardDefinition<Schemas[Name]> };
}): {
  tool: AILocalTool<AIChatToolSchema<GenerativeUIDocument>>;
  Renderer: ComponentType<GenerativeUIRendererProps>;
} {
  const registry = new Map<string, GenerativeUICardDefinition>(Object.entries(config.cards));
  if (registry.size === 0) throw new Error("defineGenerativeUI requires at least one card");
  if ([...registry.keys()].some((name) => !name || name.length > 80)) {
    throw new Error("Card names must contain between 1 and 80 characters");
  }

  async function validateDocument(raw: unknown): Promise<StandardSchemaV1.Result<ParsedDocument>> {
    if (
      !isObject(raw) ||
      Object.keys(raw).some((key) => key !== "cards") ||
      !Array.isArray(raw.cards)
    ) {
      return { issues: [{ message: "Expected an object containing a cards array" }] };
    }
    if (raw.cards.length < 1 || raw.cards.length > MAX_CARDS) {
      return { issues: [{ message: `Provide between 1 and ${MAX_CARDS} cards`, path: ["cards"] }] };
    }
    const cards: ParsedCard[] = [];
    const document: GenerativeUIDocument = { cards: [] };
    const issues: StandardSchemaV1.Issue[] = [];
    for (const [index, card] of raw.cards.entries()) {
      const path = ["cards", index];
      if (
        !isObject(card) ||
        typeof card.type !== "string" ||
        !Object.hasOwn(card, "data") ||
        Object.keys(card).some((key) => key !== "type" && key !== "data")
      ) {
        issues.push({ message: "Expected a card with type and data", path });
        continue;
      }
      const definition = registry.get(card.type);
      if (!definition) {
        issues.push({ message: `Unknown card type: ${card.type}`, path: [...path, "type"] });
        continue;
      }
      try {
        const result = await definition.schema["~standard"].validate(card.data);
        if (result.issues) {
          issues.push(
            ...result.issues.map((issue) => ({
              ...issue,
              path: [...path, "data", ...(issue.path ?? [])],
            })),
          );
          continue;
        }
        cards.push({ component: definition.component, data: result.value });
        // Retain input rather than transformed output so replay validates/transforms exactly once.
        document.cards.push({ type: card.type, data: card.data });
      } catch (error) {
        issues.push({
          message: error instanceof Error ? error.message : "Card validation failed",
          path,
        });
      }
    }
    return issues.length ? { issues } : { value: { document, cards } };
  }

  function jsonSchema(
    options: Parameters<AIChatToolSchema["~standard"]["jsonSchema"]["input"]>[0],
  ) {
    return {
      type: "object",
      properties: {
        cards: {
          type: "array",
          minItems: 1,
          maxItems: MAX_CARDS,
          items: {
            anyOf: [...registry].map(([name, definition]) => {
              const data = definition.schema["~standard"].jsonSchema.input(options);
              if (hasSchemaReferences(data)) {
                throw new Error(
                  `Card ${name} must provide a reference-free JSON Schema; recursive/reference-based schemas are not supported`,
                );
              }
              return {
                type: "object",
                properties: { type: { const: name, type: "string" }, data },
                required: ["type", "data"],
                additionalProperties: false,
              };
            }),
          },
        },
      },
      required: ["cards"],
      additionalProperties: false,
    };
  }

  const schema: AIChatToolSchema<GenerativeUIDocument> = {
    "~standard": {
      version: 1,
      vendor: "app-shell",
      async validate(value) {
        const result = await validateDocument(value);
        return result.issues ? { issues: result.issues } : { value: result.value.document };
      },
      jsonSchema: { input: jsonSchema, output: jsonSchema },
    },
  };
  const tool = defineAIChatTool({
    description:
      "Display read-only cards to the user. Use only registered card types and values from tool results. This tool performs no writes and does not request user input.",
    schema,
    execute(document, { emit }) {
      if (!emit) throw new Error("Generative UI tools require a context.emit callback");
      emit({ type: "generative-ui", data: document });
      return { ok: true, shown: document.cards.length };
    },
  });

  function Renderer({ document, className, ...props }: GenerativeUIRendererProps) {
    const { language } = useResolvedLocale();
    const [validated, setValidated] = useState<{
      source: unknown;
      result: StandardSchemaV1.Result<ParsedDocument>;
    }>();

    // Standard Schema validators can be async; ignore results after replacement or unmount.
    useEffect(() => {
      let current = true;
      void validateDocument(document).then((result) => {
        if (current) setValidated({ source: document, result });
      });
      return () => {
        current = false;
      };
    }, [document]);

    const result = validated && validated.source === document ? validated.result : undefined;
    return (
      <div data-slot="generative-ui" className={cn("astw:space-y-4", className)} {...props}>
        {result?.issues ? (
          <Text.p variant="body-sm" className="astw:text-muted-foreground">
            {language === "ja" ? labels.ja : labels.en}
          </Text.p>
        ) : (
          result?.value.cards.map(({ component: View, data }, index) => (
            <View key={index} data={data} />
          ))
        )}
      </div>
    );
  }

  return { tool, Renderer };
}
