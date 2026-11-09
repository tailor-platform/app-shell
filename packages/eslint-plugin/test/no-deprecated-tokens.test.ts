import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import { noDeprecatedTokens } from "../src/rules/no-deprecated-tokens";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

function error(found: string, replacement: string) {
  return { messageId: "deprecatedToken" as const, data: { found, replacement } };
}

ruleTester.run("no-deprecated-tokens", noDeprecatedTokens, {
  valid: [
    'const view = <Button variant="destructive">Delete</Button>;',
    'const action = { variant: "destructive" };',
    'const view = <p className="text-danger-text">Failed</p>;',
    'const view = <div className="bg-success-surface border-success-border" />;',
    'const style = { color: "var(--danger-solid)" };',
    'const view = <div className="status-row text-muted-foreground" />;',
    'const copy = "This is a destructive action.";',
    "const classes = cn(`flex ${gap} bg-danger-surface`);",
    'const style = { color: "var(--destructive-ring)" };',
  ],
  invalid: [
    {
      code: 'const view = <p className="text-sm text-destructive">Failed</p>;',
      errors: [error("text-destructive", "text-danger-text")],
    },
    {
      code: 'const view = <div className="bg-destructive/10 border-destructive/30" />;',
      errors: [
        error("bg-destructive/10", "bg-danger-surface"),
        error("border-destructive/30", "border-danger-border"),
      ],
    },
    {
      code: 'const view = <button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" />;',
      errors: [
        error("bg-destructive", "bg-danger-solid"),
        error("text-destructive-foreground", "text-danger-contrast"),
        error("hover:bg-destructive/90", "hover:bg-danger-solid"),
      ],
    },
    {
      code: 'const classes = cn("ring-2", invalid && "ring-destructive");',
      errors: [error("ring-destructive", "ring-danger-solid")],
    },
    {
      code: 'const view = <span className="bg-status-completed text-status-neutral" />;',
      errors: [
        error("bg-status-completed", "bg-success-solid"),
        error("text-status-neutral", "text-info-text"),
      ],
    },
    {
      code: 'const view = <div className="bg-status-attention/10 dark:border-status-default/30" />;',
      errors: [
        error("bg-status-attention/10", "bg-warning-surface"),
        error("dark:border-status-default/30", "dark:border-neutral-border"),
      ],
    },
    {
      code: 'const view = <span className="bg-status-default text-status-default border-status-default/60" />;',
      errors: [
        error("bg-status-default", "bg-neutral-indicator"),
        error("text-status-default", "text-neutral-indicator"),
        error("border-status-default/60", "border-neutral-indicator"),
      ],
    },
    {
      code: 'const view = <div className="bg-alert-error-background text-alert-warning-foreground" />;',
      errors: [
        error("bg-alert-error-background", "bg-danger-surface"),
        error("text-alert-warning-foreground", "text-warning-text"),
      ],
    },
    {
      code: 'const view = <p className="text-alert-neutral-foreground-muted" />;',
      errors: [error("text-alert-neutral-foreground-muted", "text-muted-foreground")],
    },
    {
      code: 'const view = <p className="text-destructive!" />;',
      errors: [error("text-destructive!", "text-danger-text!")],
    },
    {
      code: 'const style = { color: "var(--status-danger)", borderColor: "var(--destructive)" };',
      errors: [
        error("--status-danger", "--danger-solid"),
        error("--destructive", "--danger-solid"),
      ],
    },
    {
      code: 'const style = { fontSize: "var(--app-shell-type-body-md-size)" };',
      errors: [error("--app-shell-type-body-md-size", "--type-body-md-size")],
    },
    {
      code: 'const view = <div className="[color:var(--status-default)]" />;',
      errors: [error("--status-default", "--neutral-indicator")],
    },
    {
      code: "const classes = cn(`flex ${gap} text-destructive`);",
      errors: [error("text-destructive", "text-danger-text")],
    },
  ],
});
