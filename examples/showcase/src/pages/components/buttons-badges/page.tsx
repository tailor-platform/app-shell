import { Button, Badge, Separator } from "@tailor-platform/app-shell";
import { PageContainer, Section, InfoIcon } from "../../../shared";

const ButtonsBadgesPage = () => {
  return (
    <PageContainer>
      <Section title="Button">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <span className="astw:text-sm astw:font-medium">Variants</span>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <span className="astw:text-sm astw:font-medium">Sizes</span>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
              <InfoIcon />
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Badge">
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Badge variant="default">Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="outline-success">Outline Success</Badge>
          <Badge variant="outline-warning">Outline Warning</Badge>
          <Badge variant="outline-error">Outline Error</Badge>
          <Badge variant="outline-info">Outline Info</Badge>
          <Badge variant="outline-neutral">Outline Neutral</Badge>
        </div>
      </Section>

      <Section title="Separator">
        <div>
          <div className="astw:text-sm">Content above</div>
          <Separator className="astw:my-4" />
          <div className="astw:text-sm">Content below</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            height: "1.5rem",
          }}
        >
          <span className="astw:text-sm">Left</span>
          <Separator orientation="vertical" />
          <span className="astw:text-sm">Center</span>
          <Separator orientation="vertical" />
          <span className="astw:text-sm">Right</span>
        </div>
      </Section>
    </PageContainer>
  );
};

export default ButtonsBadgesPage;
