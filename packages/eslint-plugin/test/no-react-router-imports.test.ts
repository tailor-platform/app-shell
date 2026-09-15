import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noReactRouterImports } from "../src/rules/no-react-router-imports";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

ruleTester.run("no-react-router-imports", noReactRouterImports, {
  valid: [
    'import { Link, useNavigate } from "@tailor-platform/app-shell";',
    'import type { LinkProps } from "@tailor-platform/app-shell";',
    'import { useState } from "react";',
  ],
  invalid: [
    {
      code: 'import { Link } from "react-router";',
      errors: [{ messageId: "noReactRouterImports" }],
    },
    {
      code: 'import type { NavigateFunction } from "react-router";',
      errors: [{ messageId: "noReactRouterImports" }],
    },
    {
      code: 'import { BrowserRouter } from "react-router-dom";',
      errors: [{ messageId: "noReactRouterImports" }],
    },
  ],
});
