import {
  Layout,
  useAppShellScrollContainer,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { Columns3 } from "lucide-react";
import { useEffect, useState } from "react";
import { PANEL_SECTIONS, sectionId } from "../../../panel-sections";

/**
 * Demo page for the `SidebarLayout` `body` slot (issue #1643).
 *
 * The two extra columns are contributed by `PanelsBody` in `src/panels-body.tsx`
 * — the page itself is an ordinary page and knows nothing about them. It exists
 * to prove the content column still behaves normally when the body is ejected:
 * breadcrumb header, `md:px-8` inset padding, and a working
 * `useAppShellScrollContainer()`.
 */
const PanelsPage = () => {
  const scrollRef = useAppShellScrollContainer();
  const [scrollTop, setScrollTop] = useState<number | null>(null);

  // Regression check: the scroll container is now provided by ContentContainer
  // rather than SidebarLayout, so this must still resolve inside a `body`.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  return (
    <Layout>
      <Layout.Header title="Body slot demo" />
      <Layout.Column>
        <p className="rounded-md border bg-card p-3 text-sm">
          <strong>useAppShellScrollContainer():</strong>{" "}
          {scrollTop === null
            ? "not resolved ✗"
            : `resolved ✓ — scrollTop ${Math.round(scrollTop)}`}
        </p>
        {PANEL_SECTIONS.map((section) => (
          <section key={section} id={sectionId(section)} className="scroll-mt-4">
            <h2 className="text-lg font-semibold tracking-tight">{section}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Filler copy so the content column scrolls independently of the two side columns. The
              rail on the left and the assistant on the right stay put while this scrolls, and each
              has its own scrollbar.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Collapse the sidebar (⌘B) and every column reflows — they are flex siblings of the
              sidebar, so nothing is pinned to a hardcoded width.
            </p>
          </section>
        ))}
      </Layout.Column>
    </Layout>
  );
};

PanelsPage.appShellPageProps = {
  meta: {
    title: "Body Slot",
    icon: <Columns3 />,
  },
} satisfies AppShellPageProps;

export default PanelsPage;
