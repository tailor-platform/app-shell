import { type ReactNode, useState } from "react";
import { CodeBlock } from "./code-block";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: "transform 0.15s",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
      }}
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function PreviewBlock({
  code,
  children,
}: {
  code: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        margin: "16px 0",
      }}
    >
      <div
        style={{
          padding: 16,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundImage:
            "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        {children}
      </div>
      <div
        style={{
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            width: "100%",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--fg-muted)",
            fontFamily: "inherit",
          }}
        >
          <ChevronIcon open={open} />
          Code
        </button>
        {open && (
          <CodeBlock className="language-tsx" noBorderRadius>
            {code}
          </CodeBlock>
        )}
      </div>
    </div>
  );
}
