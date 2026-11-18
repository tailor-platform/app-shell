import { useId, useState } from "react";
import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  DateRangePicker,
  Field,
  Form,
  RangeCalendar,
  Text,
  parseDate,
  useTimeZone,
  type DateRange,
  type DateValue,
} from "@tailor-platform/app-shell";

export function StandaloneDateField() {
  return <DateField aria-label="Invoice date" />;
}

export function LabeledDateField() {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label id={`${id}-label`} htmlFor={id}>
        Invoice date
      </label>
      <DateField id={id} aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} />
      <Text.p id={`${id}-help`}>Format follows your locale</Text.p>
    </div>
  );
}

export function DateFieldWithField() {
  return (
    <Field.Root name="invoiceDate">
      <Field.Label>Invoice date</Field.Label>
      <DateField />
      <Field.Description>Format follows your locale</Field.Description>
    </Field.Root>
  );
}

export function StandaloneDatePicker() {
  return <DatePicker aria-label="Ship date" />;
}

export function ConstrainedDates() {
  const id = useId();
  const timeZone = useTimeZone();
  return (
    <div className="flex flex-col gap-2">
      <label id={`${id}-label`} htmlFor={id}>
        Delivery date
      </label>
      <DatePicker
        id={id}
        aria-labelledby={`${id}-label`}
        defaultValue={parseDate("2025-12-19")}
        minValue={timeZone.today()}
        isDateUnavailable={(date) => {
          const dow = date.toDate("UTC").getUTCDay();
          return dow === 0 || dow === 6;
        }}
      />
    </div>
  );
}

export function WeekStart() {
  return (
    <DatePicker
      aria-label="Date with Monday week start"
      defaultValue={parseDate("2025-12-19")}
      firstDayOfWeek="mon"
    />
  );
}

export function StandaloneCalendar() {
  return (
    <Calendar
      aria-label="Select date"
      defaultValue={parseDate("2025-12-19")}
      onChange={(date) => console.log(date)}
    />
  );
}

export function StandaloneRangeCalendar() {
  return (
    <RangeCalendar
      aria-label="Stay dates"
      defaultValue={{ start: parseDate("2025-12-19"), end: parseDate("2025-12-23") }}
      onChange={(range) => console.log(range)}
    />
  );
}

export function LocalizedPicker() {
  return <DatePicker aria-label="Date" defaultValue={parseDate("2025-12-19")} locale="ja-JP" />;
}

export function Weekday() {
  return (
    <DatePicker aria-label="Closing date" defaultValue={parseDate("2025-12-19")} showDayOfWeek />
  );
}

export function StandaloneValidation() {
  const id = useId();
  const [date, setDate] = useState<DateValue | null>(null);
  const [checked, setChecked] = useState(false);
  const error = checked && !date ? "Choose a delivery date." : null;

  return (
    <div className="max-w-sm space-y-3">
      <label id={`${id}-label`} htmlFor={id}>
        Delivery date
      </label>
      <DatePicker
        id={id}
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
        isInvalid={!!error}
        value={date}
        onChange={setDate}
        placeholderValue={parseDate("2026-04-01")}
      />
      {error && (
        <Text.p id={`${id}-error`} role="alert">
          {error}
        </Text.p>
      )}
      <Button variant="outline" onClick={() => setChecked(true)}>
        Check delivery date
      </Button>
      <Text.p role="status">Selected date: {date?.toString() ?? "None"}</Text.p>
    </div>
  );
}

export function FieldValidation() {
  const [submitted, setSubmitted] = useState<{ deliveryDate: string } | null>(null);

  return (
    <Form<{ deliveryDate: string }>
      noValidate
      className="max-w-sm space-y-3"
      onFormSubmit={setSubmitted}
    >
      <Field.Root name="deliveryDate">
        <Field.Label>Delivery date</Field.Label>
        <DatePicker
          isRequired
          minValue={parseDate("2026-04-01")}
          placeholderValue={parseDate("2026-04-01")}
        />
        <Field.Description>
          Choose April 1, 2026 or later. Earlier dates can be typed, but not submitted.
        </Field.Description>
        <Field.Error match="valueMissing">Choose a delivery date.</Field.Error>
        <Field.Error match="customError" />
      </Field.Root>
      <Button type="submit">Save delivery date</Button>
      <pre role="status" className="overflow-x-auto text-sm">
        {submitted ? JSON.stringify(submitted, null, 2) : "No date submitted yet."}
      </pre>
    </Form>
  );
}

export function StandaloneDateRange() {
  const [resetKey, setResetKey] = useState(0);
  const [range, setRange] = useState<DateRange | null>({
    start: parseDate("2026-04-09"),
    end: parseDate("2026-04-12"),
  });

  return (
    <div className="max-w-md space-y-3">
      <DateRangePicker
        key={resetKey}
        aria-label="Billing period"
        value={range}
        onChange={setRange}
      />
      <Button
        variant="outline"
        onClick={() => {
          setRange(null);
          // Partial ranges already expose null, so remount to clear staged segments too.
          setResetKey((current) => current + 1);
        }}
      >
        Clear range
      </Button>
      <Text.p role="status">
        {range
          ? `Complete range: ${range.start.toString()} to ${range.end.toString()}`
          : "Choose both a start and an end date."}
      </Text.p>
    </div>
  );
}

export function DateRangeWithField() {
  const [submitted, setSubmitted] = useState<{ period: string } | null>(null);

  return (
    <Form<{ period: string }> noValidate className="max-w-md space-y-3" onFormSubmit={setSubmitted}>
      <Field.Root name="period">
        <Field.Label>Billing period</Field.Label>
        <DateRangePicker isRequired placeholderValue={parseDate("2026-04-09")} />
        <Field.Description>
          Both dates are required. Type an end before the start to try the reversed-range error.
        </Field.Description>
        <Field.Error match="valueMissing">Choose both dates.</Field.Error>
        <Field.Error match="customError" />
      </Field.Root>
      <Button type="submit">Save billing period</Button>
      <pre role="status" className="overflow-x-auto text-sm">
        {submitted ? JSON.stringify(submitted, null, 2) : "No range submitted yet."}
      </pre>
    </Form>
  );
}
