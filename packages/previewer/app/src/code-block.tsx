import { useCallback, useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { useTheme } from "./theme";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy code"
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        border: "1px solid var(--border)",
        borderRadius: 6,
        backgroundColor: "var(--bg)",
        cursor: "pointer",
        color: "var(--fg-muted)",
        opacity: 0.6,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.6";
      }}
    >
      {copied ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13.25 4.75l-6.5 6.5-3.5-3.5" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path d="M10.5 5.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v6A1.5 1.5 0 003 10.5h2.5" />
        </svg>
      )}
    </button>
  );
}

export function CodeBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const lang = className?.replace("language-", "") ?? "";
  const { colorScheme } = useTheme();
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!lang) return;
    let cancelled = false;
    codeToHtml(children, {
      lang,
      theme: colorScheme === "dark" ? "github-dark" : "github-light",
      transformers: [
        {
          pre(node) {
            node.properties.style = "margin:0;padding:10px";
          },
        },
      ],
    }).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [children, lang, colorScheme]);

  if (html) {
    return (
      <div
        style={{
          position: "relative",
          background: "var(--code-bg)",
          borderRadius: 8,
          overflow: "auto",
          fontSize: 13,
          lineHeight: 1.5,
          border: "1px solid var(--border)",
        }}
      >
        <CopyButton text={children} />
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <CopyButton text={children} />
      <pre
        style={{
          background: "var(--code-bg)",
          padding: 16,
          borderRadius: 8,
          overflow: "auto",
          fontSize: 13,
          lineHeight: 1.5,
          border: "1px solid var(--border)",
        }}
      >
        <code data-language={lang}>{children}</code>
      </pre>
    </div>
  );
}
