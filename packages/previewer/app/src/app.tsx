import { useState, type ComponentType } from "react";
import { MDXProvider } from "@mdx-js/react";
import { entries } from "virtual:previewer-entries";
import { mdxComponents } from "./mdx-components";

interface PreviewEntry {
  name: string;
  Component: ComponentType;
}

function Sidebar({
  entries,
  selected,
  onSelect,
}: {
  entries: PreviewEntry[];
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
      <div
        style={{
          padding: "0 16px 12px",
          fontSize: 14,
          fontWeight: 600,
          color: "#6b7280",
        }}
      >
        Components
      </div>
      {entries.map((entry) => (
        <button
          key={entry.name}
          onClick={() => onSelect(entry.name)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "8px 16px",
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            backgroundColor: selected === entry.name ? "#f3f4f6" : "transparent",
            fontWeight: selected === entry.name ? 600 : 400,
          }}
        >
          {entry.name}
        </button>
      ))}
    </nav>
  );
}

function PreviewContent({ entry }: { entry: PreviewEntry }) {
  const { Component } = entry;
  return (
    <div style={{ flex: 1, padding: 32, overflowY: "auto" }}>
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
  const [selected, setSelected] = useState(entries[0]?.name ?? null);
  const current = entries.find((e) => e.name === selected);

  return (
    <MDXProvider components={mdxComponents}>
      <div
        style={{
          display: "flex",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <Sidebar entries={entries} selected={selected} onSelect={setSelected} />
        {current ? <PreviewContent entry={current} /> : <EmptyState />}
      </div>
    </MDXProvider>
  );
}
