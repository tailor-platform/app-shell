import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cn } from "./utils";

const defaultTheme = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../assets/themes/default.css"),
  "utf8",
);
const roles = [
  ...new Set([...defaultTheme.matchAll(/^\s*--app-shell-type-([a-z-]+)-size:/gm)].map((m) => m[1])),
];

describe("cn", () => {
  it("keeps a typography role next to a text color", () => {
    expect(roles.length).toBeGreaterThan(0);
    for (const role of roles) {
      expect(cn(`text-${role}`, "text-muted-foreground"), role).toBe(
        `text-${role} text-muted-foreground`,
      );
    }
  });

  it("keeps a typography role next to font-mono", () => {
    expect(cn("text-code-sm font-mono", "text-muted-foreground")).toBe(
      "text-code-sm font-mono text-muted-foreground",
    );
  });

  it("keeps leading-none only when it comes after the role", () => {
    // Same behavior as a stock size such as text-lg: a size class drops an earlier leading class.
    expect(cn("text-heading-md", "leading-none")).toBe("text-heading-md leading-none");
    expect(cn("leading-none", "text-heading-md")).toBe("text-heading-md");
  });

  it("lets a later role or stock font size replace an earlier one", () => {
    expect(cn("text-body-md", "text-heading-lg")).toBe("text-heading-lg");
    expect(cn("text-label-md", "text-sm")).toBe("text-sm");
    expect(cn("text-sm", "text-label-md")).toBe("text-label-md");
  });

  it("still merges stock utilities", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-muted-foreground")).toBe("text-muted-foreground");
  });
});
