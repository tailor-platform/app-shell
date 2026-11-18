import { Input } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return <Input placeholder="Enter your name" />;
}

export function TextInput() {
  return <Input type="text" aria-label="Name" placeholder="Enter your name" />;
}

export function EmailInput() {
  return <Input type="email" aria-label="Email" placeholder="you@example.com" />;
}

export function NumberInput() {
  return <Input type="number" aria-label="Quantity" placeholder="0" min={0} max={100} />;
}

export function DisabledInput() {
  return <Input aria-label="Unavailable value" value="Read-only value" disabled />;
}
