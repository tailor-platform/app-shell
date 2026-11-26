import { Text, useLocation } from "@tailor-platform/app-shell";

export function CurrentPath() {
  const location = useLocation();
  return <Text.p>Current path: {location.pathname}</Text.p>;
}
