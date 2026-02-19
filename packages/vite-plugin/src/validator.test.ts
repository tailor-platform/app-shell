import { describe, it, expect } from "vitest";
import { Project } from "ts-morph";
import { s, validateAppShellPageProps, findAppShellPagePropsNode } from "./validator";

// ============================================
// Schema Builder Tests
// ============================================

describe("s.object", () => {
  it("creates an object schema", () => {
    const schema = s.object({
      title: s.string(),
    });
    expect(schema.type).toBe("object");
    expect(schema.isOptional).toBe(false);
    expect(schema.properties).toBeDefined();
    expect(schema.properties?.title.type).toBe("string");
  });

  it("supports optional modifier", () => {
    const schema = s.object({ title: s.string() }).optional();
    expect(schema.type).toBe("object");
    expect(schema.isOptional).toBe(true);
  });

  it("supports nested objects", () => {
    const schema = s.object({
      meta: s.object({
        title: s.string(),
        icon: s.any(),
      }),
    });
    expect(schema.properties?.meta.type).toBe("object");
    expect(schema.properties?.meta.properties?.title.type).toBe("string");
    expect(schema.properties?.meta.properties?.icon.type).toBe("any");
  });
});

describe("s.array", () => {
  it("creates an array schema", () => {
    const schema = s.array(s.string());
    expect(schema.type).toBe("array");
    expect(schema.isOptional).toBe(false);
    expect(schema.items?.type).toBe("string");
  });

  it("supports optional modifier", () => {
    const schema = s.array(s.any()).optional();
    expect(schema.type).toBe("array");
    expect(schema.isOptional).toBe(true);
  });
});

describe("s.string", () => {
  it("creates a string schema", () => {
    const schema = s.string();
    expect(schema.type).toBe("string");
    expect(schema.isOptional).toBe(false);
  });

  it("supports optional modifier", () => {
    const schema = s.string().optional();
    expect(schema.isOptional).toBe(true);
  });
});

describe("s.number", () => {
  it("creates a number schema", () => {
    const schema = s.number();
    expect(schema.type).toBe("number");
    expect(schema.isOptional).toBe(false);
  });
});

describe("s.boolean", () => {
  it("creates a boolean schema", () => {
    const schema = s.boolean();
    expect(schema.type).toBe("boolean");
    expect(schema.isOptional).toBe(false);
  });
});

describe("s.any", () => {
  it("creates an any schema", () => {
    const schema = s.any();
    expect(schema.type).toBe("any");
    expect(schema.isOptional).toBe(false);
  });
});

// ============================================
// AST Validation Tests
// ============================================

function createSourceFile(code: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile("test.tsx", code);
}

describe("findAppShellPagePropsNode", () => {
  it("finds appShellPageProps assignment", () => {
    const sourceFile = createSourceFile(`
      const Page = () => <div>Hello</div>;
      Page.appShellPageProps = {
        meta: { title: "Test" }
      };
      export default Page;
    `);
    const node = findAppShellPagePropsNode(sourceFile);
    expect(node).not.toBeNull();
  });

  it("returns null when no appShellPageProps", () => {
    const sourceFile = createSourceFile(`
      const Page = () => <div>Hello</div>;
      export default Page;
    `);
    const node = findAppShellPagePropsNode(sourceFile);
    expect(node).toBeNull();
  });

  it("returns null when appShellPageProps is not an object literal", () => {
    const sourceFile = createSourceFile(`
      const Page = () => <div>Hello</div>;
      Page.appShellPageProps = someVariable;
      export default Page;
    `);
    const node = findAppShellPagePropsNode(sourceFile);
    expect(node).toBeNull();
  });
});

