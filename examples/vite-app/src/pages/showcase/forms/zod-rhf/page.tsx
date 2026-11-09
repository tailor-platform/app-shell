import {
  Layout,
  Button,
  Field,
  Fieldset,
  Form,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  email: z.string().email("Please enter a valid email address"),
  age: z
    .number({
      error: "Age is required",
    })
    .min(18, "Must be at least 18")
    .max(120, "Must be 120 or less"),
  website: z.union([z.string().url("Please enter a valid URL"), z.literal("")]).optional(),
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

ZodRHFFormDemoPage.appShellPageProps = {
  meta: {
    title: "Zod + RHF Form Demo",
  },
} satisfies AppShellPageProps;

export default ZodRHFFormDemoPage;
