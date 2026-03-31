import {
  defineResource,
  Layout,
  Card,
  Button,
  Dialog,
  Table,
  Field,
  Fieldset,
  Form,
  Select,
  Combobox,
  Autocomplete,
} from "@tailor-platform/app-shell";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";

type ProfileFormData = {
  username: string;
  email: string;
  bio: string;
};

const FormComponentsDemoPage = () => {
  const [serverErrors, setServerErrors] = React.useState<Record<string, string>>({});
  const [submittedData, setSubmittedData] = React.useState<ProfileFormData | null>(null);

  // Select / Combobox / Autocomplete data
  type FruitOption = { id: string; name: string };
  const fruitOptions: FruitOption[] = [
    { id: "apple", name: "Apple" },
    { id: "banana", name: "Banana" },
    { id: "cherry", name: "Cherry" },
    { id: "grape", name: "Grape" },
    { id: "mango", name: "Mango" },
    { id: "orange", name: "Orange" },
  ];
  const comboItems = ["Apple", "Banana", "Cherry", "Grape", "Mango", "Orange"];

  const labelStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    color: "var(--muted-foreground)",
    marginBottom: "0.5rem",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1rem",
  };

  return (
    <Layout>
      <Layout.Header title="Form Components" />
      <Layout.Column>
        <div style={gridStyle}>
          {/* Basic Field */}
          <Card.Root>
            <Card.Header title="Field" />
            <Card.Content>
              <p style={labelStyle}>
                A compound component that groups label, control, description, and error message.
                Wrapped in a Form to demonstrate submit.
              </p>
              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  const fd = new FormData(event.currentTarget);
                  setSubmittedData({
                    username: fd.get("username") as string,
                    email: fd.get("email") as string,
                    bio: fd.get("bio") as string,
                  });
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <Field.Root name="username">
                  <Field.Label>Username</Field.Label>
                  <Field.Control placeholder="Enter your username" required />
                  <Field.Description>Your unique display name.</Field.Description>
                  <Field.Error match="valueMissing">Username is required.</Field.Error>
                </Field.Root>

                <Field.Root name="email">
                  <Field.Label>Email</Field.Label>
                  <Field.Control type="email" placeholder="you@example.com" required />
                  <Field.Error match="valueMissing">Email is required.</Field.Error>
                  <Field.Error match="typeMismatch">
                    Please enter a valid email address.
                  </Field.Error>
                </Field.Root>

                <Field.Root name="bio">
                  <Field.Label>Bio</Field.Label>
                  <Field.Control render={<textarea />} placeholder="Tell us about yourself" />
                  <Field.Description>Optional — max 200 characters.</Field.Description>
                </Field.Root>

                <Field.Root name="disabled-field" disabled>
                  <Field.Label>Disabled Field</Field.Label>
                  <Field.Control placeholder="Cannot edit" />
                  <Field.Description>This field is disabled.</Field.Description>
                </Field.Root>

                <div>
                  <Button type="submit">Submit</Button>
                </div>
              </Form>

              <Dialog.Root
                open={submittedData !== null}
                onOpenChange={(open) => {
                  if (!open) setSubmittedData(null);
                }}
              >
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title>Submitted Data</Dialog.Title>
                    <Dialog.Description>The following values were submitted:</Dialog.Description>
                  </Dialog.Header>
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>Field</Table.Head>
                        <Table.Head>Value</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {submittedData && (
                        <>
                          <Table.Row>
                            <Table.Cell style={{ fontWeight: 500 }}>Username</Table.Cell>
                            <Table.Cell>
                              {submittedData.username || (
                                <span style={{ color: "var(--muted-foreground)" }}>(empty)</span>
                              )}
                            </Table.Cell>
                          </Table.Row>
                          <Table.Row>
                            <Table.Cell style={{ fontWeight: 500 }}>Email</Table.Cell>
                            <Table.Cell>
                              {submittedData.email || (
                                <span style={{ color: "var(--muted-foreground)" }}>(empty)</span>
                              )}
                            </Table.Cell>
                          </Table.Row>
                          <Table.Row>
                            <Table.Cell style={{ fontWeight: 500 }}>Bio</Table.Cell>
                            <Table.Cell>
                              {submittedData.bio || (
                                <span style={{ color: "var(--muted-foreground)" }}>(empty)</span>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        </>
                      )}
                    </Table.Body>
                  </Table.Root>
                  <Dialog.Footer>
                    <Dialog.Close render={<Button />}>Close</Dialog.Close>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog.Root>
            </Card.Content>
          </Card.Root>

          {/* Fieldset */}
          <Card.Root>
            <Card.Header title="Fieldset" />
            <Card.Content>
              <p style={labelStyle}>
                Groups related fields under a semantic <code>&lt;fieldset&gt;</code> with a{" "}
                <code>&lt;legend&gt;</code>.
              </p>
              <Fieldset.Root
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <Fieldset.Legend>Shipping Address</Fieldset.Legend>

                <Field.Root name="street">
                  <Field.Label>Street</Field.Label>
                  <Field.Control placeholder="123 Main St" />
                </Field.Root>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <Field.Root name="city" style={{ flex: 1 }}>
                    <Field.Label>City</Field.Label>
                    <Field.Control placeholder="City" />
                  </Field.Root>

                  <Field.Root name="zip" style={{ width: "120px" }}>
                    <Field.Label>ZIP</Field.Label>
                    <Field.Control placeholder="00000" />
                  </Field.Root>
                </div>
              </Fieldset.Root>
            </Card.Content>
          </Card.Root>

          {/* Field with custom validation */}
          <Card.Root>
            <Card.Header title="Field — Custom Validation" />
            <Card.Content>
              <p style={labelStyle}>
                Use the <code>validate</code> prop for custom validation logic.
              </p>
              <Field.Root
                name="password"
                validationMode="onChange"
                validate={(value) => {
                  const v = String(value ?? "");
                  if (v.length > 0 && v.length < 8) {
                    return "Password must be at least 8 characters.";
                  }
                  return null;
                }}
              >
                <Field.Label>Password</Field.Label>
                <Field.Control type="password" placeholder="At least 8 characters" />
                <Field.Error />
              </Field.Root>
            </Card.Content>
          </Card.Root>

          {/* Field.Validity */}
          <Card.Root>
            <Card.Header title="Field.Validity" />
            <Card.Content>
              <p style={labelStyle}>
                Render-prop that exposes the field's <code>ValidityState</code> for custom
                rendering.
              </p>
              <Field.Root name="age" validationMode="onChange">
                <Field.Label>Age</Field.Label>
                <Field.Control type="number" min={0} max={150} placeholder="0–150" />
                <Field.Validity>
                  {(state) =>
                    state.validity.rangeOverflow ? (
                      <p
                        style={{
                          color: "var(--destructive)",
                          fontSize: "0.875rem",
                        }}
                      >
                        Age cannot exceed 150.
                      </p>
                    ) : null
                  }
                </Field.Validity>
              </Field.Root>
            </Card.Content>
          </Card.Root>

          {/* Field + Dropdown Components */}
          <Card.Root style={{ gridColumn: "1 / -1" }}>
            <Card.Header title="Field + Dropdown Components" />
            <Card.Content>
              <p style={labelStyle}>
                Select, Combobox, Autocomplete composed with Field for labeling, description, and
                validation.
              </p>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                <Field.Root
                  name="fruit-select"
                  style={{ flex: 1 }}
                  className="astw:items-stretch"
                  validate={(value) => {
                    const v = value as FruitOption | null;
                    if (v?.name !== "Mango") {
                      return 'Please select "Mango".';
                    }
                    return null;
                  }}
                  validationMode="onChange"
                >
                  <Field.Label>Select</Field.Label>
                  <Select
                    items={fruitOptions}
                    mapItem={(f) => ({ label: f.name, key: f.id })}
                    placeholder="Choose a fruit"
                  />
                  <Field.Description>Must be "Mango".</Field.Description>
                  <Field.Error />
                </Field.Root>

                <Field.Root
                  name="fruit-combobox"
                  style={{ flex: 1 }}
                  className="astw:items-stretch"
                  validate={(value) => {
                    const v = value as string[] | undefined;
                    if (!v || v.length === 0) {
                      return "Select at least one fruit.";
                    }
                    return null;
                  }}
                  validationMode="onChange"
                >
                  <Field.Label>Combobox</Field.Label>
                  <Combobox items={comboItems} multiple placeholder="Search fruits..." />
                  <Field.Description>Required — at least one.</Field.Description>
                  <Field.Error />
                </Field.Root>

                <Field.Root
                  name="fruit-autocomplete"
                  style={{ flex: 1 }}
                  className="astw:items-stretch"
                  validate={(value) => {
                    const v = String(value ?? "");
                    if (v !== "" && v !== "Cherry") {
                      return 'Please type "Cherry".';
                    }
                    return null;
                  }}
                  validationMode="onChange"
                >
                  <Field.Label>Autocomplete</Field.Label>
                  <Autocomplete
                    items={fruitOptions}
                    mapItem={(f) => ({ label: f.name, key: f.id })}
                    placeholder="Type a fruit..."
                  />
                  <Field.Description>Must be "Cherry".</Field.Description>
                  <Field.Error />
                </Field.Root>
              </div>
            </Card.Content>
          </Card.Root>

          {/* Form with submit — spans full width */}
          <Card.Root style={{ gridColumn: "1 / -1" }}>
            <Card.Header title="Form — Submit & Server Errors" />
            <Card.Content>
              <p style={labelStyle}>
                Wraps fields in a <code>&lt;form&gt;</code> with consolidated error handling.
              </p>
              <Form
                errors={serverErrors}
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const url = String(formData.get("url") ?? "");

                  // Simulate a server-side error
                  if (url && !url.startsWith("https://")) {
                    setServerErrors({ url: "URL must start with https://" });
                    return;
                  }

                  setServerErrors({});
                  alert(`Submitted URL: ${url}`);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  maxWidth: "480px",
                }}
              >
                <Field.Root name="url">
                  <Field.Label>Homepage URL</Field.Label>
                  <Field.Control type="url" required placeholder="https://example.com" />
                  <Field.Description>Must start with https://</Field.Description>
                  <Field.Error match="valueMissing">URL is required.</Field.Error>
                  <Field.Error match="typeMismatch">Please enter a valid URL.</Field.Error>
                </Field.Root>
                <div>
                  <Button type="submit">Submit</Button>
                </div>
              </Form>
            </Card.Content>
          </Card.Root>
        </div>
      </Layout.Column>
    </Layout>
  );
};

