import { splitVariants } from "../class-tokens";

type Node = {
  type: string;
  name?: unknown;
  value?: unknown;
  expression?: Node | null;
  quasis?: { value: { cooked: string | null; raw: string } }[];
  consequent?: Node;
  alternate?: Node;
  operator?: string;
  left?: Node;
  right?: Node;
  callee?: Node;
  arguments?: Node[];
  argument?: Node;
  elements?: (Node | null)[];
  properties?: Node[];
  key?: Node;
  computed?: boolean;
};

/** Kept apart from the recursive `Node` so the exported rule type can be named in the build. */
type JSXName = { type: string; name?: unknown };

type JSXAttribute = {
  type: string;
  name: JSXName;
  value: unknown;
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

/** Functions that join class names. Their string arguments are read like a `className` string. */
const CLASS_HELPERS = new Set(["cn", "clsx", "cx", "twMerge", "twJoin"]);

/**
 * Stock Tailwind font sizes, and arbitrary sizes in a length unit or with a `length:` hint.
 * `text-[#fff]` and `text-[var(--x)]` are colours, so they do not match.
 */
const SIZE_UTILITY =
  /^text-(?:xs|sm|base|lg|xl|[2-9]xl|\[(?:(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)|length:[^\]]+)\]|\(length:[^)]+\))(?:\/\S+)?$/;

function findSizes(text: string): string[] {
  return text.split(/\s+/).filter((token) => {
    if (!token) return false;
    const { utility } = splitVariants(token);
    // Tailwind v4 puts `!` at the end; v3 put it at the start.
    return SIZE_UTILITY.test(utility.replace(/^!|!$/, ""));
  });
}

/** Every string a `className` value can produce: literals, ternary branches and class helper arguments. */
function collectStrings(node: Node | null | undefined, out: string[]): void {
  if (!node) return;
  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string") out.push(node.value);
      return;
    case "TemplateLiteral":
      for (const quasi of node.quasis ?? []) out.push(quasi.value.cooked ?? quasi.value.raw);
      return;
    case "JSXExpressionContainer":
      collectStrings(node.expression, out);
      return;
    case "ConditionalExpression":
      collectStrings(node.consequent, out);
      collectStrings(node.alternate, out);
      return;
    case "LogicalExpression":
      // The left side of `&&` is the condition, not a class name.
      if (node.operator !== "&&") collectStrings(node.left, out);
      collectStrings(node.right, out);
      return;
    case "CallExpression":
      if (node.callee?.type === "Identifier" && CLASS_HELPERS.has(node.callee.name as string)) {
        for (const argument of node.arguments ?? []) collectStrings(argument, out);
      }
      return;
    case "SpreadElement":
      collectStrings(node.argument, out);
      return;
    case "ArrayExpression":
      for (const element of node.elements ?? []) collectStrings(element, out);
      return;
    case "ObjectExpression":
      // `clsx({ "text-sm": compact })`
      for (const property of node.properties ?? []) {
        if (property.type === "Property" && !property.computed) collectStrings(property.key, out);
      }
      return;
  }
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
        "`<span>` sets its text size with `{{found}}`. Use `<Text.span>` from `@tailor-platform/app-shell` (default role `{{role}}`), or replace the size with a typography role utility such as `text-body-sm` when you style the element yourself. `Text.span` is available from AppShell 1.19.0.",
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
        if (!className) return;

        const strings: string[] = [];
        collectStrings(className.value as Node | null, strings);
        const sizes = strings.flatMap(findSizes);
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
