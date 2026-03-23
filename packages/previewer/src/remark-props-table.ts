import { visit } from "unist-util-visit";
import { resolve, dirname } from "node:path";
import { extractProps } from "./extract-props";

// Minimal mdast node types needed for table generation
interface MdastText {
  type: "text";
  value: string;
}

interface MdastInlineCode {
  type: "inlineCode";
  value: string;
}

interface MdastEmphasis {
  type: "emphasis";
  children: MdastPhrasingContent[];
}

interface MdastStrong {
  type: "strong";
  children: MdastPhrasingContent[];
}

interface MdastLink {
  type: "link";
  url: string;
  children: MdastPhrasingContent[];
}

interface MdastBreak {
  type: "break";
}

type MdastPhrasingContent =
  | MdastText
  | MdastInlineCode
  | MdastEmphasis
  | MdastStrong
  | MdastLink
  | MdastBreak;

interface MdastTableCell {
  type: "tableCell";
  children: MdastPhrasingContent[];
}

interface MdastTableRow {
  type: "tableRow";
  children: MdastTableCell[];
}

interface MdastTable {
  type: "table";
  align: (null | "left" | "right" | "center")[];
  children: MdastTableRow[];
}

interface MdastParagraph {
  type: "paragraph";
  children: (MdastText | MdastEmphasis)[];
}

interface MdastCode {
  type: "code";
  lang?: string | null;
  value: string;
}

interface RemarkPropsTableOptions {
  root: string;
}

function parseProplistBlock(value: string): { file: string; name: string }[] {
  const entries: { file: string; name: string }[] = [];
  for (const line of value.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIndex = trimmed.lastIndexOf(":");
    if (colonIndex === -1) continue;
    const file = trimmed.slice(0, colonIndex).trim();
    const name = trimmed.slice(colonIndex + 1).trim();
    if (file && name) {
      entries.push({ file, name });
    }
  }
  return entries;
}

function cell(children: MdastPhrasingContent[]): MdastTableCell {
  return { type: "tableCell", children };
}

function textCell(value: string): MdastTableCell {
  return cell([{ type: "text", value }]);
}

function codeCell(value: string): MdastTableCell {
  return cell([{ type: "inlineCode", value }]);
}

/**
 * Parse a string containing inline markdown into mdast phrasing nodes.
 * Supports: `code`, **strong**, *emphasis*, [links](url), and bullet points (- item).
 */
function parseInlineMarkdown(text: string): MdastPhrasingContent[] {
  const nodes: MdastPhrasingContent[] = [];

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (i > 0) {
      nodes.push({ type: "break" });
    }

    // Convert bullet points: "- item" or "* item" at line start → "• item"
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      line = `• ${bulletMatch[1]}`;
    }

    const pattern =
      /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        nodes.push({ type: "text", value: line.slice(lastIndex, match.index) });
      }
      if (match[1] !== undefined) {
        nodes.push({ type: "inlineCode", value: match[1] });
      } else if (match[2] !== undefined) {
        nodes.push({
          type: "strong",
          children: [{ type: "text", value: match[2] }],
        });
      } else if (match[3] !== undefined) {
        nodes.push({
          type: "emphasis",
          children: [{ type: "text", value: match[3] }],
        });
      } else if (match[4] !== undefined && match[5] !== undefined) {
        nodes.push({
          type: "link",
          url: match[5],
          children: [{ type: "text", value: match[4] }],
        });
      }
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < line.length) {
      nodes.push({ type: "text", value: line.slice(lastIndex) });
    }
  }

  return nodes.length > 0 ? nodes : [{ type: "text", value: text }];
}

function markdownCell(text: string): MdastTableCell {
  return cell(parseInlineMarkdown(text));
}

export function remarkPropsTable(options: RemarkPropsTableOptions) {
  const tsconfigPath = resolve(options.root, "tsconfig.json");

  // biome-ignore lint/suspicious/noExplicitAny: remark plugin tree/file types are generic
  return (tree: any, file: any) => {
    visit(
      tree,
      "code",
      (node: MdastCode, index: number | undefined, parent: any) => {
        if (node.lang !== "proplist:table") return;

        const entries = parseProplistBlock(node.value);

        if (entries.length === 0) {
          console.warn(
            `[remark-props-table] No valid entries in proplist:table code block`,
          );
          return;
        }

        const mdxDir = file.path ? dirname(file.path) : options.root;

        // Collect all props from all entries
        const allProps = entries.flatMap((entry) => {
          const absoluteFilePath = resolve(mdxDir, entry.file);
          return extractProps(absoluteFilePath, entry.name, tsconfigPath);
        });

        if (allProps.length === 0) {
          const names = entries.map((e) => e.name).join(", ");
          const replacement: MdastParagraph = {
            type: "paragraph",
            children: [
              {
                type: "emphasis",
                children: [
                  {
                    type: "text",
                    value: `No props found for ${names}`,
                  },
                ],
              },
            ],
          };
          if (parent && index !== undefined) {
            parent.children[index] = replacement;
          }
          return;
        }

        const headerRow: MdastTableRow = {
          type: "tableRow",
          children: [
            textCell("Name"),
            textCell("Type"),
            textCell("Default"),
            textCell("Description"),
          ],
        };

        const dataRows: MdastTableRow[] = allProps.map((prop) => ({
          type: "tableRow" as const,
          children: [
            codeCell(prop.name),
            codeCell(prop.type),
            textCell(prop.defaultValue ?? "—"),
            markdownCell(prop.description ?? ""),
          ],
        }));

        const table: MdastTable = {
          type: "table",
          align: [null, null, null, null],
          children: [headerRow, ...dataRows],
        };

        if (parent && index !== undefined) {
          parent.children[index] = table;
        }
      },
    );
  };
}
