type Node = {
  value?: unknown;
};

type TemplateElementNode = {
  value: { cooked: string | null; raw: string };
};

type RuleContext = {
  report(problem: {
    node: Node | TemplateElementNode;
    messageId: "deprecatedToken";
    data: { found: string; replacement: string };
  }): void;
};

/** `--status-*` names to the intent each one resolves to since 1.17.0. */
const STATUS_INTENTS: Record<string, string> = {
  completed: "success",
  attention: "warning",
  danger: "danger",
  neutral: "info",
  default: "neutral",
};

/** `--alert-*` intents to colour-role intents. */
const ALERT_INTENTS: Record<string, string> = {
  error: "danger",
  info: "info",
  neutral: "neutral",
  success: "success",
  warning: "warning",
};

/** `--alert-{intent}-*` parts to colour roles. */
const ALERT_ROLES: Record<string, string> = {
  background: "surface",
  border: "border",
  foreground: "text",
  "foreground-muted": "text",
};

const UTILITY_PREFIXES = [
  "bg",
  "text",
  "border",
  "border-x",
  "border-y",
  "border-t",
  "border-r",
  "border-b",
  "border-l",
  "border-s",
  "border-e",
  "divide",
  "outline",
  "ring",
  "ring-offset",
  "fill",
  "stroke",
  "from",
  "via",
  "to",
  "decoration",
  "placeholder",
  "caret",
  "accent",
  "shadow",
];

const UTILITY = new RegExp(
  `^(${UTILITY_PREFIXES.join("|")})-(destructive(?:-foreground)?|status-(?:${Object.keys(STATUS_INTENTS).join("|")})|alert-(?:${Object.keys(ALERT_INTENTS).join("|")})-(?:foreground-muted|background|border|foreground))(?:/(\\d+))?$`,
);

/** Every `--name` in a string. One character class, so the scan stays linear. */
const CSS_VARIABLE_CANDIDATE = /--[a-z0-9-]+/g;

/** Checked against one candidate at a time, so the alternation never runs on the whole string. */
const DEPRECATED_VARIABLE =
  /^--(?:destructive(?:-foreground)?|status-(?:completed|attention|danger|neutral|default)|alert-(?:error|info|neutral|success|warning)-(?:foreground-muted|background|border|foreground)|app-shell-type-[a-z0-9-]+)$/;

/** The role a utility should use when the old token gave a whole fill or text colour. */
function solidRole(prefix: string): string {
  return prefix === "text" ? "text" : "solid";
}

/** The role a utility should use when the old token was used with an opacity modifier. */
function tintRole(prefix: string, opacity: number): string {
  if (opacity >= 50) return solidRole(prefix);
  if (prefix === "bg" || prefix === "from" || prefix === "via" || prefix === "to") return "surface";
  return "border";
}

function replaceUtility(prefix: string, token: string, opacity: number | undefined): string {
  if (token === "destructive-foreground") return `${prefix}-danger-contrast`;
  if (token === "destructive") {
    const role = opacity === undefined ? solidRole(prefix) : tintRole(prefix, opacity);
    return `${prefix}-danger-${role}`;
  }
  if (token.startsWith("status-")) {
    const intent = STATUS_INTENTS[token.slice("status-".length)];
    const role = opacity === undefined ? solidRole(prefix) : tintRole(prefix, opacity);
    return `${prefix}-${intent}-${role}`;
  }
  const [, alertIntent, part] = /^alert-([a-z]+)-(.+)$/.exec(token) ?? [];
  if (alertIntent === "neutral" && part === "foreground-muted") return `${prefix}-muted-foreground`;
  return `${prefix}-${ALERT_INTENTS[alertIntent]}-${ALERT_ROLES[part]}`;
}

function replaceVariable(name: string): string {
  if (name === "--destructive") return "--danger-solid";
  if (name === "--destructive-foreground") return "--danger-contrast";
  if (name.startsWith("--app-shell-type-"))
    return `--type-${name.slice("--app-shell-type-".length)}`;
  if (name.startsWith("--status-")) {
    const status = name.slice("--status-".length);
    return status === "default" ? "--neutral-indicator" : `--${STATUS_INTENTS[status]}-solid`;
  }
  const [, alertIntent, part] = /^--alert-([a-z]+)-(.+)$/.exec(name) ?? [];
  if (alertIntent === "neutral" && part === "foreground-muted") return "--muted-foreground";
  return `--${ALERT_INTENTS[alertIntent]}-${ALERT_ROLES[part]}`;
}

/** Split a class token into its variant prefix (`hover:`, `dark:`, ...) and the utility. */
function splitVariants(token: string): { variants: string; utility: string } {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < token.length; i++) {
    const char = token[i];
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth--;
    else if (char === ":" && depth === 0) cut = i;
  }
  return { variants: token.slice(0, cut + 1), utility: token.slice(cut + 1) };
}

function findDeprecated(text: string): { found: string; replacement: string }[] {
  const results: { found: string; replacement: string }[] = [];

  for (const token of text.split(/\s+/)) {
    if (!token) continue;
    const { variants, utility } = splitVariants(token);
    // Tailwind v4 puts `!` at the end; v3 put it at the start.
    const leading = utility.startsWith("!") ? "!" : "";
    const trailing = !leading && utility.endsWith("!") ? "!" : "";
    const match = UTILITY.exec(utility.slice(leading.length, utility.length - trailing.length));
    if (!match) continue;
    const [, prefix, name, opacity] = match;
    const replacement = replaceUtility(
      prefix,
      name,
      opacity === undefined ? undefined : Number(opacity),
    );
    results.push({ found: token, replacement: `${variants}${leading}${replacement}${trailing}` });
  }

  for (const [name] of text.matchAll(CSS_VARIABLE_CANDIDATE)) {
    if (DEPRECATED_VARIABLE.test(name)) {
      results.push({ found: name, replacement: replaceVariable(name) });
    }
  }

  return results;
}

export const noDeprecatedTokens = {
  meta: {
    type: "suggestion" as const,
    docs: {
      description:
        "Warn when code uses a deprecated AppShell colour or typography token, and name the replacement.",
    },
    schema: [],
    messages: {
      deprecatedToken:
        "`{{found}}` is deprecated and will be removed in the next major version of AppShell. Use `{{replacement}}`. See the 1.17.0 and 1.18.0 notes in the AppShell migration guide.",
    },
  },
  create(context: RuleContext) {
    function check(node: Node | TemplateElementNode, text: string) {
      for (const data of findDeprecated(text)) {
        context.report({ node, messageId: "deprecatedToken", data });
      }
    }

    return {
      Literal(node: Node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node: TemplateElementNode) {
        check(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};
