import { Progress, Meter } from "@tailor-platform/app-shell";
import { PageContainer, Section, SectionLabel } from "../../../shared";

const ProgressMeterPage = () => {
  return (
    <PageContainer>
      <Section title="Progress & Meter">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <SectionLabel>Progress</SectionLabel>
              <span className="astw:text-sm astw:text-muted-foreground">
                65%
              </span>
            </div>
            <Progress value={65} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <SectionLabel>Meter (Storage)</SectionLabel>
              <span className="astw:text-sm astw:text-muted-foreground">
                78%
              </span>
            </div>
            <Meter value={78} />
          </div>
        </div>
      </Section>
    </PageContainer>
  );
};

export default ProgressMeterPage;
