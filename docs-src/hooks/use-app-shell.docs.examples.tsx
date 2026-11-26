import { Text, useAppShell } from "@tailor-platform/app-shell";

export function LocaleDisplay() {
  const { configurations } = useAppShell();
  return <Text.p>Current locale: {configurations.locale}</Text.p>;
}
