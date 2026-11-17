import { type ReactNode, useState } from "react";
import {
  BookOpenIcon,
  CodeXmlIcon,
  ComponentIcon,
  LayersIcon,
  LightbulbIcon,
  PanelsTopLeftIcon,
} from "lucide-react";

import {
  AppearanceSwitcher,
  AppShell,
  defineModule,
  defineResource,
  GlobalHeaderLayout,
  Link,
  Select,
  SidebarGroup,
  SidebarItem,
  Text,
  useAppShell,
  useLocation,
} from "@tailor-platform/app-shell";

import { DocPage } from "./_lib/DocPage";
import { type DocUnit, units } from "./docs";
import HomePage from "./pages/page";
import { sectionForPath, sections } from "./sections";

// Declarative routing: the module/resource tree is derived from the same
// manifest the renderer already consumes (see docs.tsx). This dogfoods the
// declarative `modules` API — file-based routing is exercised by
// examples/vite-app — and lets docs-kit stop generating route stubs.

type Res = ReturnType<typeof defineResource>;

const CATEGORY_META: Record<string, { title: string; icon: ReactNode }> = {
  guides: { title: "Guides", icon: <BookOpenIcon /> },
  concepts: { title: "Concepts", icon: <LightbulbIcon /> },
  components: { title: "Components", icon: <ComponentIcon /> },
  patterns: { title: "Patterns", icon: <LayersIcon /> },
  pages: { title: "Pages", icon: <PanelsTopLeftIcon /> },
  api: { title: "API", icon: <CodeXmlIcon /> },
};
// Sidebar order; any category not listed falls to the end alphabetically.
const CATEGORY_ORDER = ["guides", "concepts", "components", "patterns", "pages", "api"];

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
        meta: CATEGORY_META[category] ?? { title: category },
        resources: buildResources(byCategory.get(category) ?? []),
      }),
    );
}

const modules = buildModules();

function ResourceItems({ resources, basePath }: { resources: Res[]; basePath: string }) {
  return resources.map((resource) => {
    const path = `${basePath}/${resource.path}`;
    return resource.subResources?.length ? (
      <SidebarGroup
        key={path}
        title={resource.meta.title}
        icon={resource.meta.icon}
        to={resource.component ? path : undefined}
      >
        <ResourceItems resources={resource.subResources} basePath={path} />
      </SidebarGroup>
    ) : (
      <SidebarItem key={path} to={path} />
    );
  });
}

function DocsLayout() {
  const { title } = useAppShell();
  const { pathname } = useLocation();
  const [selection, setSelection] = useState(() => ({
    pathname,
    section: sectionForPath(pathname),
  }));

  // Follow document navigation without remounting the layout and resetting the sidebar.
  if (selection.pathname !== pathname) {
    setSelection({ pathname, section: sectionForPath(pathname) });
  }

  return (
    <GlobalHeaderLayout
      header={
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-4">
          <Link
            to="/"
            className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Text.span variant="heading-sm">{title}</Text.span>
          </Link>
          <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Select.Parts.Root
              value={selection.section}
              itemToStringLabel={(section) => section.label}
              onValueChange={(section) => {
                if (section) setSelection({ pathname, section });
              }}
            >
              <Select.Parts.Trigger aria-label="Documentation section" className="min-w-0">
                <Select.Parts.Value className="truncate" />
              </Select.Parts.Trigger>
              <Select.Parts.Content className="min-w-56">
                {sections.map((section) => (
                  <Select.Parts.Item key={section.label} value={section}>
                    {section.label}
                  </Select.Parts.Item>
                ))}
              </Select.Parts.Content>
            </Select.Parts.Root>
          </div>
          <div className="hidden min-w-0 flex-1 overflow-hidden sm:block">
            <GlobalHeaderLayout.Breadcrumb />
          </div>
          <div className="ml-auto shrink-0">
            <AppearanceSwitcher />
          </div>
        </header>
      }
      sidebar={
        <GlobalHeaderLayout.DefaultSidebar>
          {modules
            .filter((module) => selection.section.categories.includes(module.path))
            .map((module) => (
              <SidebarGroup key={module.path} title={module.meta.title} icon={module.meta.icon}>
                <ResourceItems resources={module.resources} basePath={`/${module.path}`} />
              </SidebarGroup>
            ))}
        </GlobalHeaderLayout.DefaultSidebar>
      }
    />
  );
}

const App = () => {
  return (
    <AppShell title="AppShell Docs" modules={modules} rootComponent={HomePage}>
      <DocsLayout />
    </AppShell>
  );
};

export default App;
