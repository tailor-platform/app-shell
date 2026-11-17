import { useId } from "react";
import {
  Calendar,
  DateField,
  DatePicker,
  Field,
  RangeCalendar,
  Text,
  getLocalTimeZone,
  parseDate,
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
  return (
    <div className="flex flex-col gap-2">
      <label id={`${id}-label`} htmlFor={id}>
        Delivery date
      </label>
      <DatePicker
        id={id}
        aria-labelledby={`${id}-label`}
        defaultValue={parseDate("2025-12-19")}
        minValue={parseDate("2025-12-01")}
        isDateUnavailable={(date) => {
          const dow = date.toDate(getLocalTimeZone()).getDay();
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
