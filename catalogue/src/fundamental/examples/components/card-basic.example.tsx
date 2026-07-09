import { Button, Card } from "@tailor-platform/app-shell";

export function CardBasicExample() {
  return (
    <Card.Root>
      <Card.Header title="Recent orders" description="Last 7 days">
        <Button size="sm" variant="outline">
          View all
        </Button>
      </Card.Header>
      <Card.Content>
        <p className="text-body">Summary content</p>
      </Card.Content>
    </Card.Root>
  );
}
