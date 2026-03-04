import {
  Button,
  Field,
  Fieldset,
  Form,
  Input,
  NumberField,
} from "@tailor-platform/app-shell";
import { Section } from "../../../shared";

const FieldsPage = () => {
  return (
    <div
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <Section title="Form Controls (Field / Fieldset / Form / Input / NumberField / Label)">
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Form submitted!");
          }}
        >
          <Fieldset.Root>
            <Fieldset.Legend>User Information</Fieldset.Legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginTop: "0.75rem",
              }}
            >
              <Field.Root>
                <Field.Label>Full Name</Field.Label>
                <Field.Control render={<Input placeholder="John Doe" />} />
                <Field.Description>
                  Enter your full legal name.
                </Field.Description>
              </Field.Root>

              <Field.Root>
                <Field.Label>Email</Field.Label>
                <Field.Control
                  render={
                    <Input type="email" placeholder="john@example.com" />
                  }
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Quantity</Field.Label>
                <NumberField.Root defaultValue={1} min={0} max={100}>
                  <NumberField.Group>
                    <NumberField.Decrement />
                    <NumberField.Input />
                    <NumberField.Increment />
                  </NumberField.Group>
                </NumberField.Root>
              </Field.Root>
            </div>
          </Fieldset.Root>
          <div style={{ marginTop: "1rem" }}>
            <Button type="submit">Submit</Button>
          </div>
        </Form>
      </Section>
    </div>
  );
};

export default FieldsPage;
