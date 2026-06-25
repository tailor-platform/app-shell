import { defineResource, Layout, Card, Button, Menu } from "@tailor-platform/app-shell";
import type { CSSProperties, ReactNode } from "react";

type SwatchProps = {
  name: string;
  bgVar: string;
  fgVar: string;
  fgLabel?: string;
};

const sectionTitle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--muted-foreground)",
  marginBottom: "0.75rem",
};

const gridStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
};

function ColorSwatch({ name, bgVar, fgVar, fgLabel }: SwatchProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "5.5rem" }}>
      <div
        style={{
          width: "5.5rem",
          height: "5.5rem",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          backgroundColor: `var(${bgVar})`,
          color: `var(${fgVar})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.125rem",
          fontSize: "0.6875rem",
          fontWeight: 600,
          lineHeight: 1.2,
          textAlign: "center",
          padding: "0.25rem",
        }}
      >
        <span>Aa</span>
        <span style={{ fontSize: "0.5625rem", fontWeight: 500, opacity: 0.85 }}>
          {fgLabel ?? fgVar.replace(/^--/, "")}
        </span>
      </div>
      <span
        style={{
          fontSize: "0.625rem",
          color: "var(--muted-foreground)",
          lineHeight: 1.25,
          wordBreak: "break-word",
        }}
      >
        {name}
      </span>
    </div>
  );
}

function SwatchSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: "1.5rem" }}>
      <h3 style={sectionTitle}>{title}</h3>
      <div style={gridStyle}>{children}</div>
    </section>
  );
}

const ColorDemoPage = () => {
  return (
    <Layout>
      <Layout.Header title="Color tokens" />
      <Layout.Column>
        <Card.Root>
          <Card.Header title="Token swatches" />
          <Card.Content>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--muted-foreground)",
                marginBottom: "1.25rem",
              }}
            >
              Live values from the active palette and color mode. Sections mirror the token tiers in{" "}
              <code style={{ fontSize: "0.8125rem" }}>packages/core/src/assets/themes/</code> — see{" "}
              <code style={{ fontSize: "0.8125rem" }}>_template.css</code> for what to set when
              adding a palette.
            </p>

            <SwatchSection title="Brand">
              <ColorSwatch name="primary" bgVar="--primary" fgVar="--primary-foreground" />
              <ColorSwatch name="secondary" bgVar="--secondary" fgVar="--secondary-foreground" />
              <ColorSwatch name="accent" bgVar="--accent" fgVar="--accent-foreground" />
            </SwatchSection>

            <SwatchSection title="Derived">
              <ColorSwatch
                name="ring"
                bgVar="--background"
                fgVar="--foreground"
                fgLabel="ring sample"
              />
              <div
                style={{
                  width: "5.5rem",
                  height: "5.5rem",
                  borderRadius: "var(--radius-md)",
                  border: "3px solid var(--ring)",
                  backgroundColor: "var(--card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.625rem",
                  color: "var(--muted-foreground)",
                }}
              >
                --ring
              </div>
            </SwatchSection>

            <SwatchSection title="System surfaces">
              <ColorSwatch name="background" bgVar="--background" fgVar="--foreground" />
              <ColorSwatch name="card" bgVar="--card" fgVar="--card-foreground" />
              <ColorSwatch name="popover" bgVar="--popover" fgVar="--popover-foreground" />
              <ColorSwatch name="muted" bgVar="--muted" fgVar="--muted-foreground" />
              <ColorSwatch name="border" bgVar="--border" fgVar="--foreground" />
              <ColorSwatch name="input" bgVar="--input" fgVar="--foreground" />
            </SwatchSection>

            <SwatchSection title="Sidebar">
              <ColorSwatch name="sidebar" bgVar="--sidebar" fgVar="--sidebar-foreground" />
              <ColorSwatch
                name="sidebar-primary"
                bgVar="--sidebar-primary"
                fgVar="--sidebar-primary-foreground"
              />
              <ColorSwatch
                name="sidebar-accent"
                bgVar="--sidebar-accent"
                fgVar="--sidebar-accent-foreground"
              />
              <ColorSwatch name="sidebar-border" bgVar="--sidebar-border" fgVar="--foreground" />
            </SwatchSection>

            <SwatchSection title="Status & charts">
              <ColorSwatch
                name="destructive"
                bgVar="--destructive"
                fgVar="--destructive-foreground"
              />
              <ColorSwatch name="status-default" bgVar="--status-default" fgVar="--foreground" />
              <ColorSwatch name="status-neutral" bgVar="--status-neutral" fgVar="--foreground" />
              <ColorSwatch
                name="status-completed"
                bgVar="--status-completed"
                fgVar="--foreground"
              />
              <ColorSwatch
                name="status-attention"
                bgVar="--status-attention"
                fgVar="--foreground"
              />
              <ColorSwatch name="status-danger" bgVar="--status-danger" fgVar="--foreground" />
              <ColorSwatch name="chart-1" bgVar="--chart-1" fgVar="--foreground" />
              <ColorSwatch name="chart-2" bgVar="--chart-2" fgVar="--foreground" />
              <ColorSwatch name="chart-3" bgVar="--chart-3" fgVar="--foreground" />
              <ColorSwatch name="chart-4" bgVar="--chart-4" fgVar="--foreground" />
              <ColorSwatch name="chart-5" bgVar="--chart-5" fgVar="--foreground" />
            </SwatchSection>

            {/* Show author-facing gradient inputs (`base` + `tint`) here.
                `start` / `end` are derived from them in the theme CSS. */}
            <SwatchSection title="Shell gradient">
              <ColorSwatch
                name="shell-gradient-base"
                bgVar="--shell-gradient-base"
                fgVar="--foreground"
              />
              <ColorSwatch
                name="shell-gradient-tint"
                bgVar="--shell-gradient-tint"
                fgVar="--foreground"
              />
            </SwatchSection>
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header title="Layered examples" />
          <Card.Content>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Surface stack */}
              <div>
                <p style={sectionTitle}>Surface stack (background → card → popover)</p>
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "var(--radius-lg)",
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--card)",
                      color: "var(--card-foreground)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                      card
                    </span>
                    <div
                      style={{
                        marginTop: "0.75rem",
                        padding: "0.75rem",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--popover)",
                        color: "var(--popover-foreground)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--semantic-shadow-md)",
                      }}
                    >
                      popover surface
                      <div
                        style={{
                          marginTop: "0.5rem",
                          padding: "0.375rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--accent)",
                          color: "var(--accent-foreground)",
                          fontSize: "0.8125rem",
                        }}
                      >
                        accent (menu hover / sidebar selection)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Button row on background */}
              <div>
                <p style={sectionTitle}>Actions on card</p>
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>

              {/* Menu on popover */}
              <div>
                <p style={sectionTitle}>Menu hover (accent on popover)</p>
                <Menu.Root modal={false}>
                  <Menu.Trigger render={<Button variant="outline" />}>Open menu</Menu.Trigger>
                  <Menu.Content className="astw:min-w-[10rem]">
                    <Menu.Item>Default item</Menu.Item>
                    <Menu.Item>Hover me</Menu.Item>
                    <Menu.Item>Another item</Menu.Item>
                  </Menu.Content>
                </Menu.Root>
              </div>

              {/* Sidebar selection simulation */}
              <div>
                <p style={sectionTitle}>Sidebar selection (accent on transparent chrome)</p>
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--shell-gradient-base)",
                    // Keep the preview formula inline so this demo reads the
                    // same author-facing tokens palette files set: `base` + `tint`.
                    backgroundImage: `linear-gradient(
                      to bottom,
                      color-mix(in srgb, var(--shell-gradient-base) 55%, var(--shell-gradient-tint)) 0%,
                      color-mix(in srgb, var(--shell-gradient-base) 45%, var(--shell-gradient-tint)) 20%,
                      color-mix(in srgb, var(--shell-gradient-base) 30%, var(--shell-gradient-tint)) 40%,
                      color-mix(in srgb, var(--shell-gradient-base) 15%, var(--shell-gradient-tint)) 55%,
                      color-mix(in srgb, var(--shell-gradient-base) 6%, var(--shell-gradient-tint)) 65%,
                      var(--shell-gradient-tint) 70%,
                      var(--shell-gradient-tint) 100%
                    )`,
                    border: "1px solid var(--border)",
                    maxWidth: "14rem",
                  }}
                >
                  <div
                    style={{
                      padding: "0.5rem 0.625rem",
                      borderRadius: "var(--radius-md)",
                      color: "var(--sidebar-foreground)",
                      fontSize: "0.875rem",
                    }}
                  >
                    Home
                  </div>
                  <div
                    style={{
                      padding: "0.5rem 0.625rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--sidebar-accent)",
                      color: "var(--sidebar-accent-foreground)",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    Selected item
                  </div>
                  <div
                    style={{
                      padding: "0.5rem 0.625rem",
                      borderRadius: "var(--radius-md)",
                      color: "var(--sidebar-foreground)",
                      fontSize: "0.875rem",
                    }}
                  >
                    Settings
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      </Layout.Column>
    </Layout>
  );
};

export const colorDemoResource = defineResource({
  path: "color",
  meta: {
    title: "Color",
  },
  component: ColorDemoPage,
});
