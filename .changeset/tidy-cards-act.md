---
"@tailor-platform/app-shell": minor
---

Add `Card.Header.action` for controls beside the title and `Card.Footer` for right-aligned actions with consistent padding and a top border.
Header descriptions and children keep their existing below-title layout; action groups wrap in narrow cards.

```tsx
<Card.Root>
  <Card.Header title="Order details" action={<Button type="button">Edit</Button>} />
  <Card.Content>{/* Order details */}</Card.Content>
  <Card.Footer>
    <Button type="button" variant="outline">
      Cancel
    </Button>
    <Button type="button">Save</Button>
  </Card.Footer>
</Card.Root>
```
