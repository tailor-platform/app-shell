import { splitVariants } from "../class-tokens";

type JSXName = { type: string; name?: unknown };

type StringNode = {
  type: string;
  value?: unknown;
  expressions?: unknown[];
  quasis?: { value: { cooked: string | null; raw: string } }[];
};

type JSXAttribute = {
  type: string;
  name: JSXName;
  value: (StringNode & { expression?: StringNode }) | null;
};

type JSXOpeningElement = {
  name: JSXName;
  attributes: JSXAttribute[];
};

type RuleContext = {
  report(problem: {
    node: JSXName;
    messageId: "useTextElement" | "useTextSpan";
    data: { element: string; found: string; role: string };
  }): void;
};

/** Plain text elements and the role their `Text.<element>` component renders by default. */
const DEFAULT_ROLES: Record<string, string> = {
  h1: "heading-lg",
  h2: "heading-md",
  h3: "heading-sm",
  h4: "heading-sm",
  h5: "heading-sm",
  h6: "heading-sm",
  p: "body-md",
  span: "label-md",
};

/**
 * Stock Tailwind font sizes, and arbitrary sizes in a length unit or with a `length:` hint.
 * `text-[#fff]` and `text-[var(--x)]` are colours, so they do not match.
 */
const SIZE_UTILITY =
  /^text-(?:xs|sm|base|lg|xl|[2-9]xl|\[(?:(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)|length:[^\]]+)\]|\(length:[^)]+\))(?:\/\S+)?$/;

function findSizes(text: string): string[] {
  return text.split(/\s+/).filter((token) => {
    const { utility } = splitVariants(token);
    // Tailwind v4 puts `!` at the end; v3 put it at the start.
    return SIZE_UTILITY.test(utility.replace(/^!|!$/, ""));
  });
}

/**
 * The class string written directly in `className`: `"..."`, `{"..."}`, or a template literal
 * without interpolation. `cn(...)`, ternaries, variables and interpolated templates are not read.
 */
function classNameString(value: JSXAttribute["value"]): string | undefined {
  const node = value?.type === "JSXExpressionContainer" ? value.expression : value;
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions?.length === 0) {
    const quasi = node.quasis?.[0];
    return quasi && (quasi.value.cooked ?? quasi.value.raw);
  }
  return undefined;
}

export const preferTextComponents = {
  meta: {
    type: "suggestion" as const,
    docs: {
      description:
        "Report a Tailwind font size on a plain p, h1 to h6, or span element, and name the AppShell Text element component to use.",
    },
    schema: [],
    messages: {
      useTextElement:
        "`<{{element}}>` sets its text size with `{{found}}`. Use `<Text.{{element}}>` from `@tailor-platform/app-shell` (default role `{{role}}`), and set another typography role with `variant` if needed. `Text.{{element}}` is available from AppShell 1.19.0.",
      useTextSpan:
        "`<span>` sets its text size with `{{found}}`. Use `<Text.span>` from `@tailor-platform/app-shell` (default role `{{role}}`), or replace the size with a typography role utility such as `text-label-md` or `text-body-sm` when you style the element yourself. `Text.span` is available from AppShell 1.19.0.",
    },
  },
  create(context: RuleContext) {
    return {
      JSXOpeningElement(node: JSXOpeningElement) {
        if (node.name.type !== "JSXIdentifier") return;
        const element = node.name.name as string;
        const role = DEFAULT_ROLES[element];
        if (!role) return;

        const className = node.attributes.find(
          (attribute) =>
            attribute.type === "JSXAttribute" &&
            attribute.name.type === "JSXIdentifier" &&
            attribute.name.name === "className",
        );
        const text = className && classNameString(className.value);
        if (!text) return;
        const sizes = findSizes(text);
        if (sizes.length === 0) return;

        context.report({
          node: node.name,
          messageId: element === "span" ? "useTextSpan" : "useTextElement",
          data: { element, found: sizes.join(" "), role },
        });
      },
    };
  },
};
