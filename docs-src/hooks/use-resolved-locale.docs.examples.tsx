import { Text, useResolvedLocale } from "@tailor-platform/app-shell";

export function DateDisplay() {
  const { locale } = useResolvedLocale();
  const date = new Date("2025-12-19T12:00:00Z");
  return (
    <Text.span>
      {new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(date)}
    </Text.span>
  );
}

export function PriceDisplay() {
  const { locale } = useResolvedLocale();
  const amount = 1234.56;
  return (
    <Text.span>
      {new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(amount)}
    </Text.span>
  );
}
