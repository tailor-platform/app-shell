import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { MDXProvider } from "@mdx-js/react";
import { entries } from "virtual:previewer-entries";
import { title, repo } from "virtual:previewer-config";
import { mdxComponents } from "./mdx-components";
import { Overview } from "./overview";

interface PreviewEntryFrontmatter {
  title?: string;
  description?: string;
  group?: string;
  order?: number;
  status?: "stable" | "beta" | "experimental" | "deprecated";
  hidden?: boolean;
  codePath?: string;
}

interface PreviewEntry {
  name: string;
  Component: ComponentType;
  frontmatter: PreviewEntryFrontmatter;
  filePath: string;
}

interface SidebarGroup {
  name: string;
  order: number;
  entries: PreviewEntry[];
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  stable: { bg: "#dcfce7", fg: "#166534" },
  beta: { bg: "#dbeafe", fg: "#1e40af" },
  experimental: { bg: "#fef9c3", fg: "#854d0e" },
  deprecated: { bg: "#fee2e2", fg: "#991b1b" },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: "#f3f4f6", fg: "#374151" };
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

  const codePath = entry.frontmatter.codePath;
  const path = codePath ?? entry.filePath;

  return `${repo.url}/blob/${repo.ref}/${path.replace(/^\/+/, "")}`;
}

function useGroupedEntries(entries: PreviewEntry[]) {
  return useMemo(() => {
    const visible = entries.filter((e) => !e.frontmatter.hidden);
    const groupMap = new Map<string, SidebarGroup>();

    for (const entry of visible) {
      const groupName = entry.frontmatter.group ?? "Ungrouped";
      let group = groupMap.get(groupName);
      if (!group) {
        group = {
          name: groupName,
          order: entry.frontmatter.order ?? 999,
          entries: [],
        };
        groupMap.set(groupName, group);
      }
      group.entries.push(entry);
    }

    for (const group of groupMap.values()) {
      group.entries.sort((a, b) => (a.frontmatter.order ?? 999) - (b.frontmatter.order ?? 999));
    }

    return [...groupMap.values()].sort((a, b) => a.order - b.order);
  }, [entries]);
}

const OVERVIEW_KEY = "__overview__";

const groupHeadingStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#9ca3af",
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
        borderRight: "1px solid #e5e7eb",
        padding: "20px 0",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "10px 16px 16px",
          fontSize: 15,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      {/* General section */}
      <div>
        <div style={{ padding: "12px 16px 4px", ...groupHeadingStyle }}>General</div>
        <button
          onClick={() => onSelect(OVERVIEW_KEY)}
          style={{
            ...sidebarItemStyle,
            backgroundColor: selected === OVERVIEW_KEY ? "#f3f4f6" : "transparent",
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
            stroke="#9ca3af"
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
          <div style={{ padding: "20px 16px 4px", ...groupHeadingStyle }}>{group.name}</div>
          {group.entries.map((entry) => (
            <button
              key={entry.name}
              onClick={() => onSelect(entry.name)}
              style={{
                ...sidebarItemStyle,
                backgroundColor: selected === entry.name ? "#f3f4f6" : "transparent",
                fontWeight: selected === entry.name ? 600 : 400,
              }}
            >
              <span style={{ flex: 1 }}>{entry.frontmatter.title ?? entry.name}</span>
              {entry.frontmatter.status && <StatusBadge status={entry.frontmatter.status} />}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

function PreviewHeader({ entry }: { entry: PreviewEntry }) {
  const { frontmatter } = entry;
  if (!frontmatter.title && !frontmatter.description && !frontmatter.status) {
    return null;
  }

  const codeUrl = buildCodeUrl(entry);

  return (
    <div
      style={{
        borderBottom: "1px solid #e5e7eb",
        padding: "24px 60px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {frontmatter.title && (
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{frontmatter.title}</h1>
        )}
        {frontmatter.status && <StatusBadge status={frontmatter.status} />}
      </div>
      {frontmatter.description && (
        <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
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
            color: "#6b7280",
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

function useTableOfContents(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Small delay to let MDX render
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
  }, [containerRef]);

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
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { items, activeId, setActiveId } = useTableOfContents(containerRef);

  if (items.length === 0) return null;

  return (
    <nav
      style={{
        width: 200,
        flexShrink: 0,
        padding: "32px 16px",
        borderLeft: "1px solid #e5e7eb",
      }}
    >
      <div style={{ ...groupHeadingStyle, marginBottom: 12 }}>Table of contents</div>
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
            color: activeId === item.id ? "#111827" : "#6b7280",
            fontWeight: activeId === item.id ? 600 : 400,
            textDecoration: "none",
            borderLeft: activeId === item.id ? "2px solid #111827" : "2px solid transparent",
            paddingInlineStart: item.level === 3 ? 20 : 8,
          }}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );
}

function PreviewContent({ entry }: { entry: PreviewEntry }) {
  const { Component } = entry;
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <PreviewHeader entry={entry} />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "none",
          }}
        >
          <div style={{ maxWidth: 1020, margin: "0 auto", paddingBottom: 80 }}>
            <Component />
          </div>
        </div>
        <TableOfContents containerRef={scrollRef} />
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
        color: "#9ca3af",
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
    <MDXProvider components={mdxComponents}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            maxWidth: 1560,
          }}
        >
          <Sidebar groups={groups} selected={selected} onSelect={setSelected} />
          {selected === OVERVIEW_KEY ? (
            <Overview onSelect={setSelected} />
          ) : current ? (
            <PreviewContent key={current.name} entry={current} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </MDXProvider>
  );
}
