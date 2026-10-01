import { Card } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Card.Root>
      <Card.Header title="Order Details" description="Summary of order #1234" />
      <Card.Content>
        <p>Content goes here</p>
      </Card.Content>
    </Card.Root>
  );
}
