import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { preferTextComponents } from "../src/rules/prefer-text-components";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

function element(name: string, found: string, role: string) {
  return { messageId: "useTextElement" as const, data: { element: name, found, role } };
}

function span(found: string) {
  return { messageId: "useTextSpan" as const, data: { element: "span", found, role: "label-md" } };
}

ruleTester.run("prefer-text-components", preferTextComponents, {
  valid: [
    // The element components and Text itself.
    'const view = <Text.p className="text-sm">Note</Text.p>;',
    'const view = <Text variant="body-sm" className="text-xs">Note</Text>;',
    // Role utilities and the allowed modifiers.
    'const view = <p className="text-body-sm text-muted-foreground">Note</p>;',
    'const view = <span className="text-label-md tabular-nums uppercase">Total</span>;',
    'const view = <span className="font-semibold">Overdue</span>;',
    'const view = <h3 className="font-medium leading-none tracking-tight">Title</h3>;',
    // Other elements are out of scope.
    'const view = <div className="text-sm">Note</div>;',
    'const view = <label className="text-sm">Name</label>;',
    'const view = <th className="text-xs">Amount</th>;',
    // Colours and other `text-*` utilities are not sizes.
    'const view = <p className="text-center text-destructive text-[#ff0000] text-[var(--brand)] text-wrap">Note</p>;',
    // A component named like an element is not a plain element.
    'const view = <Paragraph.p className="text-sm">Note</Paragraph.p>;',
    // Only className is read.
    'const view = <p data-size="text-sm" title="text-xs">Note</p>;',
    // Only a class string written directly in className is read. Expressions are out of scope.
    'const view = <p className={cn("text-sm", muted && "text-muted-foreground")}>Note</p>;',
    'const view = <p className={clsx(compact ? "text-xs" : "text-sm")}>Note</p>;',
    'const view = <p className={compact ? "text-xs" : "text-sm"}>Note</p>;',
    "const view = <p className={noteClass}>Note</p>;",
    "const view = <p className={`text-xs ${tone}`}>Note</p>;",
    // A size outside a className.
    'const size = "text-sm";',
  ],
  invalid: [
    {
      code: 'const view = <p className="text-sm text-muted-foreground">Note</p>;',
      errors: [element("p", "text-sm", "body-md")],
    },
    {
      code: 'const view = <h1 className="text-2xl font-bold">Orders</h1>;',
      errors: [element("h1", "text-2xl", "heading-lg")],
    },
    {
      code: 'const view = <h2 className="text-lg font-semibold">Summary</h2>;',
      errors: [element("h2", "text-lg", "heading-md")],
    },
    {
      code: 'const view = <h3 className="text-sm font-medium">Line items</h3>;',
      errors: [element("h3", "text-sm", "heading-sm")],
    },
    {
      code: 'const view = <h6 className="text-base">Notes</h6>;',
      errors: [element("h6", "text-base", "heading-sm")],
    },
    {
      code: 'const view = <span className="text-xs text-muted-foreground">Draft</span>;',
      errors: [span("text-xs")],
    },
    {
      code: 'const view = <span className="font-semibold text-sm">Overdue</span>;',
      errors: [span("text-sm")],
    },
    {
      // Variants, important, line-height shorthand and arbitrary sizes.
      code: 'const view = <p className="md:text-base !text-sm text-xs! text-sm/6 text-[11px] text-[0.75rem] text-[length:var(--size)]">Note</p>;',
      errors: [
        element(
          "p",
          "md:text-base !text-sm text-xs! text-sm/6 text-[11px] text-[0.75rem] text-[length:var(--size)]",
          "body-md",
        ),
      ],
    },
    {
      code: 'const view = <p className={"text-xs"}>Note</p>;',
      errors: [element("p", "text-xs", "body-md")],
    },
    {
      code: "const view = <p className={`text-xs text-muted-foreground`}>Note</p>;",
      errors: [element("p", "text-xs", "body-md")],
    },
    {
      // Each element is reported once, at its own name.
      code: 'const view = <h2 className="text-lg"><span className="text-xs">New</span></h2>;',
      errors: [element("h2", "text-lg", "heading-md"), span("text-xs")],
    },
  ],
});
