type Node = {
  value?: unknown;
};

type RuleContext = {
  report(problem: { node: Node; messageId: "noAstwPrefix" }): void;
};

const ASTW_PREFIX = /(?:^|\s)astw:/;

export const noAstwPrefix = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow AppShell's internal astw: CSS prefix in consumer code.",
    },
    schema: [],
    messages: {
      noAstwPrefix:
        "astw: is AppShell's internal compiled CSS prefix. Use standard Tailwind utilities on your own markup and documented component props for AppShell layout.",
    },
  },
  create(context: RuleContext) {
    return {
      Literal(node: Node) {
        if (typeof node.value === "string" && ASTW_PREFIX.test(node.value)) {
          context.report({ node, messageId: "noAstwPrefix" });
        }
      },
    };
  },
};
