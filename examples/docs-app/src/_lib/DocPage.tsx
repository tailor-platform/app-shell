import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Layout } from "@tailor-platform/app-shell";

import { units } from "../docs";

// Shared renderer for a single documented unit: prose (markdown) + live examples.
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

  return (
    <Layout>
      <Layout.Header title={unit.slug} />
      <Layout.Column>
        <article className="flex max-w-3xl flex-col gap-3 leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{unit.markdown}</ReactMarkdown>
        </article>

        {unit.examples.length > 0 && (
          <section className="mt-8 flex max-w-3xl flex-col gap-4">
            <h2 className="text-lg font-semibold">Live examples</h2>
            {unit.examples.map((example) => (
              <div key={example.name} className="rounded-lg border border-gray-200">
                <div className="p-6">
                  <example.Component />
                </div>
                <div className="border-t border-gray-200 px-3 py-1 text-xs text-gray-500">
                  {example.name}
                </div>
              </div>
            ))}
          </section>
        )}
      </Layout.Column>
    </Layout>
  );
}
