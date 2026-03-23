import { type ReactNode, Children } from "react";
import { CodeBlock } from "./code-block";

function slugify(children: ReactNode): string {
  const text = Children.toArray(children)
    .map((child) => (typeof child === "string" ? child : ""))
    .join("");
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u3000-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const mdxComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px" }}>
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => {
    const id = slugify(children);
    return (
      <h2
        id={id}
        style={{
          fontSize: 20,
          fontWeight: 600,
          margin: "24px 0 12px",
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: 8,
        }}
      >
        {children}
      </h2>
    );
  },
  h3: ({ children }: { children?: ReactNode }) => {
    const id = slugify(children);
    return (
      <h3
        id={id}
        style={{ fontSize: 16, fontWeight: 600, margin: "20px 0 8px" }}
      >
        {children}
      </h3>
    );
  },
  p: ({ children }: { children?: ReactNode }) => (
    <p style={{ margin: "8px 0", lineHeight: 1.6 }}>{children}</p>
  ),
  pre: ({
    children,
  }: {
    children?: React.ReactElement<{ children?: string; className?: string }>;
  }) => {
    const code = children?.props?.children ?? "";
    const className = children?.props?.className ?? "";
    return <CodeBlock className={className}>{code}</CodeBlock>;
  },
  table: ({ children }: { children?: ReactNode }) => (
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
        margin: "16px 0",
        fontSize: 14,
      }}
    >
      {children}
    </table>
  ),
  thead: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  tbody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: ReactNode }) => (
    <tr style={{ borderBottom: "1px solid #e1e4e8" }}>{children}</tr>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th
      style={{
        background: "#f6f8fa",
        padding: "8px 12px",
        textAlign: "left" as const,
        borderBottom: "2px solid #e1e4e8",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td style={{ padding: "8px 12px", verticalAlign: "top" as const }}>
      {children}
    </td>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code
      style={{
        background: "#f0f0f0",
        padding: "2px 6px",
        borderRadius: 4,
        fontSize: 13,
        fontFamily: "monospace",
      }}
    >
      {children}
    </code>
  ),
};
