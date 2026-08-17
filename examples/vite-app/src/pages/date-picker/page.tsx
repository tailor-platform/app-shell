import { cloneElement, useState, type ReactElement } from "react";
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

  const [deliveryDate, setDeliveryDate] = useState<CalendarDate | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);

  const tomorrow = tz.today().add({ days: 1 });
  const threeMonths = tz.today().add({ months: 3 });

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
              Standard <code className="bg-muted px-1 py-0.5 rounded">Form</code> +{" "}
              <code className="bg-muted px-1 py-0.5 rounded">Field.Root</code>. Submitting empty (or
              with a past date) blocks submit, shows the field error, and clears as soon as a valid
              date is picked.
            </p>
            <Form<{ deliveryDate: string }>
              onFormSubmit={({ deliveryDate: submittedDeliveryDate }) =>
                setConfirmedDate(submittedDeliveryDate)
              }
              className="flex flex-col items-start gap-4 max-w-sm"
            >
              <Field.Root name="deliveryDate">
                <Field.Label>Delivery date</Field.Label>
                <DatePicker
                  value={deliveryDate}
                  onChange={(v) => {
                    setDeliveryDate(v as CalendarDate | null);
                    setConfirmedDate(null);
                  }}
                  isRequired
                  minValue={tz.today()}
                />
                <Field.Description>When should we ship your order?</Field.Description>
                <Field.Error match="valueMissing">Please select a delivery date.</Field.Error>
                <Field.Error match="customError" />
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
