import { Select } from "@tailor-platform/app-shell";
import {
  PageContainer,
  Section,
  programmingLanguages,
  shippingMethods,
} from "../../../shared";

const MultipleSelectDemo = () => {
  return (
    <Select.Root multiple>
      <Select.Trigger>
        <Select.Value placeholder="Select languages..." />
      </Select.Trigger>
      <Select.Content>
        {programmingLanguages.map((lang) => (
          <Select.Item key={lang} value={lang}>
            {lang}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
};

const ObjectValueSelectDemo = () => {
  const items = shippingMethods.map((m) => ({
    label: m.label,
    value: m.id,
  }));

  return (
    <Select.Root items={items}>
      <Select.Trigger>
        <Select.Value placeholder="Select shipping method...">
          {(value: string) => {
            const method = shippingMethods.find((m) => m.id === value);
            return method ? method.label : value;
          }}
        </Select.Value>
      </Select.Trigger>
      <Select.Content>
        {shippingMethods.map((method) => (
          <Select.Item key={method.id} value={method.id}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.125rem",
              }}
            >
              <span>{method.label}</span>
              <span className="astw:text-xs astw:text-muted-foreground">
                {method.description} ({method.price})
              </span>
            </div>
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
};

const SelectPage = () => {
  return (
    <PageContainer>
      <Section title="Select">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#888",
                marginBottom: "0.5rem",
                display: "block",
              }}
            >
              Basic
            </span>
            <Select.Root defaultValue="apple">
              <Select.Trigger>
                <Select.Value placeholder="Select a fruit..." />
              </Select.Trigger>
              <Select.Content>
                <Select.Group>
                  <Select.GroupLabel>Fruits</Select.GroupLabel>
                  <Select.Item value="apple">Apple</Select.Item>
                  <Select.Item value="banana">Banana</Select.Item>
                  <Select.Item value="orange">Orange</Select.Item>
                </Select.Group>
                <Select.Separator />
                <Select.Group>
                  <Select.GroupLabel>Vegetables</Select.GroupLabel>
                  <Select.Item value="carrot">Carrot</Select.Item>
                  <Select.Item value="broccoli">Broccoli</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>

          <div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#888",
                marginBottom: "0.5rem",
                display: "block",
              }}
            >
              Multiple
            </span>
            <MultipleSelectDemo />
          </div>

          <div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#888",
                marginBottom: "0.5rem",
                display: "block",
              }}
            >
              Object Values
            </span>
            <ObjectValueSelectDemo />
          </div>
        </div>
      </Section>
    </PageContainer>
  );
};

export default SelectPage;
