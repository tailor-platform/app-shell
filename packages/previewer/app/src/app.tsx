import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { MDXProvider } from "@mdx-js/react";
import { entries } from "virtual:previewer-entries";
import { title, repo } from "virtual:previewer-config";
import { mdxComponents } from "./mdx-components";
import { Overview } from "./overview";
import { ThemeProvider, ThemeToggle } from "./theme";

interface PreviewEntryFrontmatter {
  title?: string;
  description?: string;
  sidebar?: {
    group?: string;
    order?: number;
  };
  status?: "stable" | "beta" | "experimental" | "deprecated";
  hidden?: boolean;
  filePath?: string;
}

interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

interface PropsGroup {
  name: string;
  description?: string;
  props: PropInfo[];
}

interface PreviewEntry {
  name: string;
  Component: ComponentType;
  frontmatter: PreviewEntryFrontmatter;
  filePath: string;
  propsData: PropsGroup[];
}

interface SidebarGroup {
  name: string;
  order: number;
  entries: PreviewEntry[];
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  stable: { bg: "var(--status-stable-bg)", fg: "var(--status-stable-fg)" },
  beta: { bg: "var(--status-beta-bg)", fg: "var(--status-beta-fg)" },
  experimental: {
    bg: "var(--status-experimental-bg)",
    fg: "var(--status-experimental-fg)",
  },
  deprecated: {
    bg: "var(--status-deprecated-bg)",
    fg: "var(--status-deprecated-fg)",
  },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? {
    bg: "var(--code-bg)",
    fg: "var(--fg)",
  };
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        padding: "1px 6px",
        borderRadius: 4,
        backgroundColor: colors.bg,
        color: colors.fg,
        lineHeight: "18px",
      }}
    >
      {status}
    </span>
  );
}

function buildCodeUrl(entry: PreviewEntry): string | null {
  if (!repo) return null;

  const fp = entry.frontmatter.filePath;
  const path = fp ?? entry.filePath;

  return `${repo.url}/blob/${repo.ref}/${path.replace(/^\/+/, "")}`;
}

function useGroupedEntries(entries: PreviewEntry[]) {
  return useMemo(() => {
    const visible = entries.filter((e) => !e.frontmatter.hidden);
    const groupMap = new Map<string, SidebarGroup>();

    for (const entry of visible) {
      const groupName = entry.frontmatter.sidebar?.group ?? "Ungrouped";
      let group = groupMap.get(groupName);
      if (!group) {
        group = {
          name: groupName,
          order: entry.frontmatter.sidebar?.order ?? 999,
          entries: [],
        };
        groupMap.set(groupName, group);
      }
      group.entries.push(entry);
    }

    for (const group of groupMap.values()) {
      group.entries.sort(
        (a, b) =>
          (a.frontmatter.sidebar?.order ?? 999) -
          (b.frontmatter.sidebar?.order ?? 999),
      );
    }

    return [...groupMap.values()].sort((a, b) => a.order - b.order);
  }, [entries]);
}

const OVERVIEW_KEY = "__overview__";

const groupHeadingStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--fg-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const sidebarItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
  textAlign: "left",
  padding: "6px 16px",
  fontSize: 14,
  border: "none",
  cursor: "pointer",
};

