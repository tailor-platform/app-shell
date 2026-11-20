import { Text, useTimeZone } from "@tailor-platform/app-shell";

export function TodayDisplay() {
  const timeZone = useTimeZone();
  const todayDate = timeZone.today();
  return <Text.span>Today: {todayDate.toString()}</Text.span>;
}

export function CurrentTimestamp() {
  const timeZone = useTimeZone();
  return <Text.span>{timeZone.now().toString()}</Text.span>;
}

export function TimeZoneLabel() {
  const { value } = useTimeZone();
  return <Text.span>Timezone: {value}</Text.span>;
}
