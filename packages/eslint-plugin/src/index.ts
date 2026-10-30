import { noAstwPrefix } from "./rules/no-astw-prefix";
import { noDeprecatedTokens } from "./rules/no-deprecated-tokens";
import { noReactRouterImports } from "./rules/no-react-router-imports";

export const plugin = {
  meta: { name: "@tailor-platform/app-shell" },
  rules: {
    "no-astw-prefix": noAstwPrefix,
    "no-deprecated-tokens": noDeprecatedTokens,
    "no-react-router-imports": noReactRouterImports,
  },
};

export const recommended = {
  jsPlugins: ["@tailor-platform/eslint-plugin-app-shell"],
  rules: {
    "@tailor-platform/app-shell/no-astw-prefix": "error",
    "@tailor-platform/app-shell/no-deprecated-tokens": "warn",
    "@tailor-platform/app-shell/no-react-router-imports": "error",
  },
};

export { noAstwPrefix } from "./rules/no-astw-prefix";
export { noDeprecatedTokens } from "./rules/no-deprecated-tokens";
export { noReactRouterImports } from "./rules/no-react-router-imports";
export default plugin;
