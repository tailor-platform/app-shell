import { Avatar, Separator } from "@tailor-platform/app-shell";
import { PageContainer, Section } from "../../../shared";

const AvatarSeparatorPage = () => {
  return (
    <PageContainer>
      <Section title="Avatar">
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
          }}
        >
          <Avatar.Root>
            <Avatar.Image src="https://github.com/github.png" alt="GitHub" />
            <Avatar.Fallback>GH</Avatar.Fallback>
          </Avatar.Root>
          <Avatar.Root>
            <Avatar.Fallback>JD</Avatar.Fallback>
          </Avatar.Root>
          <Avatar.Root>
            <Avatar.Fallback>CN</Avatar.Fallback>
          </Avatar.Root>
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

export default AvatarSeparatorPage;
