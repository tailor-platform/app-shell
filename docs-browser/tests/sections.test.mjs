import assert from "node:assert/strict";
import { test } from "node:test";

import { sectionForPath, sections } from "../src/sections.ts";

test("the three sections partition all six documentation categories", () => {
  assert.deepEqual(
    sections.map((section) => section.categories),
    [
      ["guides", "concepts"],
      ["components", "api"],
      ["patterns", "pages"],
    ],
  );
});

test("document paths select their section, including nested API pages", () => {
  for (const [pathname, expected] of [
    ["/guides/introduction", sections[0]],
    ["/concepts/styling-theming", sections[0]],
    ["/components/button", sections[1]],
    ["/api/guards/hidden", sections[1]],
    ["/api/router/use-location", sections[1]],
    ["/patterns/form-composer", sections[2]],
    ["/pages/standard-page", sections[2]],
  ]) {
    assert.equal(sectionForPath(pathname), expected, pathname);
  }
});

test("home and unknown categories default to guides without partial-prefix matches", () => {
  for (const pathname of ["/", "/unknown/page", "/components-extra/button", "/apiary/page"]) {
    assert.equal(sectionForPath(pathname), sections[0], pathname);
  }
});
