import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

export function CodeBlock({ children, className }: { children: string; className?: string }) {
  const lang = className?.replace("language-", "") ?? "";
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!lang) return;
    let cancelled = false;
    codeToHtml(children, {
      lang,
      theme: "github-light",
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
  }, [children, lang]);

  if (html) {
    return (
      <div
        style={{
          background: "#f4f4f5",
          borderRadius: 8,
          overflow: "auto",
          fontSize: 13,
          lineHeight: 1.5,
          border: "1px solid #e5e7eb",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <pre
      style={{
        background: "#f4f4f5",
        padding: 16,
        borderRadius: 8,
        overflow: "auto",
        fontSize: 13,
        lineHeight: 1.5,
        border: "1px solid #e5e7eb",
      }}
    >
      <code data-language={lang}>{children}</code>
    </pre>
  );
}
