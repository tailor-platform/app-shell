import { cloneElement, useState, type FormEvent, type ReactElement } from "react";
import {
  Layout,
  DateField,
  DatePicker,
  DateRangePicker,
  Calendar,
  RangeCalendar,
  Form,
  Field,
  Button,
  useTimeZone,
  parseDate,
  type CalendarDate,
  type DateValue,
  type DateRange,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { CalendarDays } from "lucide-react";

type DemoFieldControlProps = {
  id?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  isInvalid?: boolean;
};

function DemoField({
  id,
  label,
  description,
  error,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  error?: string;
  children: ReactElement<DemoFieldControlProps>;
}) {
  const describedBy = [description && `${id}-description`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1 items-start">
      <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-labelledby": `${id}-label`,
        "aria-describedby": describedBy || undefined,
        isInvalid: !!error || children.props.isInvalid,
      })}
      {description && (
        <p id={`${id}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const DatePickerPage = () => {
  const tz = useTimeZone();
  const [fieldValue, setFieldValue] = useState<CalendarDate | null>(null);
  const [pickerValue, setPickerValue] = useState<CalendarDate | null>(null);
  const [calendarValue, setCalendarValue] = useState<DateValue | null>(null);
  const [weekendValue, setWeekendValue] = useState<CalendarDate | null>(null);
  const [rangeValue, setRangeValue] = useState<DateRange | null>(null);
  const [inlineRange, setInlineRange] = useState<DateRange | null>(null);

  // Form-validation demo state.
  const [deliveryDate, setDeliveryDate] = useState<CalendarDate | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | undefined>(undefined);
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);

  const tomorrow = tz.today().add({ days: 1 });
  const threeMonths = tz.today().add({ months: 3 });

  // Validation runs on submit; label / description / error wiring stays plain
  // HTML + ARIA so the date controls don't depend on Base UI's internal Field plumbing.
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
              <DemoField id="date-field-basic" label="Basic">
                <DateField
                  value={fieldValue}
                  onChange={(v) => setFieldValue(v as CalendarDate | null)}
                />
              </DemoField>
              <DemoField
                id="date-field-with-description"
                label="With description"
                description="Select a date within the next 3 months"
              >
                <DateField minValue={tomorrow} maxValue={threeMonths} />
              </DemoField>
              <DemoField id="date-field-disabled" label="Disabled">
                <DateField isDisabled defaultValue={parseDate("2025-06-15")} />
              </DemoField>
              <DemoField id="date-field-required" label="Required">
                <DateField isRequired />
              </DemoField>
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
              <DemoField id="date-picker-basic" label="Basic">
                <DatePicker
                  value={pickerValue}
                  onChange={(v) => setPickerValue(v as CalendarDate | null)}
                />
              </DemoField>
              <DemoField
                id="date-picker-future"
                label="Future dates only"
                description="Minimum: tomorrow"
              >
                <DatePicker minValue={tomorrow} />
              </DemoField>
              <DemoField
                id="date-picker-weekdays"
                label="No weekends"
                description="Weekday dates only"
              >
                <DatePicker
                  isDateUnavailable={(d) => {
                    const day = d.toDate(tz.value).getDay();
                    return day === 0 || day === 6;
                  }}
                />
              </DemoField>
              <DemoField
                id="date-picker-range"
                label="With range"
                description={`Today → ${threeMonths.toString()}`}
              >
                <DatePicker minValue={tz.today()} maxValue={threeMonths} />
              </DemoField>
            </div>

            {pickerValue && (
              <p className="text-sm text-muted-foreground">
                Selected: <strong>{pickerValue.toString()}</strong>
              </p>
            )}
          </section>

          {/* ── DateRangePicker ────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold border-b pb-2">DateRangePicker</h2>
            <p className="text-sm text-muted-foreground">
              One shared calendar: the first pick anchors the range (the popover stays open and the
              highlight follows the pointer/arrows), the second pick completes it. Picking backwards
              swaps the endpoints; a range <em>typed</em> in reverse is flagged invalid instead.
            </p>
            <div className="flex flex-wrap gap-6 items-start">
              <DemoField id="date-range-basic" label="Basic">
                <DateRangePicker value={rangeValue} onChange={setRangeValue} />
              </DemoField>
              <DemoField
                id="date-range-future"
                label="Future dates only"
                description="Minimum: tomorrow"
              >
                <DateRangePicker minValue={tomorrow} />
              </DemoField>
              <DemoField
                id="date-range-no-weekends"
                label="No weekends"
                description="A range can't cross a weekend"
              >
                <DateRangePicker
                  isDateUnavailable={(dt) => {
                    const day = dt.toDate(tz.value).getDay();
                    return day === 0 || day === 6;
                  }}
                />
              </DemoField>
            </div>
            {rangeValue && (
              <p className="text-sm text-muted-foreground">
                Selected: <strong>{rangeValue.start.toString()}</strong> →{" "}
                <strong>{rangeValue.end.toString()}</strong>
              </p>
            )}
          </section>

          {/* ── In a form (submit validation) ───────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold border-b pb-2">In a form (submit validation)</h2>
            <p className="text-sm text-muted-foreground">
              Standard form submit with a manually wired label + description + error. Submitting
              empty (or with a past date) marks the date picker invalid through its public props,
              and the error clears as soon as a valid date is picked.
            </p>
            <form
              onSubmit={handleDeliverySubmit}
              className="flex flex-col items-start gap-4 max-w-sm"
            >
              <DemoField
                id="delivery-date"
                label="Delivery date"
                description="When should we ship your order?"
                error={deliveryError}
              >
                <DatePicker
                  isRequired
                  value={deliveryDate}
                  onChange={(v) => {
                    setDeliveryDate(v as CalendarDate | null);
                    if (v) setDeliveryError(undefined);
                  }}
                />
              </DemoField>
              <Button type="submit">Schedule delivery</Button>
            </form>
            {confirmedDate && (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                ✓ Delivery scheduled for <strong>{confirmedDate}</strong>
              </p>
            )}
          </section>

          {/* ── DateRangePicker in a form (+ React Hook Form) ────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold border-b pb-2">DateRangePicker in a form</h2>
            <p className="text-sm text-muted-foreground">
              In situ inside the app-shell{" "}
              <code className="bg-muted px-1 py-0.5 rounded">Form</code> +{" "}
              <code className="bg-muted px-1 py-0.5 rounded">Field.Root</code>. The range registers{" "}
              <strong>one combined field</strong> whose value is empty until both ends are entered,
              so <code className="bg-muted px-1 py-0.5 rounded">isRequired</code> blocks a partial
              range. Reversed or out-of-range typing surfaces as a{" "}
              <code className="bg-muted px-1 py-0.5 rounded">customError</code>. Submit to alert the
              collected values.
            </p>
            <Form<{ billingPeriod: string }>
              onFormSubmit={({ billingPeriod }) => {
                const [start, end] = billingPeriod ? billingPeriod.split("/") : ["", ""];
                alert(
                  `onFormSubmit values:\n\n` +
                    `  billingPeriod: "${billingPeriod}"   ← one combined field\n` +
                    `  start:         "${start}"\n` +
                    `  end:           "${end}"`,
                );
              }}
              className="flex flex-col items-start gap-4 max-w-sm"
            >
              <Field.Root name="billingPeriod">
                <Field.Label>Billing period</Field.Label>
                <DateRangePicker
                  isRequired
                  minValue={tz.today()}
                  startName="billingStart"
                  endName="billingEnd"
                />
                <Field.Description>Both dates required; must be today or later.</Field.Description>
                <Field.Error match="valueMissing">Please select a full range.</Field.Error>
                <Field.Error match="customError" />
              </Field.Root>
              <Button type="submit">Submit range</Button>
            </Form>
            <p className="text-sm text-muted-foreground">
              <code className="bg-muted px-1 py-0.5 rounded">onFormSubmit</code> collects the{" "}
              <strong>registered</strong> combined value as{" "}
              <code className="bg-muted px-1 py-0.5 rounded">"start/end"</code> (ISO).{" "}
              <code className="bg-muted px-1 py-0.5 rounded">startName</code> /{" "}
              <code className="bg-muted px-1 py-0.5 rounded">endName</code> additionally emit two
              plain hidden inputs, so a classic multipart POST (native{" "}
              <code className="bg-muted px-1 py-0.5 rounded">FormData</code>) also carries{" "}
              <code className="bg-muted px-1 py-0.5 rounded">billingStart</code> and{" "}
              <code className="bg-muted px-1 py-0.5 rounded">billingEnd</code> separately.
            </p>

            <h3 className="text-sm font-semibold mt-2">With React Hook Form</h3>
            <p className="text-sm text-muted-foreground">
              <code className="bg-muted px-1 py-0.5 rounded">DateRangePicker</code> is a{" "}
              <strong>controlled, object-valued</strong> control (
              <code className="bg-muted px-1 py-0.5 rounded">value: DateRange</code> /{" "}
              <code className="bg-muted px-1 py-0.5 rounded">onChange</code>), so RHF wires it with{" "}
              <code className="bg-muted px-1 py-0.5 rounded">{"<Controller>"}</code> rather than{" "}
              <code className="bg-muted px-1 py-0.5 rounded">register()</code>. The field value is a{" "}
              <code className="bg-muted px-1 py-0.5 rounded">{"{ start, end }"}</code> object of{" "}
              <code className="bg-muted px-1 py-0.5 rounded">DateValue</code>s — <em>not</em> a
              string — which is the main departure from RHF's native-input convention.
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
              {`import { useForm, Controller } from "react-hook-form";
import { DateRangePicker, type DateRange } from "@tailor-platform/app-shell";

const { control, handleSubmit, watch } = useForm<{ period: DateRange | null }>({
  defaultValues: { period: null },
});

// Read anywhere: watch("period") / getValues("period") → { start, end } | null
watch("period")?.start.toString(); // "2025-06-10"

<form onSubmit={handleSubmit((data) => {
  // data.period is a DateRange OBJECT, not a string:
  //   data.period?.start.toString(), data.period?.end.toString()
})}>
  <Controller
    name="period"
    control={control}
    rules={{ required: true }}
    render={({ field }) => (
      <DateRangePicker
        aria-label="Billing period"
        value={field.value}        // { start, end } | null
        onChange={field.onChange}  // receives the { start, end } object
        onBlur={field.onBlur}
      />
    )}
  />
</form>`}
            </pre>
            <ul className="text-sm text-muted-foreground list-disc pl-5 flex flex-col gap-1">
              <li>
                <strong>Controller, not register.</strong> {"register()"} targets uncontrolled
                native inputs; the picker owns its value, so bind it through {"<Controller>"}.
              </li>
              <li>
                <strong>Object value, not string.</strong> {'watch("period")'} returns{" "}
                {"{ start, end }"} (internationalized {"DateValue"}s); serialize for a backend with{" "}
                {".toString()"} per end.
              </li>
              <li>
                <strong>Validation.</strong> App-shell {"Field.Error"} (valueMissing / customError)
                is native to the {"Form"} path; under RHF use {"rules"} / a resolver and read{" "}
                {"formState.errors"} instead.
              </li>
            </ul>
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
              <DemoField id="date-picker-sun" label="Forced Sunday">
                <DatePicker firstDayOfWeek="sun" />
              </DemoField>
              <DemoField id="date-picker-mon" label="Forced Monday">
                <DatePicker firstDayOfWeek="mon" />
              </DemoField>
              <DemoField id="date-picker-locale" label="Locale default">
                <DatePicker />
              </DemoField>
            </div>
          </section>

          {/* ── Locale ──────────────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold border-b pb-2">
              Locale (segment order + names)
            </h2>
            <div className="flex flex-wrap gap-6 items-start">
              <DemoField id="date-picker-en-us" label="en-US (MM/DD/YYYY)">
                <DatePicker locale="en-US" />
              </DemoField>
              <DemoField id="date-picker-en-gb" label="en-GB (DD/MM/YYYY, Mon-first)">
                <DatePicker locale="en-GB" />
              </DemoField>
              <DemoField id="date-picker-ja-jp" label="ja-JP (YYYY/MM/DD)">
                <DatePicker locale="ja-JP" />
              </DemoField>
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

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">RangeCalendar</p>
                <RangeCalendar
                  aria-label="Select range"
                  value={inlineRange}
                  onChange={setInlineRange}
                />
                {inlineRange && (
                  <p className="text-sm text-muted-foreground">
                    Selected: <strong>{inlineRange.start.toString()}</strong> →{" "}
                    <strong>{inlineRange.end.toString()}</strong>
                  </p>
                )}
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
