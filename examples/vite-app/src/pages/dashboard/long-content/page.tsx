import {
  Button,
  Layout,
  useAppShellScrollContainer,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { ScrollText } from "lucide-react";
import { useEffect, useState } from "react";

// Deliberately long page WITHOUT `fill` on <Layout>: content grows naturally
// and the AppShell content area scrolls. This exists to confirm that regular
// pages still scroll correctly now that the shell itself is viewport-bounded
// (h-svh + overflow-y-auto on the content area) — compare with /dashboard/
// products where <Layout fill> pins the chrome and scrolls the table rows.
//
// It also doubles as a live check that `useAppShellScrollContainer()` gives a
// consumer the handle it needs for what used to be `window` scroll: reading
// scrollTop (the HUD), listening to scroll events, and driving imperative
// scroll commands (the buttons) — the supported replacement for the code that
// PR #350 would otherwise break.
const SECTIONS = [
  "Overview",
  "Getting Started",
  "Architecture",
  "Configuration",
  "Data Fetching",
  "Routing",
  "Authentication",
  "Theming",
  "Internationalization",
  "Testing",
  "Deployment",
  "Troubleshooting",
];

const sectionId = (title: string) => `section-${title.toLowerCase().replace(/\s+/g, "-")}`;

const LongContentPage = () => {
  const scrollRef = useAppShellScrollContainer();
  const [progress, setProgress] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Live scroll HUD — subscribes to the content container's scroll events.
  // This is exactly the pattern a scroll-spy (e.g. omakase's SectionTabs)
  // would use after migrating off `window.addEventListener("scroll", …)`.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setScrollTop(el.scrollTop);
      setProgress(max > 0 ? Math.round((el.scrollTop / max) * 100) : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  // Imperative scroll command on the container (was `window.scrollTo`).
  const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });

  // Container-relative jump — the correct migration of the getBoundingClientRect
  // + window.scrollY pattern: measure the target against the scroll container
  // instead of the (no-longer-scrolling) document.
  const scrollToSection = (title: string) => {
    const el = scrollRef.current;
    const target = document.getElementById(sectionId(title));
    if (!el || !target) return;
    const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    el.scrollTo({ top: Math.max(top - 8, 0), behavior: "smooth" });
  };

  return (
    <Layout>
      <Layout.Header
        title="Long Content"
        actions={[
          <Button key="top" variant="outline" onClick={scrollToTop}>
            Scroll to top
          </Button>,
          <Button key="jump" onClick={() => scrollToSection("Deployment")}>
            Jump to Deployment
          </Button>,
        ]}
      />
      <Layout.Column>
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-md border border-border bg-card/80 px-3 py-2 text-sm backdrop-blur">
          <span className="font-medium">Content scroll:</span>
          <span className="tabular-nums text-muted-foreground">
            {progress}% · {Math.round(scrollTop)}px
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          A long page without <code className="bg-muted rounded px-1">fill</code> — the content area
          scrolls, not the page body. The HUD above reads live from{" "}
          <code className="bg-muted rounded px-1">useAppShellScrollContainer()</code>; the header
          buttons drive it imperatively.
        </p>
        {SECTIONS.map((title, i) => (
          <section
            key={title}
            id={sectionId(title)}
            className="rounded-md border border-border bg-card p-6"
          >
            <h2 className="mb-2 text-lg font-semibold">
              {i + 1}. {title}
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p className="mb-3 text-sm text-muted-foreground">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
              officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus
              error sit voluptatem accusantium doloremque laudantium.
            </p>
            <p className="text-sm text-muted-foreground">
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
              consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro
              quisquam est, qui dolorem ipsum quia dolor sit amet.
            </p>
          </section>
        ))}
        <p className="pb-4 text-sm font-medium">
          🏁 End of page — if you can read this after scrolling, the content area scrolled
          correctly.
        </p>
      </Layout.Column>
    </Layout>
  );
};

LongContentPage.appShellPageProps = {
  meta: {
    title: "Long Content",
    icon: <ScrollText />,
  },
} satisfies AppShellPageProps;

export default LongContentPage;
