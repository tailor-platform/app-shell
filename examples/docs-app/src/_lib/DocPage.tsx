import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { Layout } from "@tailor-platform/app-shell";

import { units } from "../docs";

function pascalCase(key: string): string {
  return key
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

// Shared renderer for a single documented unit: prose (markdown) with each live
// example rendered IN PLACE at the `<example-preview name="…">` anchor the
// assembler drops next to that example's code fence.
// Lives under _lib/ so file-based routing does not treat it as a page.
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
    "example-preview": (props: { name?: string; node?: { properties?: { name?: string } } }) => {
      const key = props.name ?? props.node?.properties?.name;
      const example = key ? byExportName.get(pascalCase(String(key))) : undefined;
      if (!example) return null;
      return (
        <div className="my-4 rounded-lg border border-gray-200">
          <div className="p-6">
            <example.Component />
          </div>
        </div>
      );
    },
  } as Components;

  return (
    <Layout>
      <Layout.Header title={unit.slug} />
      <Layout.Column>
        <article className="flex max-w-3xl flex-col gap-3 leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={components}
          >
            {unit.markdown}
          </ReactMarkdown>
        </article>
      </Layout.Column>
    </Layout>
  );
}
