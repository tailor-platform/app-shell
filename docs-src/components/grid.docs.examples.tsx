import { Card, Grid, Text } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Grid columns={3} gap={4}>
      <Card.Root>One</Card.Root>
      <Card.Root>Two</Card.Root>
      <Card.Root>Three</Card.Root>
    </Grid>
  );
}

export function ResponsiveValues() {
  return (
    <Grid columns={{ initial: 1, md: 2, xl: 4 }} gap={4}>
      {["Revenue", "Orders", "Customers", "Returns"].map((title) => (
        <Card.Root key={title}>
          <Card.Content>{title}</Card.Content>
        </Card.Root>
      ))}
    </Grid>
  );
}

export function ColumnSizing() {
  return (
    <div className="space-y-4">
      <Text.p>Equal columns</Text.p>
      <Grid columns={4} gap={4}>
        {["One", "Two", "Three", "Four"].map((label) => (
          <Card.Root key={label}>
            <Card.Content>{label}</Card.Content>
          </Card.Root>
        ))}
      </Grid>
      <Text.p>Custom track widths</Text.p>
      <Grid columns="280px 1fr" gap={6}>
        <Card.Root>
          <Card.Content>280px</Card.Content>
        </Card.Root>
        <Card.Root>
          <Card.Content>Remaining width</Card.Content>
        </Card.Root>
      </Grid>
      <Text.p>Auto-fit columns, at least 240px wide</Text.p>
      <Grid minChildWidth={240} gap={4}>
        {["One", "Two", "Three"].map((label) => (
          <Card.Root key={label}>
            <Card.Content>{label}</Card.Content>
          </Card.Root>
        ))}
      </Grid>
    </div>
  );
}

export function Spanning() {
  return (
    <Grid columns={4} gap={4}>
      <Grid.Item colSpan={2} className="rounded-lg border p-4">
        Wide card
      </Grid.Item>
      <Card.Root>
        <Card.Content>Normal</Card.Content>
      </Card.Root>
      <Grid.Item colSpan={{ initial: "full", md: 1 }} rowSpan={2} className="rounded-lg border p-4">
        Tall
      </Grid.Item>
      <Grid.Item colSpan="full" className="rounded-lg border p-4">
        Full-width footer row
      </Grid.Item>
    </Grid>
  );
}

export function Alignment() {
  return (
    <Grid columns="repeat(3, 96px)" rows="120px" gap={4} justify="between" align="center">
      <Card.Root>
        <Card.Content>One</Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Content>Two</Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Content>Three</Card.Content>
      </Card.Root>
    </Grid>
  );
}

export function SidebarContent() {
  return (
    <Grid columns="280px 1fr" gap={6}>
      <Card.Root>
        <Card.Header title="Filters" />
        <Card.Content>
          <Text.p>Status: Confirmed</Text.p>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Header title="Results" />
        <Card.Content>
          <Text.p>12 matching orders</Text.p>
        </Card.Content>
      </Card.Root>
    </Grid>
  );
}

export function FeaturedPanel() {
  return (
    <Grid columns={{ initial: 1, md: 4 }} gap={4}>
      <Grid.Item colSpan={{ initial: "full", md: 2 }}>
        <Card.Root>
          <Card.Content>Featured</Card.Content>
        </Card.Root>
      </Grid.Item>
      <Card.Root>
        <Card.Content>Revenue: $2,400</Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Content>Orders: 142</Card.Content>
      </Card.Root>
    </Grid>
  );
}
