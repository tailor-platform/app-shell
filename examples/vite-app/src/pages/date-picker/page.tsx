import { useState, type FormEvent } from "react";
import {
  Layout,
  DateField,
  DatePicker,
  Calendar,
  Form,
  Field,
  Button,
  useTimeZone,
  parseDate,
  type CalendarDate,
  type DateValue,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { CalendarDays } from "lucide-react";

const DatePickerPage = () => {
  const tz = useTimeZone();
  const [fieldValue, setFieldValue] = useState<CalendarDate | null>(null);
  const [pickerValue, setPickerValue] = useState<CalendarDate | null>(null);
  const [calendarValue, setCalendarValue] = useState<DateValue | null>(null);
  const [weekendValue, setWeekendValue] = useState<CalendarDate | null>(null);

  // Form-validation demo state.
  const [deliveryDate, setDeliveryDate] = useState<CalendarDate | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | undefined>(undefined);
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);

  const tomorrow = tz.today().add({ days: 1 });
  const threeMonths = tz.today().add({ months: 3 });

  // Validation runs on submit; the DatePicker composes with Field.Root for the
  // label + error presentation, like the rest of the control set.
  const handleDeliverySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!deliveryDate) {
      setConfirmedDate(null);
      setDeliveryError("Please select a delivery date.");
      return;
    }
    if (deliveryDate.compare(tz.today()) < 0) {
      setConfirmedDate(null);
      setDeliveryError("Delivery date can't be in the past.");
      return;
    }
    setDeliveryError(undefined);
    setConfirmedDate(deliveryDate.toString());
  };

  return (
    <Layout>
      <Layout.Header title="DatePicker" />
      <Layout.Column>
        <div className="mb-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
          <strong>Implementation: @internationalized/date + Base UI.</strong> Same public API and
          a11y/localization contract as the react-aria variant — segmented input, calendar grid, and
          APG keyboard support are hand-rolled here. Net-new dependency: just{" "}
          <code className="bg-muted px-1 py-0.5 rounded">@internationalized/date</code> (~11 KB gz);
          Base UI is already in the bundle.
        </div>
        <p className="mb-8 text-muted-foreground">
          Interactive demo of{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm">DateField</code>,{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm">DatePicker</code>, and{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm">Calendar</code>. Try keyboard:
          arrows in segments, arrows/PageUp/PageDown/Home/End in the calendar grid.
        </p>

        <div className="grid gap-10 max-w-2xl">
          {/* ── DateField ──────────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold border-b pb-2">DateField</h2>

            <div className="flex flex-wrap gap-6 items-start">
              <Field.Root>
                <Field.Label>Basic</Field.Label>
                <DateField
                  aria-label="Basic"
                  value={fieldValue}
                  onChange={(v) => setFieldValue(v as CalendarDate | null)}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>With description</Field.Label>
                <DateField
                  aria-label="With description"
                  minValue={tomorrow}
                  maxValue={threeMonths}
                />
                <Field.Description>Select a date within the next 3 months</Field.Description>
              </Field.Root>
              <Field.Root disabled>
                <Field.Label>Disabled</Field.Label>
                <DateField aria-label="Disabled" defaultValue={parseDate("2025-06-15")} />
              </Field.Root>
              <Field.Root>
                <Field.Label>Required</Field.Label>
                <DateField aria-label="Required" isRequired />
              </Field.Root>
            </div>

            {fieldValue && (
              <p className="text-sm text-muted-foreground">
                Selected: <strong>{fieldValue.toString()}</strong>
              </p>
            )}
          </section>

          {/* ── DatePicker ─────────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold border-b pb-2">DatePicker</h2>

            <div className="flex flex-wrap gap-6 items-start">
              <Field.Root>
                <Field.Label>Basic</Field.Label>
                <DatePicker
                  aria-label="Basic"
                  value={pickerValue}
                  onChange={(v) => setPickerValue(v as CalendarDate | null)}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Future dates only</Field.Label>
                <DatePicker aria-label="Future dates only" minValue={tomorrow} />
                <Field.Description>Minimum: tomorrow</Field.Description>
              </Field.Root>
              <Field.Root>
                <Field.Label>No weekends</Field.Label>
                <DatePicker
                  aria-label="No weekends"
                  isDateUnavailable={(d) => {
                    const day = d.toDate(tz.value).getDay();
                    return day === 0 || day === 6;
                  }}
                />
                <Field.Description>Weekday dates only</Field.Description>
              </Field.Root>
              <Field.Root>
                <Field.Label>With range</Field.Label>
                <DatePicker aria-label="With range" minValue={tz.today()} maxValue={threeMonths} />
                <Field.Description>{`Today → ${threeMonths.toString()}`}</Field.Description>
              </Field.Root>
            </div>

            {pickerValue && (
              <p className="text-sm text-muted-foreground">
                Selected: <strong>{pickerValue.toString()}</strong>
              </p>
            )}
          </section>

          {/* ── In a form (submit validation) ───────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold border-b pb-2">In a form (submit validation)</h2>
            <p className="text-sm text-muted-foreground">
              Standard <code className="bg-muted px-1 py-0.5 rounded">Form</code> +{" "}
              <code className="bg-muted px-1 py-0.5 rounded">Field.Root</code>. Submitting empty (or
              with a past date) marks the field invalid through the field shell, and the error
              clears as soon as a valid date is picked.
            </p>
            <Form
              onSubmit={handleDeliverySubmit}
              className="flex flex-col items-start gap-4 max-w-sm"
            >
              <Field.Root invalid={!!deliveryError}>
                <Field.Label>Delivery date</Field.Label>
                <DatePicker
                  aria-label="Delivery date"
                  isRequired
                  value={deliveryDate}
                  onChange={(v) => {
                    setDeliveryDate(v as CalendarDate | null);
                    if (v) setDeliveryError(undefined);
                  }}
                />
                <Field.Description>When should we ship your order?</Field.Description>
                <Field.Error match={!!deliveryError}>{deliveryError}</Field.Error>
              </Field.Root>
              <Button type="submit">Schedule delivery</Button>
            </Form>
            {confirmedDate && (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                ✓ Delivery scheduled for <strong>{confirmedDate}</strong>
              </p>
            )}
          </section>

          {/* ── DatePicker week start ───────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold border-b pb-2">DatePicker — week start</h2>
            <p className="text-sm text-muted-foreground">
              Omitting <code className="bg-muted px-1 py-0.5 rounded">firstDayOfWeek</code> follows
              the active locale's convention (e.g. Sunday for en-US, Monday for en-GB). Pass it
              explicitly to force a specific start day regardless of locale.
            </p>
            <div className="flex flex-wrap gap-6 items-start">
              <Field.Root>
                <Field.Label>Forced Sunday</Field.Label>
                <DatePicker aria-label="Forced Sunday" firstDayOfWeek="sun" />
              </Field.Root>
              <Field.Root>
                <Field.Label>Forced Monday</Field.Label>
                <DatePicker aria-label="Forced Monday" firstDayOfWeek="mon" />
              </Field.Root>
              <Field.Root>
                <Field.Label>Locale default</Field.Label>
                <DatePicker aria-label="Locale default" />
              </Field.Root>
            </div>
          </section>

          {/* ── Locale ──────────────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold border-b pb-2">
              Locale (segment order + names)
            </h2>
            <div className="flex flex-wrap gap-6 items-start">
              <Field.Root>
                <Field.Label>en-US (MM/DD/YYYY)</Field.Label>
                <DatePicker aria-label="en-US (MM/DD/YYYY)" locale="en-US" />
              </Field.Root>
              <Field.Root>
                <Field.Label>en-GB (DD/MM/YYYY, Mon-first)</Field.Label>
                <DatePicker aria-label="en-GB (DD/MM/YYYY, Mon-first)" locale="en-GB" />
              </Field.Root>
              <Field.Root>
                <Field.Label>ja-JP (YYYY/MM/DD)</Field.Label>
                <DatePicker aria-label="ja-JP (YYYY/MM/DD)" locale="ja-JP" />
              </Field.Root>
            </div>
          </section>

          {/* ── Calendar ───────────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold border-b pb-2">Calendar (standalone)</h2>

            <div className="flex flex-wrap gap-8 items-start">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Basic</p>
                <Calendar
                  aria-label="Select date"
                  value={calendarValue}
                  onChange={setCalendarValue}
                />
                {calendarValue && (
                  <p className="text-sm text-muted-foreground">
                    Selected: <strong>{calendarValue.toString()}</strong>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Pre-selected + min/max</p>
                <Calendar
                  aria-label="Constrained calendar"
                  defaultValue={parseDate("2025-06-15")}
                  minValue={parseDate("2025-06-01")}
                  maxValue={parseDate("2025-06-30")}
                />
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">No weekends</p>
                <Calendar
                  aria-label="Weekdays only"
                  isDateUnavailable={(d) => {
                    const day = d.toDate(tz.value).getDay();
                    return day === 0 || day === 6;
                  }}
                  value={weekendValue}
                  onChange={(v) => setWeekendValue(v as CalendarDate)}
                />
              </div>
            </div>
          </section>
        </div>
      </Layout.Column>
    </Layout>
  );
};

DatePickerPage.appShellPageProps = {
  meta: {
    title: "DatePicker",
    icon: <CalendarDays size={16} />,
  },
} satisfies AppShellPageProps;

export default DatePickerPage;
