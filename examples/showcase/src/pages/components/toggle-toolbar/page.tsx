import { Toggle, ToggleGroup, Toolbar } from "@tailor-platform/app-shell";
import {
  PageContainer,
  Section,
  SectionLabel,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
} from "../../../shared";

const ToggleToolbarPage = () => {
  return (
    <PageContainer>
      <Section title="Toggle & ToggleGroup">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div>
            <SectionLabel>Individual Toggles</SectionLabel>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.5rem",
              }}
            >
              <Toggle variant="outline" size="sm">
                <BoldIcon />
              </Toggle>
              <Toggle variant="outline" size="sm">
                <ItalicIcon />
              </Toggle>
              <Toggle variant="outline" size="sm">
                <UnderlineIcon />
              </Toggle>
            </div>
          </div>
          <div>
            <SectionLabel>Toggle Group</SectionLabel>
            <div style={{ marginTop: "0.5rem" }}>
              <ToggleGroup>
                <Toggle value="bold" variant="outline" size="sm">
                  <BoldIcon />
                </Toggle>
                <Toggle value="italic" variant="outline" size="sm">
                  <ItalicIcon />
                </Toggle>
                <Toggle value="underline" variant="outline" size="sm">
                  <UnderlineIcon />
                </Toggle>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Toolbar">
        <Toolbar.Root>
          <Toolbar.Group>
            <Toolbar.Button>
              <BoldIcon />
            </Toolbar.Button>
            <Toolbar.Button>
              <ItalicIcon />
            </Toolbar.Button>
            <Toolbar.Button>
              <UnderlineIcon />
            </Toolbar.Button>
          </Toolbar.Group>
          <Toolbar.Separator />
          <Toolbar.Group>
            <Toolbar.Button>
              <AlignLeftIcon />
            </Toolbar.Button>
            <Toolbar.Button>
              <AlignCenterIcon />
            </Toolbar.Button>
            <Toolbar.Button>
              <AlignRightIcon />
            </Toolbar.Button>
          </Toolbar.Group>
          <Toolbar.Separator />
          <Toolbar.Link href="#">Help</Toolbar.Link>
        </Toolbar.Root>
      </Section>
    </PageContainer>
  );
};

export default ToggleToolbarPage;
