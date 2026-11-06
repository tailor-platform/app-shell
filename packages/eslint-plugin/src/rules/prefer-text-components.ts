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
    messageId: "useTextElement" | "useTextSpan" | "styledHeading" | "styledText";
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

/** A typography role utility such as `text-heading-md` or `text-body-sm`. */
const ROLE_UTILITY = /^text-(?:heading|body|label|code)-/;

/** Named weights, and arbitrary numeric weights such as `font-[600]`. */
const WEIGHT_UTILITY =
  /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/;

const LINE_UTILITY = /^(?:leading|tracking)-/;

/** A class as written, and its utility without the variant prefix and `!`. */
type ParsedClass = { token: string; utility: string };

function parseClasses(text: string): ParsedClass[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const { utility } = splitVariants(token);
      // Tailwind v4 puts `!` at the end; v3 put it at the start.
      return { token, utility: utility.replace(/^!|!$/, "") };
    });
}

/**
 * Weight, line height and letter spacing set without a role. On `p` and `span`, `font-semibold`
 * is allowed for emphasis inside a sentence. A heading has no such use, so any weight counts.
 */
function findHandStyles(classes: ParsedClass[], heading: boolean): ParsedClass[] {
  return classes.filter(
    ({ utility }) =>
      LINE_UTILITY.test(utility) ||
      (WEIGHT_UTILITY.test(utility) && (heading || utility !== "font-semibold")),
  );
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
        "Report a Tailwind font size, or a weight, line height or letter spacing without a typography role, on a plain p, h1 to h6, or span element, and name the AppShell Text element component to use.",
    },
    schema: [],
    messages: {
      useTextElement:
        "`<{{element}}>` sets its text size with `{{found}}`. Use `<Text.{{element}}>` from `@tailor-platform/app-shell` (default role `{{role}}`), and set another typography role with `variant` if needed. `Text.{{element}}` is available from AppShell 1.19.0.",
      useTextSpan:
        "`<span>` sets its text size with `{{found}}`. Use `<Text.span>` from `@tailor-platform/app-shell` (default role `{{role}}`), or replace the size with a typography role utility such as `text-label-md` or `text-body-sm` when you style the element yourself. `Text.span` is available from AppShell 1.19.0.",
      styledHeading:
        "`<{{element}}>` styles its text with `{{found}}` and no typography role. Use `<Text.{{element}}>` from `@tailor-platform/app-shell` (default role `{{role}}`), and set another typography role with `variant` if needed. `Text.{{element}}` is available from AppShell 1.19.0.",
      styledText:
        "`<{{element}}>` styles its text with `{{found}}` and no typography role. Use `<Text.{{element}}>` from `@tailor-platform/app-shell` (default role `{{role}}`) or a typography role utility such as `text-label-md`. `font-semibold` alone is allowed for emphasis inside a sentence. `Text.{{element}}` is available from AppShell 1.19.0.",
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
        const classes = parseClasses(text);
        const sizes = classes.filter(({ utility }) => SIZE_UTILITY.test(utility));
        if (sizes.length > 0) {
          context.report({
            node: node.name,
            messageId: element === "span" ? "useTextSpan" : "useTextElement",
            data: { element, found: sizes.map(({ token }) => token).join(" "), role },
          });
          return;
        }

        if (classes.some(({ utility }) => ROLE_UTILITY.test(utility))) return;
        const heading = /^h[1-6]$/.test(element);
        const styles = findHandStyles(classes, heading);
        if (styles.length === 0) return;

        context.report({
          node: node.name,
          messageId: heading ? "styledHeading" : "styledText",
          data: { element, found: styles.map(({ token }) => token).join(" "), role },
        });
      },
    };
  },
};
