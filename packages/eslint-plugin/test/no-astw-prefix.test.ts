import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noAstwPrefix } from "../src/rules/no-astw-prefix";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

ruleTester.run("no-astw-prefix", noAstwPrefix, {
  valid: [
    'const view = <div className="px-6" />;',
    'const view = <Table.Root containerClassName="px-6" />;',
    'const classes = cn("px-6", active && "bg-primary");',
    'const copy = "AppShell styles are internal";',
  ],
  invalid: [
    {
      code: 'const view = <div className="astw:px-6" />;',
      errors: [{ messageId: "noAstwPrefix" }],
    },
    {
      code: 'const view = <Table.Root containerClassName="astw:px-6" />;',
      errors: [{ messageId: "noAstwPrefix" }],
    },
    {
      code: 'const classes = cn("flex", active && "astw:bg-primary");',
      errors: [{ messageId: "noAstwPrefix" }],
    },
  ],
});