export const formComponentsDemoResource = defineResource({
  path: "form-demo",
  meta: {
    title: "Form Components Demo",
  },
  component: FormComponentsDemoPage,
});

// ---------------------------------------------------------------------------
// Zod + React Hook Form Demo
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  email: z.string().email("Please enter a valid email address"),
  age: z
    .number({ error: "Age is required" })
    .min(18, "Must be at least 18")
    .max(120, "Must be 120 or less"),
  website: z.union([z.url("Please enter a valid URL"), z.literal("")]).optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const ZodRHFFormDemoPage = () => {
  const [submittedData, setSubmittedData] = React.useState<ContactFormValues | null>(null);

  const { control, handleSubmit, reset } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      age: undefined,
      website: "",
      message: "",
    },
  });

  const onSubmit = (data: ContactFormValues) => {
    setSubmittedData(data);
  };

  return (
    <Layout>
      <Layout.Column>
        <div style={{ maxWidth: 480 }}>
          <h2 style={{ fontWeight: "bold", marginBottom: "1rem" }}>Zod + React Hook Form Demo</h2>

          <Form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <Fieldset.Root style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Fieldset.Legend>Contact Information</Fieldset.Legend>

              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field.Root {...fieldState}>
                    <Field.Label>Name</Field.Label>
                    <Field.Control {...field} placeholder="John Doe" />
                    <Field.Error match={fieldState.invalid}>
                      {fieldState.error?.message}
                    </Field.Error>
                  </Field.Root>
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field.Root {...fieldState}>
                    <Field.Label>Email</Field.Label>
                    <Field.Control {...field} type="email" placeholder="john@example.com" />
                    <Field.Description>We will never share your email.</Field.Description>
                    <Field.Error match={fieldState.invalid}>
                      {fieldState.error?.message}
                    </Field.Error>
                  </Field.Root>
                )}
              />

              <Controller
                name="age"
                control={control}
                render={({ field: { onChange, value, ...field }, fieldState }) => (
                  <Field.Root {...fieldState}>
                    <Field.Label>Age</Field.Label>
                    <Field.Control
                      {...field}
                      type="number"
                      placeholder="25"
                      value={value ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onChange(e.target.value === "" ? undefined : Number(e.target.value))
                      }
                    />
                    <Field.Error match={fieldState.invalid}>
                      {fieldState.error?.message}
                    </Field.Error>
                  </Field.Root>
                )}
              />

              <Controller
                name="website"
                control={control}
                render={({ field, fieldState }) => (
                  <Field.Root {...fieldState}>
                    <Field.Label>Website</Field.Label>
                    <Field.Control {...field} type="url" placeholder="https://example.com" />
                    <Field.Description>Optional</Field.Description>
                    <Field.Error match={fieldState.invalid}>
                      {fieldState.error?.message}
                    </Field.Error>
                  </Field.Root>
                )}
              />

              <Controller
                name="message"
                control={control}
                render={({ field, fieldState }) => (
                  <Field.Root {...fieldState}>
                    <Field.Label>Message</Field.Label>
                    <Field.Control {...field} placeholder="Tell us something..." />
                    <Field.Description>At least 10 characters</Field.Description>
                    <Field.Error match={fieldState.invalid}>
                      {fieldState.error?.message}
                    </Field.Error>
                  </Field.Root>
                )}
              />
            </Fieldset.Root>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <Button type="submit">Submit</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setSubmittedData(null);
                }}
              >
                Reset
              </Button>
            </div>
          </Form>

          {submittedData && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                borderRadius: "0.5rem",
                border: "1px solid #e2e8f0",
                fontSize: "0.875rem",
              }}
            >
              <strong>Submitted values:</strong>
              <pre style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>
                {JSON.stringify(submittedData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Layout.Column>
    </Layout>
  );
};

export const zodRHFFormDemoResource = defineResource({
  path: "zod-rhf-form-demo",
  meta: {
    title: "Zod + RHF Form Demo",
  },
  component: ZodRHFFormDemoPage,
});
