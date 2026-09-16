type ImportDeclaration = {
  source: { value: unknown };
};

type RuleContext = {
  report(problem: { node: ImportDeclaration; messageId: "noReactRouterImports" }): void;
};

const ROUTER_PACKAGES = new Set(["react-router", "react-router-dom"]);

export const noReactRouterImports = {
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow direct imports from React Router.",
    },
    schema: [],
    messages: {
      noReactRouterImports:
        'Import router APIs from "@tailor-platform/app-shell". AppShell owns the router boundary.',
    },
  },
  create(context: RuleContext) {
    return {
      ImportDeclaration(node: ImportDeclaration) {
        if (typeof node.source.value !== "string" || !ROUTER_PACKAGES.has(node.source.value))
          return;

        context.report({ node, messageId: "noReactRouterImports" });
      },
    };
  },
};
