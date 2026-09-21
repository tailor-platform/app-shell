import { describe, expect, it } from "vitest";

import { validateFrontmatter } from "./outline";

const valid = {
  kind: "code-backed",
  group: "badge",
  title: "Badge",
  description: "Status labels",
  sources: ["packages/core/src/components/badge/**"],
};

const messages = (data: unknown): string[] =>
  validateFrontmatter(data, "docs-src/components/badge.docs.outline.md").map((f) => f.message);

describe("validateFrontmatter", () => {
  it("accepts a well-formed code-backed outline", () => {
    expect(validateFrontmatter(valid, "x")).toEqual([]);
  });

  it("accepts a prose unit that claims re-exports", () => {
    const fm = {
      kind: "prose",
      group: "react-router",
      title: "React Router",
      description: "Re-exported routing primitives",
      upstream: "https://reactrouter.com/",
      claims: ["useNavigate"],
    };
    expect(validateFrontmatter(fm, "x")).toEqual([]);
  });

  it("accepts claims alongside sources — the two are orthogonal", () => {
    expect(validateFrontmatter({ ...valid, claims: ["CalendarDate"] }, "x")).toEqual([]);
  });

  it("blocks when kind is absent", () => {
    const { kind: _kind, ...rest } = valid;
    expect(messages(rest)).toContain("`kind` is required — declare `code-backed` or `prose`.");
  });

  it("blocks an unrecognised kind", () => {
    expect(messages({ ...valid, kind: "reference" })).toContain(
      "`kind: reference` is not valid — use `code-backed` or `prose`.",
    );
  });

  // The load-bearing rule: without it a unit silently loses its type-surface
  // gate and only the (advisory) coverage check would notice.
  it("blocks a code-backed unit with no sources", () => {
    const { sources: _sources, ...rest } = valid;
    expect(messages(rest)).toEqual([
      "`kind: code-backed` requires a non-empty `sources` list — otherwise the unit has no type-surface gate.",
    ]);
    expect(messages({ ...valid, sources: [] })).toHaveLength(1);
  });

  it("blocks sources on a prose unit", () => {
    expect(messages({ ...valid, kind: "prose" })).toEqual([
      "`sources` is set on a prose unit — declare `kind: code-backed` or remove the globs.",
    ]);
  });

  it("blocks an unknown key rather than ignoring it", () => {
    expect(messages({ ...valid, sourcs: ["oops"] })).toContain(
      "unknown frontmatter key `sourcs` — not part of the outline schema.",
    );
  });

  it("admits the pattern/page presentation metadata", () => {
    const fm = {
      kind: "prose",
      group: "form-composer",
      title: "Composer",
      description: "Free-text composer",
      slug: "pattern/form/composer",
      name: "Composer",
      category: "pattern",
      subcategory: "form",
      requiredImports: ["Card"],
      tags: ["composer"],
      do: ["a"],
      dont: ["b"],
    };
    expect(validateFrontmatter(fm, "x")).toEqual([]);
  });

  it.each(["group", "title", "description"])("blocks when %s is missing", (key) => {
    const fm: Record<string, unknown> = { ...valid };
    delete fm[key];
    expect(messages(fm)).toContain(`\`${key}\` is required and must be a non-empty string.`);
  });

  it("blocks when required strings are blank", () => {
    expect(messages({ ...valid, title: "   " })).toContain(
      "`title` is required and must be a non-empty string.",
    );
  });

  it("blocks malformed list fields", () => {
    expect(messages({ ...valid, claims: "useNavigate" })).toContain(
      "`claims` must be a list of exported symbol names.",
    );
    expect(messages({ ...valid, sources: "glob" })).toContain("`sources` must be a list of globs.");
  });

  it("blocks missing frontmatter", () => {
    expect(messages(null)).toEqual(["frontmatter is missing or not a mapping."]);
  });
});
