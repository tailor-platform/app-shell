import { describe, expect, it } from "vitest";

import { unmanagedOutputs } from "./tree";

const managed = ["docs/components/badge.md", "docs/api/guards/hidden.md", "docs/quickstart.md"];

describe("unmanagedOutputs", () => {
  it("accepts a tree where every file traces back to an outline", () => {
    expect(unmanagedOutputs(managed, managed)).toEqual([]);
  });

  it("flags a doc hand-authored straight into the generated tree", () => {
    // app-shell#559: an agent wrote docs/components/toolbar.md with no outline.
    expect(unmanagedOutputs([...managed, "docs/components/toolbar.md"], managed)).toEqual([
      "docs/components/toolbar.md",
    ]);
  });

  it("flags a file in a directory the pipeline never writes to", () => {
    expect(unmanagedOutputs([...managed, "docs/notes/scratch.md"], managed)).toEqual([
      "docs/notes/scratch.md",
    ]);
  });

  it("treats a root guide as managed — it is a unit like any other", () => {
    expect(unmanagedOutputs(["docs/quickstart.md"], managed)).toEqual([]);
  });

  it("reports every offender, sorted", () => {
    expect(unmanagedOutputs([...managed, "docs/z.md", "docs/a.md"], managed)).toEqual([
      "docs/a.md",
      "docs/z.md",
    ]);
  });
});
