import {
  defineResource,
  Layout,
  Button,
  Field,
  Fieldset,
  Form,
  DateRangePicker,
  useTimeZone,
  type DateRange,
} from "@tailor-platform/app-shell";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// DateRangePicker in a real form: Base UI Form/Field + React Hook Form
// ---------------------------------------------------------------------------
//
// These layers are designed to be used *together*, not chosen between:
//
//   • Base UI `Form` / `Field.Root` / `Fieldset` own accessibility wiring
//     (label ↔ control association, `aria-describedby`, error announcement)
//     and error presentation. `Form` here is used purely as the form element —
//     `onSubmit={handleSubmit(...)}` hands submission to RHF (as opposed to
//     `onFormSubmit`, which you'd use *without* an external form library).
//
//   • React Hook Form owns state and validation — `useForm` + `zodResolver`
//     + `<Controller>`. The DateRangePicker's value is a structured
//     `{ start, end }` object, so it binds through `Controller` (not
//     `register`, which is for uncontrolled native inputs).
//
// The bridge that connects them: `<Field.Root {...fieldState}>` feeds RHF's
// validity *into* Field.Root, and the DateRangePicker reads it back out — so no
// manual `aria-*` or `isInvalid` is needed on the control. `Field.Label` auto-
// associates with the composite control, and `Field.Error` renders whatever RHF
// puts in `fieldState.error` — including async, server-side errors (below).
//
// One consumer gotcha this illustrates: when RHF/zod owns validation, don't
// *also* bind the control's own constraints (`isRequired`, `minValue`,
// `isDateUnavailable`). Those surface through the control's own bridge and RHF
// wouldn't know about them — pick one validator. Here everything lives in zod.

type PromoFormInput = { name: string; activePeriod: DateRange | null };
type PromoFormValues = { name: string; activePeriod: DateRange };

// Stand-in for a server-side rule the client can't know up front (e.g. an
// overlapping promotion already booked for these dates).
const BLACKOUT_DATE = "2026-08-25";
function checkPromotionOverlap(range: DateRange): Promise<string | null> {
  const overlaps = range.start.toString() <= BLACKOUT_DATE && BLACKOUT_DATE <= range.end.toString();
  return new Promise((resolve) => {
    setTimeout(
      () =>
        resolve(
          overlaps ? `This period overlaps an existing promotion on ${BLACKOUT_DATE}.` : null,
        ),
      600,
    );
  });
}

const DateRangeRHFPage = () => {
  const tz = useTimeZone();
  // Captured once so the schema/resolver identity stays stable across renders.
  const [today] = React.useState(() => tz.today());
  const [created, setCreated] = React.useState<{ name: string; start: string; end: string } | null>(
    null,
  );

  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().min(3, "Give the promotion a name (at least 3 characters)."),
        activePeriod: z
          .custom<DateRange | null>()
          // Presence first; later refines tolerate null so an empty range shows
          // only the "required" message, not a stack of them.
          .refine((value): value is DateRange => value != null, {
            message: "Select the active period.",
          })
          .refine((value) => value == null || value.end.compare(value.start) >= 0, {
            message: "The end date must be on or after the start date.",
          })
          .refine((value) => value == null || value.start.compare(today) >= 0, {
            message: "The promotion can't start in the past.",
          }),
      }),
    [today],
  );

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PromoFormInput, unknown, PromoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", activePeriod: null },
  });

  // The live DateRange object (or null) — RHF's native, structured shape.
  const period = watch("activePeriod");

  const onSubmit = async (data: PromoFormValues) => {
    const conflict = await checkPromotionOverlap(data.activePeriod);
    if (conflict) {
      // Route the server error back into the same Field.Error, keyed by name.
      setError("activePeriod", { type: "server", message: conflict });
      return;
    }
    setCreated({
      name: data.name,
      start: data.activePeriod.start.toString(),
      end: data.activePeriod.end.toString(),
    });
  };

  return (
    <Layout>
      <Layout.Column>
        <div style={{ maxWidth: 540 }}>
          <h2 style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>New promotion</h2>
          <p style={{ fontSize: "0.875rem", color: "#475569", marginBottom: "1.25rem" }}>
            The idiomatic composition: Base UI <code>Form</code> / <code>Field.Root</code> handle
            accessibility and error display, while React Hook Form (<code>Controller</code> + zod)
            owns state and validation. Try submitting empty, a reversed range, a past start, or a
            period covering <strong>{BLACKOUT_DATE}</strong> (a simulated server conflict).
          </p>

          <Form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <Fieldset.Root style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Fieldset.Legend>Promotion details</Fieldset.Legend>

              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field.Root {...fieldState}>
                    <Field.Label>Name</Field.Label>
                    <Field.Control {...field} placeholder="Summer sale" />
                    <Field.Error match={fieldState.invalid}>
                      {fieldState.error?.message}
                    </Field.Error>
                  </Field.Root>
                )}
              />

              <Controller
                name="activePeriod"
                control={control}
                render={({ field, fieldState }) => (
                  <Field.Root {...fieldState}>
                    <Field.Label>Active period</Field.Label>
                    <Field.Description>
                      When the promotion is live. Both dates are required.
                    </Field.Description>
                    {/* No manual aria-* or isInvalid: Field.Root associates the
                        label and feeds validity into the control's bridge. */}
                    <DateRangePicker
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                    <Field.Error match={fieldState.invalid}>
                      {fieldState.error?.message}
                    </Field.Error>
                  </Field.Root>
                )}
              />
            </Fieldset.Root>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Checking…" : "Create promotion"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setCreated(null);
                }}
              >
                Reset
              </Button>
            </div>
          </Form>

          <div
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #e2e8f0",
              fontSize: "0.8125rem",
            }}
          >
            <strong>
              <code>watch("activePeriod")</code>
            </strong>
            <pre style={{ marginTop: "0.5rem", marginBottom: 0, whiteSpace: "pre-wrap" }}>
              {period
                ? `{ start: ${period.start.toString()}, end: ${period.end.toString()} }`
                : "null"}
            </pre>
            {errors.activePeriod?.type === "server" && (
              <p style={{ marginTop: "0.5rem", marginBottom: 0, color: "#dc2626" }}>
                ↑ error came back from the (simulated) server via{" "}
                <code>setError(&quot;activePeriod&quot;, …)</code>.
              </p>
            )}
          </div>

          {created && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                fontSize: "0.8125rem",
              }}
            >
              <strong>Promotion created:</strong>
              <pre style={{ marginTop: "0.5rem", marginBottom: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(created, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Layout.Column>
    </Layout>
  );
};

export const dateRangeRHFDemoResource = defineResource({
  path: "date-range-rhf-demo",
  meta: {
    title: "DateRangePicker + RHF",
  },
  component: DateRangeRHFPage,
});
