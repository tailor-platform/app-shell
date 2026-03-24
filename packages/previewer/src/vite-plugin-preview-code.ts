import type { Plugin } from "vite";

/**
 * Vite plugin that transforms ` ```tsx preview ` fenced code blocks in .preview.mdx
 * files into both a live JSX preview and a syntax-highlighted code block.
 *
 * Runs BEFORE the MDX plugin so the MDX compiler sees standard markup.
 *
 * Usage in .preview.mdx:
 *
 * ```tsx preview
 * <Button variant="default">Default</Button>
 * ```
 *
 * This is expanded into:
 *
 * <PreviewBlock code="...">
 *   <Button variant="default">Default</Button>
 * </PreviewBlock>
 */

const PREVIEW_FENCE_RE = /```tsx preview\n([\s\S]*?)```/g;

function escapeJsString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export function previewCodePlugin(): Plugin {
  return {
    name: "previewer-preview-code",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".preview.mdx")) return;
      if (!code.includes("tsx preview")) return;

      const transformed = code.replace(
        PREVIEW_FENCE_RE,
        (_match, body: string) => {
          // Remove the trailing newline that the fence captures
          const trimmed = body.replace(/\n$/, "");
          const escaped = escapeJsString(trimmed);
          return `<PreviewBlock code={"${escaped}"}>\n${trimmed}\n</PreviewBlock>`;
        },
      );

      return { code: transformed, map: null };
    },
  };
}
