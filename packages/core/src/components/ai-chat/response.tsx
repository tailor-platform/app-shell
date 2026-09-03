import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Only these schemes render as a clickable link; anything else (a streamed
// model response can contain arbitrary text) is dropped to plain text rather
// than becoming a navigable `href`.
const SAFE_LINK_PATTERN = /^(https?:|mailto:)/i;

function isSafeHref(href: string): boolean {
  // `//host` is protocol-relative — an off-site link wearing a same-site
  // shape, so it does not count as a relative path.
  if (href.startsWith("//")) return false;
  return SAFE_LINK_PATTERN.test(href) || href.startsWith("/") || href.startsWith("#");
}

function renderInline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;
  const tokens: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) tokens.push(text.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      tokens.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      tokens.push(
        <code
          key={key++}
          className="astw:rounded astw:bg-muted astw:px-1 astw:py-0.5 astw:font-mono astw:text-xs"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch && isSafeHref(linkMatch[2])) {
        tokens.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="astw:underline astw:underline-offset-2"
          >
            {linkMatch[1]}
          </a>,
        );
      } else if (linkMatch) {
        tokens.push(linkMatch[1]);
      }
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) tokens.push(text.slice(cursor));
  return tokens;
}

function isListLine(line: string): boolean {
  return /^\s*([-*]|\d+\.)\s+/.test(line);
}

function renderBlock(block: string, key: number): ReactNode {
  const lines = block.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length > 0 && lines.every(isListLine)) {
    const ordered = /^\s*\d+\./.test(lines[0]);
    const items = lines.map((line, i) => (
      <li key={i}>{renderInline(line.replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>
    ));
    return ordered ? (
      <ol key={key} className="astw:list-decimal astw:space-y-0.5 astw:pl-5">
        {items}
      </ol>
    ) : (
      <ul key={key} className="astw:list-disc astw:space-y-0.5 astw:pl-5">
        {items}
      </ul>
    );
  }
  const heading = /^(#{1,3})\s+(.*)$/.exec(block.trim());
  if (heading) {
    return (
      <p key={key} className="astw:font-semibold">
        {renderInline(heading[2])}
      </p>
    );
  }
  return (
    <p key={key} className="astw:whitespace-pre-wrap">
      {renderInline(block)}
    </p>
  );
}

type ResponseProps = {
  children: string;
  className?: string;
};

/**
 * Renders the markdown subset a streamed LLM response actually emits — bold,
 * inline code, links, headings, and bullet/numbered lists — without a
 * markdown dependency. For full CommonMark (tables, nested lists, math), swap
 * this for `react-markdown` or the AI SDK's `streamdown`; call sites keep the
 * same `<AIChat.Response>{text}</AIChat.Response>` shape either way.
 */
function Response({ children, className }: ResponseProps) {
  const blocks = children.split(/\n{2,}/).filter((block) => block.trim().length > 0);
  return (
    <div data-slot="ai-chat-response" className={cn("astw:space-y-2", className)}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

export { Response, type ResponseProps };
