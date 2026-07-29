import { type ComponentProps, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { Layout, Table, Tabs } from "@tailor-platform/app-shell";

import { units } from "../docs";

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
            <Tabs.Panel value="code" className="overflow-x-auto bg-muted/40 text-sm [&>pre]:p-4">
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
      <Table.Head {...props} />
    ),
    td: ({ node, align, ...props }: ComponentProps<"td"> & { node?: unknown }) => (
      <Table.Cell {...props} />
    ),
    caption: ({ node, ...props }: ComponentProps<"caption"> & { node?: unknown }) => (
      <Table.Caption {...props} />
    ),
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
