import { useMemo, useState, type ComponentType } from "react";
import { MDXProvider } from "@mdx-js/react";
import { entries } from "virtual:previewer-entries";
import { mdxComponents } from "./mdx-components";

interface PreviewEntryFrontmatter {
  title?: string;
  description?: string;
  group?: string;
  order?: number;
  status?: "stable" | "beta" | "experimental" | "deprecated";
  hidden?: boolean;
}

interface PreviewEntry {
  name: string;
  Component: ComponentType;
  frontmatter: PreviewEntryFrontmatter;
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
      group.entries.sort(
        (a, b) => (a.frontmatter.order ?? 999) - (b.frontmatter.order ?? 999),
      );
    }

    return [...groupMap.values()].sort((a, b) => a.order - b.order);
  }, [entries]);
}

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
        padding: "16px 0",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      {groups.map((group) => (
        <div key={group.name}>
          <div
            style={{
              padding: "12px 16px 4px",
              fontSize: 11,
              fontWeight: 700,
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {group.name}
          </div>
          {group.entries.map((entry) => (
            <button
              key={entry.name}
              onClick={() => onSelect(entry.name)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                textAlign: "left",
                padding: "8px 16px",
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  selected === entry.name ? "#f3f4f6" : "transparent",
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

function PreviewHeader({ entry }: { entry: PreviewEntry }) {
  const { frontmatter } = entry;
  if (!frontmatter.title && !frontmatter.description && !frontmatter.status) {
    return null;
  }
  return (
    <div
      style={{
        margin: "0 -32px 24px",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 32px 16px",
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
        <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
          {frontmatter.description}
        </p>
      )}
    </div>
  );
}

function PreviewContent({ entry }: { entry: PreviewEntry }) {
  const { Component } = entry;
  return (
    <div style={{ flex: 1, padding: 32, overflowY: "auto" }}>
      <PreviewHeader entry={entry} />
      <Component />
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
  const [selected, setSelected] = useState(visibleEntries[0]?.name ?? null);
  const current = visibleEntries.find((e) => e.name === selected);

  return (
    <MDXProvider components={mdxComponents}>
      <div
        style={{
          display: "flex",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <Sidebar groups={groups} selected={selected} onSelect={setSelected} />
        {current ? <PreviewContent entry={current} /> : <EmptyState />}
      </div>
    </MDXProvider>
  );
}
