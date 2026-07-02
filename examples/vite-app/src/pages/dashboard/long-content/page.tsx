import { Layout, type AppShellPageProps } from "@tailor-platform/app-shell";
import { ScrollText } from "lucide-react";

// Deliberately long page WITHOUT `fill` on <Layout>: content grows naturally
// and the AppShell content area scrolls. This exists to confirm that regular
// pages still scroll correctly now that the shell itself is viewport-bounded
// (h-svh + overflow-y-auto on the content area) — compare with /dashboard/
// products where <Layout fill> pins the chrome and scrolls the table rows.
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

const LongContentPage = () => {
  return (
    <Layout>
      <Layout.Header title="Long Content" />
      <Layout.Column>
        <p className="text-sm text-muted-foreground">
          A long page without <code className="bg-muted rounded px-1">fill</code> — the content area
          scrolls, not the page body. Scroll down: the sidebar and breadcrumb bar stay put.
        </p>
        {SECTIONS.map((title, i) => (
          <section key={title} className="rounded-md border border-border bg-card p-6">
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