describe("validateAppShellPageProps", () => {
  const testSchema = s.object({
    meta: s
      .object({
        title: s.any(),
        icon: s.any(),
      })
      .optional(),
    guards: s.array(s.any()).optional(),
    loader: s.any().optional(),
  });

  it("validates valid appShellPageProps", () => {
    const sourceFile = createSourceFile(`
      const Page = () => <div>Hello</div>;
      Page.appShellPageProps = {
        meta: { title: "Test", icon: null },
        guards: [],
        loader: async () => ({})
      };
      export default Page;
    `);
    const node = findAppShellPagePropsNode(sourceFile);
    expect(node).not.toBeNull();

    const warnings = validateAppShellPageProps(node!, testSchema, "test.tsx");
    expect(warnings).toHaveLength(0);
  });

  it("reports unknown top-level keys", () => {
    const sourceFile = createSourceFile(`
      const Page = () => <div>Hello</div>;
      Page.appShellPageProps = {
        meta: { title: "Test" },
        unknownKey: "value"
      };
      export default Page;
    `);
    const node = findAppShellPagePropsNode(sourceFile);
    const warnings = validateAppShellPageProps(node!, testSchema, "test.tsx");

    expect(warnings).toHaveLength(1);
    expect(warnings[0].key).toBe("unknownKey");
    expect(warnings[0].message).toContain("Unknown key");
    expect(warnings[0].validKeys).toEqual(["meta", "guards", "loader"]);
  });

  it("reports unknown nested keys in meta", () => {
    const sourceFile = createSourceFile(`
      const Page = () => <div>Hello</div>;
      Page.appShellPageProps = {
        meta: {
          title: "Test",
          invalidProp: "value"
        }
      };
      export default Page;
    `);
    const node = findAppShellPagePropsNode(sourceFile);
    const warnings = validateAppShellPageProps(node!, testSchema, "test.tsx");

    expect(warnings).toHaveLength(1);
    expect(warnings[0].key).toBe("invalidProp");
    expect(warnings[0].message).toContain("in meta");
    expect(warnings[0].validKeys).toEqual(["title", "icon"]);
  });

  it("reports multiple unknown keys", () => {
    const sourceFile = createSourceFile(`
      const Page = () => <div>Hello</div>;
      Page.appShellPageProps = {
        foo: "bar",
        baz: 123,
        meta: { title: "Test" }
      };
      export default Page;
    `);
    const node = findAppShellPagePropsNode(sourceFile);
    const warnings = validateAppShellPageProps(node!, testSchema, "test.tsx");

    expect(warnings).toHaveLength(2);
    expect(warnings.map((w) => w.key).sort()).toEqual(["baz", "foo"]);
  });

  it("handles empty appShellPageProps", () => {
    const sourceFile = createSourceFile(`
      const Page = () => <div>Hello</div>;
      Page.appShellPageProps = {};
      export default Page;
    `);
    const node = findAppShellPagePropsNode(sourceFile);
    const warnings = validateAppShellPageProps(node!, testSchema, "test.tsx");

    expect(warnings).toHaveLength(0);
  });

  it("handles deeply nested validation", () => {
    const deepSchema = s.object({
      level1: s.object({
        level2: s.object({
          validKey: s.any(),
        }),
      }),
    });

    const sourceFile = createSourceFile(`
      const Page = () => <div>Hello</div>;
      Page.appShellPageProps = {
        level1: {
          level2: {
            validKey: "ok",
            invalidKey: "bad"
          }
        }
      };
      export default Page;
    `);
    const node = findAppShellPagePropsNode(sourceFile);
    const warnings = validateAppShellPageProps(node!, deepSchema, "test.tsx");

    expect(warnings).toHaveLength(1);
    expect(warnings[0].key).toBe("invalidKey");
    expect(warnings[0].message).toContain("level1.level2");
  });

  it("includes file path in warnings", () => {
    const sourceFile = createSourceFile(`
      const Page = () => <div>Hello</div>;
      Page.appShellPageProps = {
        invalid: true
      };
      export default Page;
    `);
    const node = findAppShellPagePropsNode(sourceFile);
    const warnings = validateAppShellPageProps(
      node!,
      testSchema,
      "/path/to/page.tsx",
    );

    expect(warnings[0].file).toBe("/path/to/page.tsx");
  });
});
