import { Alert, Layout, type AppShellPageProps } from "@tailor-platform/app-shell";
import { MegaphoneIcon } from "lucide-react";

/**
 * Exercises the `--color-alert-*` theme bridge from the consumer side.
 *
 * Every callout below is styled with plain Tailwind utilities
 * (`bg-alert-info-background`, `text-alert-info-foreground`, …) rather than
 * arbitrary-value syntax. These classes only resolve because the app imports
 * `@tailor-platform/app-shell/styles` from `index.css`, which brings the
 * `@theme inline` bridge into this app's Tailwind build.
 *
 * If a token stops being bridged, the swatch loses its colour — which is the
 * point of keeping this page in the example app.
 */
const variants = [
  { key: "neutral", label: "Neutral" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "error", label: "Error" },
  { key: "info", label: "Info" },
] as const;

// Tailwind scans source files statically, so the utility strings have to appear
// in full — they cannot be assembled from the variant key at runtime.
const variantClasses: Record<(typeof variants)[number]["key"], string> = {
  neutral: "bg-alert-neutral-background text-alert-neutral-foreground border-alert-neutral-border",
  success: "bg-alert-success-background text-alert-success-foreground border-alert-success-border",
  warning: "bg-alert-warning-background text-alert-warning-foreground border-alert-warning-border",
  error: "bg-alert-error-background text-alert-error-foreground border-alert-error-border",
  info: "bg-alert-info-background text-alert-info-foreground border-alert-info-border",
};

const mutedClasses: Record<(typeof variants)[number]["key"], string> = {
  neutral: "text-alert-neutral-foreground-muted",
  success: "text-alert-success-foreground-muted",
  warning: "text-alert-warning-foreground-muted",
  error: "text-alert-error-foreground-muted",
  info: "text-alert-info-foreground-muted",
};

const AlertTokensPage = () => {
  return (
    <Layout>
      <Layout.Header title="Alert tokens" />
      <Layout.Column>
        <p className="mb-6 text-muted-foreground max-w-2xl">
          Custom callouts built from the bridged{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded">alert-*</code> utilities. These are the
          same tokens <code className="bg-muted px-1.5 py-0.5 rounded">Alert</code> uses internally,
          now available to application code without arbitrary-value syntax. Toggle light/dark in the
          header to confirm both modes resolve.
        </p>

        <section className="mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Bridged utilities (application-side)
          </h3>
          <div className="flex flex-col gap-3 max-w-2xl">
            {variants.map(({ key, label }) => (
              <div key={key} className={`rounded-lg border px-4 py-3 ${variantClasses[key]}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MegaphoneIcon className="size-4 shrink-0" />
                  {label}
                </div>
                <p className={`mt-1 text-sm ${mutedClasses[key]}`}>
                  Styled with <code>bg-alert-{key}-background</code>,{" "}
                  <code>text-alert-{key}-foreground</code>, <code>border-alert-{key}-border</code> —
                  and this line uses <code>text-alert-{key}-foreground-muted</code>.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            AppShell Alert component (for comparison)
          </h3>
          <div className="flex flex-col gap-3 max-w-2xl">
            {variants.map(({ key, label }) => (
              <Alert.Root key={key} variant={key}>
                <Alert.Title>{label}</Alert.Title>
                <Alert.Description>
                  Rendered by the built-in Alert component using the same tokens.
                </Alert.Description>
              </Alert.Root>
            ))}
          </div>
        </section>
      </Layout.Column>
    </Layout>
  );
};

AlertTokensPage.appShellPageProps = {
  meta: {
    title: "Alert tokens",
    icon: <MegaphoneIcon size={16} />,
  },
} satisfies AppShellPageProps;

export default AlertTokensPage;
