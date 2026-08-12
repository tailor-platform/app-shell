# Decision: page-level control of `SidebarLayout` body columns

> Status: **Open — options below, recommendation is Option B.**
> Context: follow-up to the `body` slot ([#1643](https://github.com/tailor-inc/platform-planning/issues/1643)).

## Problem

`body` is configured once, at app level, where `<SidebarLayout>` is rendered. But both
field reports that motivated it are **page-level**:

- [knowledge#312](https://github.com/tailor-professional-service/knowledge/discussions/312) — a TOC rail on the manuals page
- [knowledge#345](https://github.com/tailor-professional-service/knowledge/discussions/345) — a chat panel on the supplier-evaluation page

So a page can't contribute a column; only the shell can. Something has to bridge that gap.

**Constraint worth naming up front:** both panels need _page_ state. The TOC tracks which
document is selected and which nodes are expanded; the chat panel is scoped to the supplier
being evaluated. Any option that renders the panel outside the page's React tree forces that
state up into the shell or into a second data fetch.

## Option A — Route-aware body (works today, no new API)

The body component branches on `useLocation()`. This is what `examples/vite-app/src/panels-body.tsx` does.

```tsx
const AppBody = () => {
  const { pathname } = useLocation();
  return (
    <>
      {pathname === "/manuals" && <TocRail />}
      <SidebarLayout.ContentContainer header={<SidebarLayout.DefaultHeader />}>
        <SidebarLayout.Outlet />
      </SidebarLayout.ContentContainer>
    </>
  );
};
```

- **For:** zero new API, ships today, fully explicit, easy to reason about.
- **Against:** shell config accumulates knowledge of page routes; route strings get duplicated
  and drift; the panel lives far from the page that owns it; the branch grows with every page;
  page state has to be lifted into the shell or threaded through a bespoke context.
- **Fits:** app-wide or coarse-grained panels (a global assistant, a nav rail for one section).

## Option B — Portal slot component (recommended)

`SidebarLayout` renders empty dock containers as flex siblings of `ContentContainer`. A page
renders `<SidePanel>` anywhere in its own tree; it portals into the dock.

```tsx
export default function ManualsPage() {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <SidePanel side="left" width={280}>
        <TocTree selected={selected} onSelect={setSelected} />
      </SidePanel>
      <Layout>…</Layout>
    </>
  );
}
```

- **For:** the page owns its panel; it mounts and unmounts with navigation automatically; no
  shell config at all. React portals preserve context from where they're _declared_, so page
  state and context flow into the panel with no lifting — which is exactly what both reports need.
- **Against:** new public component; portal indirection to explain; needs a defined ordering rule
  when two panels claim the same side; renders nothing on the first SSR pass (no hydration
  mismatch — server and first client render both produce `null`).

## Option C — Declare panels in page metadata

Pages declare panels alongside their existing meta; the shell reads the matched route and renders them.

```tsx
ManualsPage.appShellPageProps = {
  meta: { title: "Manuals" },
  panels: { left: TocRail },
} satisfies AppShellPageProps;
```

- **For:** declarative, fits the existing module/resource system, no portal, shell keeps full
  control of layout.
- **Against:** the panel renders **outside** the page's tree, so it can't see page state — it
  needs its own fetching and its own state, or a shared store. That's disqualifying for both
  reported cases. Also static component references only, so no props from the page.
- **Fits:** genuinely static, self-sufficient rails.

## Rejected — imperative registration hook

`usePagePanel({ side, children })`, with the shell rendering whatever pages register. This is a
worse portal: passing nodes through context state means they reconcile against the _shell's_
tree, so panel children remount whenever the shell re-renders, and registration during render
is a setState-in-render hazard. Option B gets the same ergonomics with correct semantics.

## Recommendation

**Option B**, keeping **Option A** as the supported path for app-wide panels — they compose
fine, since a portal-based `SidePanel` and a route-aware body are both just children of the
same flex row.

The deciding factor is the page-state constraint: B is the only option where the panel sits in
the page's React tree, and both reported panels are stateful and page-scoped. C is worth
revisiting only if a static-rail use case shows up that A doesn't already cover.

Not urgent — `body` unblocks both reports today via Option A. This is about whether the
ergonomics are good enough that consumers stop hand-rolling, which is the actual goal.
