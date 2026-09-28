import {
  AppShell,
  DefaultSidebar,
  defineModule,
  defineResource,
  SidebarLayout,
} from "@tailor-platform/app-shell";

import { DocPage } from "./_lib/DocPage";
import { type DocUnit, units } from "./docs";
import HomePage from "./pages/page";

// Declarative routing: the module/resource tree is derived from the same
// manifest the renderer already consumes (see docs.tsx). This dogfoods the
// declarative `modules` API — file-based routing is exercised by
// examples/vite-app — and lets docs-kit stop generating route stubs.

type Res = ReturnType<typeof defineResource>;

const CATEGORY_LABEL: Record<string, string> = {
  concepts: "Concepts",
  components: "Components",
  patterns: "Patterns",
  pages: "Pages",
  api: "API",
};
// Sidebar order; any category not listed falls to the end alphabetically.
const CATEGORY_ORDER = ["concepts", "components", "patterns", "pages", "api"];

function titleOf(u: DocUnit): string {
  return u.title ?? u.slug;
}

/** Build a category's resources, nesting slugs that carry a `/` (e.g.
 * `guards/hidden`) under a component-less grouping resource. */
function buildResources(catUnits: DocUnit[]): Res[] {
  const roots: Res[] = [];
  const groups = new Map<string, Res[]>();
  for (const u of catUnits.toSorted((a, b) => a.slug.localeCompare(b.slug))) {
    const segments = u.slug.split("/");
    const leaf = defineResource({
      path: segments.at(-1) ?? u.slug,
      component: () => <DocPage slug={u.slug} />,
      meta: { title: titleOf(u) },
    });
    if (segments.length === 1) {
      roots.push(leaf);
      continue;
    }
    const group = segments[0];
    const subs = groups.get(group) ?? [];
    subs.push(leaf);
    groups.set(group, subs);
  }
  for (const [group, subResources] of groups) {
    roots.push(
      defineResource({
        path: group,
        meta: { title: group.charAt(0).toUpperCase() + group.slice(1) },
        subResources,
      }),
    );
  }
  return roots;
}

function buildModules(): ReturnType<typeof defineModule>[] {
  const byCategory = new Map<string, DocUnit[]>();
  for (const u of units) {
    const list = byCategory.get(u.category) ?? [];
    list.push(u);
    byCategory.set(u.category, list);
  }
  const order = (c: string): number => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...byCategory.keys()]
    .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
    .map((category) =>
      defineModule({
        path: category,
        meta: { title: CATEGORY_LABEL[category] ?? category },
        resources: buildResources(byCategory.get(category) ?? []),
      }),
    );
}

const App = () => {
  return (
    <AppShell title="app-shell docs" modules={buildModules()} rootComponent={HomePage}>
      <SidebarLayout sidebar={<DefaultSidebar />} />
    </AppShell>
  );
};

export default App;
