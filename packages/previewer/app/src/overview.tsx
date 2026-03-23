import { entries } from "virtual:previewer-entries";
import { repo } from "virtual:previewer-config";

interface OverviewProps {
  onSelect: (name: string) => void;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  stable: { bg: "#dcfce7", fg: "#166534" },
  beta: { bg: "#dbeafe", fg: "#1e40af" },
  experimental: { bg: "#fef9c3", fg: "#854d0e" },
  deprecated: { bg: "#fee2e2", fg: "#991b1b" },
};

export function Overview({ onSelect }: OverviewProps) {
  const visible = entries.filter((e) => !e.frontmatter.hidden);

  const groupMap = new Map<string, typeof visible>();
  for (const entry of visible) {
    const groupName = entry.frontmatter.group ?? "Ungrouped";
    const group = groupMap.get(groupName) ?? [];
    group.push(entry);
    groupMap.set(groupName, group);
  }

  // Sort entries within each group by order
  for (const group of groupMap.values()) {
    group.sort(
      (a, b) => (a.frontmatter.order ?? 999) - (b.frontmatter.order ?? 999),
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        scrollbarWidth: "none",
      }}
    >
      <div style={{ maxWidth: 1020, margin: "0 auto", paddingBottom: 80 }}>
        {/* Header */}
        <div
          style={{
            borderBottom: "1px solid #e5e7eb",
            padding: "24px 60px 20px",
          }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Overview</h1>
          <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
            {visible.length} components across {groupMap.size} groups
          </p>
        </div>

        {/* Groups */}
        <div style={{ padding: "24px 60px" }}>
          {[...groupMap.entries()].map(([groupName, groupEntries]) => (
            <div key={groupName} style={{ marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  margin: "0 0 12px",
                }}
              >
                {groupName}
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {groupEntries.map((entry) => (
                  <button
                    key={entry.name}
                    onClick={() => onSelect(entry.name)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 4,
                      padding: "16px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      backgroundColor: "white",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#9ca3af";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 600 }}>
                        {entry.frontmatter.title ?? entry.name}
                      </span>
                      {entry.frontmatter.status && (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 4,
                            backgroundColor: (
                              STATUS_COLORS[entry.frontmatter.status] ?? {
                                bg: "#f3f4f6",
                              }
                            ).bg,
                            color: (
                              STATUS_COLORS[entry.frontmatter.status] ?? {
                                fg: "#374151",
                              }
                            ).fg,
                            lineHeight: "18px",
                          }}
                        >
                          {entry.frontmatter.status}
                        </span>
                      )}
                    </div>
                    {entry.frontmatter.description && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: "#6b7280",
                          lineHeight: 1.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {entry.frontmatter.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* LLMs.txt link */}
          {repo && (
            <div
              style={{
                marginTop: 16,
                padding: "16px 20px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                backgroundColor: "#f9fafb",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  lineHeight: 1.5,
                }}
              >
                An{" "}
                <a
                  href="/llms.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#111827", fontWeight: 500 }}
                >
                  llms.txt
                </a>{" "}
                file is available for LLM consumption.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
