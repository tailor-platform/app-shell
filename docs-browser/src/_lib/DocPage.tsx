import { type ComponentProps, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { Layout, Link, Table, Tabs } from "@tailor-platform/app-shell";

import { units } from "../docs";

/** Rewrite a relative `*.md` doc link to its docs-browser route, resolved
 * against the current unit's route (`/<category>/<slug>`). Returns null for
 * external links, in-page anchors, and non-`.md` targets — left untouched — so
 * the raw `.md` files stay browsable on GitHub while the app routes correctly. */
function mdHrefToRoute(href: string, category: string, slug: string): string | null {
  if (/^(https?:|mailto:|#)/.test(href)) return null;
  const [path, hash] = href.split("#");
  if (!/\.md$/.test(path)) return null;
  const resolved = new URL(path, `http://x/${category}/${slug}`).pathname.replace(/\.md$/, "");
  return hash ? `${resolved}#${hash}` : resolved;
}

function pascalCase(key: string): string {
  return key
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
}

const isBlank = (n: HastNode | undefined): boolean =>
  !!n && n.type === "text" && !(n.value ?? "").trim();

/** An `<example-preview>` element, either bare or as the sole child of a `<p>`
 * (react-markdown parses the custom tag as INLINE html, so it lands inside a
 * paragraph). */
function anchorIn(node: HastNode): HastNode | null {
  if (node.type === "element" && node.tagName === "example-preview") return node;
  if (node.type === "element" && node.tagName === "p") {
    const inner = (node.children ?? []).filter((n) => !isBlank(n));
    if (inner.length === 1 && inner[0].tagName === "example-preview") return inner[0];
  }
  return null;
}

// The assembler emits an `<example-preview>` anchor immediately followed by the
// example's ```tsx``` fence (two separate blocks, so GitHub/raw-md still shows
// the fence as ordinary code). In the browser we tie them together: unwrap the
// paragraph react-markdown parses the inline custom tag into, then nest the
// following `<pre>` INTO the anchor — so a single `example-preview` component
// receives both the example name and its rendered code and can tab between
// them (and its <div> is no longer illegally nested in a <p>). Runs after
// rehype-raw, which turns the raw anchor into an element.
function rehypePairExamples() {
  return (tree: HastNode) => {
    const walk = (node: HastNode): void => {
      const kids = node.children;
      if (!kids) return;
      for (let i = 0; i < kids.length; i++) {
        const anchor = anchorIn(kids[i]);
        if (anchor) {
          let j = i + 1;
          while (j < kids.length && isBlank(kids[j])) j++;
          const next = kids[j] as HastNode | undefined;
          if (next && next.type === "element" && next.tagName === "pre") {
            anchor.children = [next];
            kids.splice(i + 1, j - i); // drop the whitespace + the now-nested <pre>
          }
          kids[i] = anchor; // hoist out of the wrapping <p> if there was one
        }
        walk(kids[i]);
      }
    };
    walk(tree);
  };
}

const rehypePlugins = [rehypeRaw, rehypePairExamples] as ComponentProps<
  typeof ReactMarkdown
>["rehypePlugins"];

// Shared renderer for a single documented unit: prose (markdown) with each live
// example rendered IN PLACE — as a Preview/Code tab pair — at the
// `<example-preview>` anchor, and every markdown table rendered via the AppShell
// Table. Lives under _lib/ so file-based routing does not treat it as a page.
export function DocPage({ slug }: { slug: string }) {
  const unit = units.find((u) => u.slug === slug);

  if (!unit) {
    return (
      <Layout>
        <Layout.Header title="Not found" />
        <Layout.Column>Unknown doc unit: {slug}</Layout.Column>
      </Layout>
    );
  }

  const byExportName = new Map(unit.examples.map((example) => [example.name, example]));

  const components = {
    // A tabbed Preview / Code pair. `children` is the `<pre>` the rehype plugin
    // nested into the anchor; the live component comes from the examples module.
    "example-preview": ({
      name,
      node,
      children,
    }: {
      name?: string;
      node?: { properties?: { name?: string } };
      children?: ReactNode;
    }) => {
      const exampleKey = name ?? node?.properties?.name;
      const example = exampleKey ? byExportName.get(pascalCase(String(exampleKey))) : undefined;
      if (!example) return null;
      return (
        <div className="my-5 overflow-hidden rounded-lg border border-border">
          <Tabs.Root defaultValue="preview" variant="line">
            <Tabs.List className="border-b border-border px-4">
              <Tabs.Tab value="preview">Preview</Tabs.Tab>
              <Tabs.Tab value="code">Code</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="preview" className="p-6">
              <example.Component />
            </Tabs.Panel>
            <Tabs.Panel value="code" className="[&>pre]:my-0 [&>pre]:rounded-none">
              {children}
            </Tabs.Panel>
          </Tabs.Root>
        </div>
      );
    },

    // Headings — no app-shell typography primitive yet, so give the docs a
    // simple scale with semantic tokens (theme-aware in light/dark).
    h1: ({ node, ...props }: ComponentProps<"h1"> & { node?: unknown }) => (
      <h1 className="text-foreground text-3xl font-semibold tracking-tight" {...props} />
    ),
    h2: ({ node, ...props }: ComponentProps<"h2"> & { node?: unknown }) => (
      <h2
        className="text-foreground border-border mt-6 border-b pb-1.5 text-xl font-semibold tracking-tight"
        {...props}
      />
    ),
    h3: ({ node, ...props }: ComponentProps<"h3"> & { node?: unknown }) => (
      <h3 className="text-foreground mt-4 text-lg font-semibold" {...props} />
    ),
    h4: ({ node, ...props }: ComponentProps<"h4"> & { node?: unknown }) => (
      <h4 className="text-foreground mt-2 font-semibold" {...props} />
    ),

    // Code — a tidy, distinct surface + monospace (no real syntax highlighting
    // yet). The same styles apply to standalone fences AND the Code tab; a
    // fenced block is `pre > code`, so `pre` resets the inline `code` chip for
    // its child. Inline `code` (in prose, tables, headings) keeps the chip.
    pre: ({ node, ...props }: ComponentProps<"pre"> & { node?: unknown }) => (
      <pre
        className="bg-muted text-foreground my-4 overflow-x-auto rounded-lg p-4 font-mono text-sm [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-sm"
        {...props}
      />
    ),
    code: ({ node, className, ...props }: ComponentProps<"code"> & { node?: unknown }) => (
      <code
        className={`bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em] ${className ?? ""}`}
        {...props}
      />
    ),

    // Dogfood the AppShell Table for every markdown table — remark-gfm emits
    // basic 2-D tables, so each element maps 1:1 onto a Table sub-component
    // (`node` is react-markdown's hast node, not a DOM prop; drop it).
    table: ({ node, ...props }: ComponentProps<"table"> & { node?: unknown }) => (
      <Table.Root {...props} />
    ),
    thead: ({ node, ...props }: ComponentProps<"thead"> & { node?: unknown }) => (
      <Table.Header {...props} />
    ),
    tbody: ({ node, ...props }: ComponentProps<"tbody"> & { node?: unknown }) => (
      <Table.Body {...props} />
    ),
    tfoot: ({ node, ...props }: ComponentProps<"tfoot"> & { node?: unknown }) => (
      <Table.Footer {...props} />
    ),
    tr: ({ node, ...props }: ComponentProps<"tr"> & { node?: unknown }) => <Table.Row {...props} />,
    // `align` is remark-gfm's deprecated string attr; drop it (alignment also
    // arrives as inline `style`, which Table.Head/Cell honor) so it doesn't
    // clash with Table's typed `align`.
    th: ({ node, align, ...props }: ComponentProps<"th"> & { node?: unknown }) => (
      <Table.Head className="whitespace-normal! align-top" {...props} />
    ),
    td: ({ node, align, ...props }: ComponentProps<"td"> & { node?: unknown }) => (
      <Table.Cell className="whitespace-normal! align-top break-words" {...props} />
    ),
    caption: ({ node, ...props }: ComponentProps<"caption"> & { node?: unknown }) => (
      <Table.Caption {...props} />
    ),

    // Blockquotes as light callout panels — the docs use `> **Note:** …` /
    // `> ⚠️ **Warning** …` as pseudo-admonitions, which Preflight leaves flat.
    blockquote: ({ node, ...props }: ComponentProps<"blockquote"> & { node?: unknown }) => (
      <blockquote
        className="border-primary/60 bg-muted/40 text-foreground my-4 rounded-r-md border-l-2 py-2 pr-3 pl-4 [&>p]:my-1.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
        {...props}
      />
    ),

    // Lists — Preflight strips markers + indent and there is no prose wrapper,
    // so restore discs / decimals and indentation explicitly.
    ul: ({ node, ...props }: ComponentProps<"ul"> & { node?: unknown }) => (
      <ul className="my-3 list-disc space-y-1 pl-6 [&_ul]:my-1 [&_ol]:my-1" {...props} />
    ),
    ol: ({ node, ...props }: ComponentProps<"ol"> & { node?: unknown }) => (
      <ol className="my-3 list-decimal space-y-1 pl-6 [&_ul]:my-1 [&_ol]:my-1" {...props} />
    ),
    li: ({ node, ...props }: ComponentProps<"li"> & { node?: unknown }) => (
      <li className="leading-relaxed" {...props} />
    ),

    // Cross-doc links target the source `.md` files; rewrite to browser routes
    // at render time (external links + in-page anchors pass through unchanged).
    a: ({ node, href, ...props }: ComponentProps<"a"> & { node?: unknown }) => {
      const to = href ? mdHrefToRoute(href, unit.category, unit.slug) : null;
      return to ? <Link to={to} {...props} /> : <a href={href} {...props} />;
    },
  } as Components;

  return (
    <Layout>
      <Layout.Header title={unit.title ?? unit.slug} />
      <Layout.Column>
        <article className="flex max-w-3xl flex-col gap-4 leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={rehypePlugins}
            components={components}
          >
            {unit.markdown}
          </ReactMarkdown>
        </article>
      </Layout.Column>
    </Layout>
  );
}
