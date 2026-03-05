import { useState } from "react";
import {
  Switch,
  Slider,
  Radio,
  RadioGroup,
  Checkbox,
  CheckboxGroup,
} from "@tailor-platform/app-shell";
import { PageContainer, Section, SectionLabel } from "../../../shared";

const SwitchSliderRadioPage = () => {
  const [switchChecked, setSwitchChecked] = useState(false);
  const [radioValue, setRadioValue] = useState("option1");
  const [checkboxA, setCheckboxA] = useState(false);
  const [checkboxB, setCheckboxB] = useState(true);

  return (
    <PageContainer>
      <Section title="Switch / Slider / Radio / Checkbox">
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
              gap: "0.75rem",
            }}
          >
            <SectionLabel>Switch</SectionLabel>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <Switch
                checked={switchChecked}
                onCheckedChange={setSwitchChecked}
              />
              <span className="astw:text-sm astw:text-muted-foreground">
                Notifications {switchChecked ? "enabled" : "disabled"}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <SectionLabel>Slider</SectionLabel>
            <Slider.Root defaultValue={[33]} />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <SectionLabel>Radio Group</SectionLabel>
            <RadioGroup
              value={radioValue}
              onValueChange={(value) => setRadioValue(value as string)}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {[
                  { value: "option1", label: "Small" },
                  { value: "option2", label: "Medium" },
                  { value: "option3", label: "Large" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Radio value={opt.value} />
                    <span className="astw:text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <SectionLabel>Checkbox Group</SectionLabel>
            <CheckboxGroup>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <label
                  htmlFor="checkbox-terms"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Checkbox
                    id="checkbox-terms"
                    checked={checkboxA}
                    onCheckedChange={(val) => setCheckboxA(val as boolean)}
                  />
                  <span className="astw:text-sm">
                    Accept terms and conditions
                  </span>
                </label>
                <label
                  htmlFor="checkbox-newsletter"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Checkbox
                    id="checkbox-newsletter"
                    checked={checkboxB}
                    onCheckedChange={(val) => setCheckboxB(val as boolean)}
                  />
                  <span className="astw:text-sm">Subscribe to newsletter</span>
                </label>
              </div>
            </CheckboxGroup>
          </div>
        </div>
      </Section>
    </PageContainer>
  );
};

export default SwitchSliderRadioPage;