function Sidebar({
  groups,
  selected,
  onSelect,
}: {
  groups: SidebarGroup[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <nav
      style={{
        width: 220,
        borderRight: "1px solid var(--border)",
        padding: "12px 0",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      {/* General section */}
      <div>
        <div style={{ padding: "12px 16px 4px", ...groupHeadingStyle }}>
          General
        </div>
        <button
          onClick={() => onSelect(OVERVIEW_KEY)}
          style={{
            ...sidebarItemStyle,
            backgroundColor:
              selected === OVERVIEW_KEY
                ? "var(--sidebar-active)"
                : "transparent",
            fontWeight: selected === OVERVIEW_KEY ? 600 : 400,
          }}
        >
          Overview
        </button>
        <a
          href="/llms.txt"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...sidebarItemStyle,
            backgroundColor: "transparent",
            fontWeight: 400,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <span style={{ flex: 1 }}>LLMs.txt</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="var(--fg-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.5 1.5h7v7" />
            <path d="M10.5 1.5l-9 9" />
          </svg>
        </a>
      </div>

      {groups.map((group) => (
        <div key={group.name}>
          <div style={{ padding: "20px 16px 4px", ...groupHeadingStyle }}>
            {group.name}
          </div>
          {group.entries.map((entry) => (
            <button
              key={entry.name}
              onClick={() => onSelect(entry.name)}
              style={{
                ...sidebarItemStyle,
                backgroundColor:
                  selected === entry.name
                    ? "var(--sidebar-active)"
                    : "transparent",
                fontWeight: selected === entry.name ? 600 : 400,
              }}
            >
              <span style={{ flex: 1 }}>
                {entry.frontmatter.title ?? entry.name}
              </span>
              {entry.frontmatter.status && (
                <StatusBadge status={entry.frontmatter.status} />
              )}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

function PreviewHeader({
  entry,
  hideBorder,
}: {
  entry: PreviewEntry;
  hideBorder?: boolean;
}) {
  const { frontmatter } = entry;
  if (!frontmatter.title && !frontmatter.description && !frontmatter.status) {
    return null;
  }

  const codeUrl = buildCodeUrl(entry);

  return (
    <div
      style={{
        borderBottom: hideBorder ? "none" : "1px solid var(--border)",
        padding: "24px 60px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {frontmatter.title && (
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
            {frontmatter.title}
          </h1>
        )}
        {frontmatter.status && <StatusBadge status={frontmatter.status} />}
      </div>
      {frontmatter.description && (
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--fg-secondary)",
            lineHeight: 1.6,
          }}
        >
          {frontmatter.description}
        </p>
      )}
      {codeUrl && (
        <a
          href={codeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 12,
            fontSize: 13,
            color: "var(--fg-secondary)",
            textDecoration: "none",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          View source code
        </a>
      )}
    </div>
  );
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function useTableOfContents(
  containerRef: React.RefObject<HTMLDivElement | null>,
  contentKey: string,
) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Small delay to let content render
    const timeout = setTimeout(() => {
      const headings = container.querySelectorAll("h2[id], h3[id]");
      const tocItems: TocItem[] = Array.from(headings).map((el) => ({
        id: el.id,
        text: el.textContent ?? "",
        level: el.tagName === "H2" ? 2 : 3,
      }));
      setItems(tocItems);
      if (tocItems.length > 0) {
        setActiveId(tocItems[0].id);
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [containerRef, contentKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const handleScroll = () => {
      const headings = items
        .map(({ id }) => {
          const el = document.getElementById(id);
          return el ? { id, top: el.getBoundingClientRect().top } : null;
        })
        .filter(Boolean) as { id: string; top: number }[];

      // Find the last heading that has scrolled past the top
      let current = headings[0]?.id ?? null;
      for (const h of headings) {
        if (h.top <= 80) current = h.id;
      }
      setActiveId(current);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef, items]);

  return { items, activeId, setActiveId };
}

function TableOfContents({
  containerRef,
  contentKey,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  contentKey: string;
}) {
  const { items, activeId, setActiveId } = useTableOfContents(
    containerRef,
    contentKey,
  );

  if (items.length === 0) return null;

  return (
    <nav
      style={{
        padding: "32px 16px",
      }}
    >
      <div style={{ ...groupHeadingStyle, marginBottom: 12 }}>
        Table of contents
      </div>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveId(item.id);
            const el = document.getElementById(item.id);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          style={{
            display: "block",
            fontSize: 13,
            lineHeight: "20px",
            padding: "3px 0",
            paddingLeft: item.level === 3 ? 12 : 0,
            color: activeId === item.id ? "var(--fg)" : "var(--fg-secondary)",
            fontWeight: activeId === item.id ? 600 : 400,
            textDecoration: "none",
            borderLeft:
              activeId === item.id
                ? "2px solid var(--fg)"
                : "2px solid transparent",
            paddingInlineStart: item.level === 3 ? 20 : 8,
          }}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );
}

function PropsPanel({ propsData }: { propsData: PropsGroup[] }) {
  return (
    <div style={{ padding: "24px 60px", paddingBottom: 80 }}>
      {propsData.map((group) => {
        const slugId = `props-${group.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
        return (
          <div key={group.name} style={{ marginBottom: 40 }}>
            <h2
              id={slugId}
              style={{
                fontSize: 18,
                fontWeight: 600,
                margin: "0 0 8px",
                scrollMarginTop: 16,
              }}
            >
              {group.name}
            </h2>
            {group.description && (
              <p
                style={{
                  fontSize: 14,
                  color: "var(--fg-secondary)",
                  margin: "0 0 16px",
                  lineHeight: 1.5,
                }}
              >
                {group.description}
              </p>
            )}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr>
                  {["Name", "Type", "Default", "Description"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        borderBottom: "2px solid var(--border)",
                        fontWeight: 600,
                        fontSize: 13,
                        color: "var(--fg)",
                        width:
                          h === "Name"
                            ? "18%"
                            : h === "Type"
                              ? "25%"
                              : h === "Default"
                                ? "12%"
                                : "45%",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.props.map((prop) => (
                  <tr
                    key={prop.name}
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
                      <code
                        style={{
                          fontSize: 13,
                          backgroundColor: "var(--code-bg)",
                          padding: "2px 5px",
                          borderRadius: 4,
                        }}
                      >
                        {prop.name}
                      </code>
                    </td>
                    <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
                      <code
                        style={{
                          fontSize: 13,
                          backgroundColor: "var(--code-bg)",
                          padding: "2px 5px",
                          borderRadius: 4,
                          wordBreak: "break-word",
                        }}
                      >
                        {prop.type}
                      </code>
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        verticalAlign: "top",
                        color: prop.defaultValue
                          ? "var(--fg)"
                          : "var(--fg-muted)",
                      }}
                    >
                      {prop.defaultValue ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        verticalAlign: "top",
                        color: "var(--fg-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      {prop.description ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

type ContentTab = "documentation" | "props";

function PreviewContent({ entry }: { entry: PreviewEntry }) {
  const { Component } = entry;
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasProps = entry.propsData.length > 0;
  const [activeTab, setActiveTab] = useState<ContentTab>("documentation");

  // Reset scroll position and tab when entry changes
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    setActiveTab("documentation");
  }, [entry.name]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          <PreviewHeader entry={entry} hideBorder={hasProps} />
          {hasProps && (
            <div
              style={{
                display: "flex",
                gap: 0,
                padding: "0 60px",
                borderBottom: "1px solid var(--border)",
                position: "sticky",
                top: 0,
                backgroundColor: "var(--bg)",
                zIndex: 1,
              }}
            >
              {(
                [
                  { key: "documentation" as const, label: "Documentation" },
                  { key: "props" as const, label: "Props" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key);
                  }}
                  style={{
                    padding: "10px 16px",
                    fontSize: 14,
                    fontWeight: activeTab === key ? 600 : 400,
                    color:
                      activeTab === key ? "var(--fg)" : "var(--fg-secondary)",
                    background: "none",
                    border: "none",
                    borderBottom:
                      activeTab === key
                        ? "2px solid var(--fg)"
                        : "2px solid transparent",
                    cursor: "pointer",
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {activeTab === "documentation" ? (
            <div
              style={{
                maxWidth: 1020,
                margin: "0 auto",
                paddingTop: 24,
                paddingBottom: 80,
              }}
            >
              <Component />
            </div>
          ) : (
            <PropsPanel propsData={entry.propsData} />
          )}
        </div>
        <div
          style={{
            width: 200,
            flexShrink: 0,
            borderLeft: "1px solid var(--border)",
          }}
        >
          <TableOfContents
            containerRef={scrollRef}
            contentKey={`${entry.name}:${activeTab}`}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--fg-muted)",
      }}
    >
      {entries.length === 0
        ? "No .preview.mdx files found. Add a *.preview.mdx file next to a component."
        : "Select a component from the sidebar."}
    </div>
  );
}

export function App() {
  const groups = useGroupedEntries(entries);
  const visibleEntries = entries.filter((e) => !e.frontmatter.hidden);
  const [selected, setSelected] = useState(OVERVIEW_KEY);
  const current = visibleEntries.find((e) => e.name === selected);

  return (
    <ThemeProvider>
      <MDXProvider components={mdxComponents}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            fontFamily: "system-ui, sans-serif",
            backgroundColor: "var(--bg)",
            color: "var(--fg)",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              height: 48,
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
            <ThemeToggle />
          </header>
          <div
            style={{
              display: "flex",
              flex: 1,
              overflow: "hidden",
              width: "100%",
              maxWidth: 1560,
              margin: "0 auto",
            }}
          >
            <Sidebar
              groups={groups}
              selected={selected}
              onSelect={setSelected}
            />
            {selected === OVERVIEW_KEY ? (
              <Overview onSelect={setSelected} />
            ) : current ? (
              <PreviewContent entry={current} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </MDXProvider>
    </ThemeProvider>
  );
}
