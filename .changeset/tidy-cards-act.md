---
"@tailor-platform/app-shell": minor
---

Add `Card.Header.action` for controls beside the title and `Card.Footer` for footer content with consistent padding and a top border.
Header descriptions and children keep their existing below-title layout; action groups wrap in narrow cards. Footer content is start-aligned by default; use `className="justify-end"` for right-aligned actions.

```tsx
<Card.Root>
  <Card.Header title="Order details" action={<Button type="button">Edit</Button>} />
  <Card.Content>{/* Order details */}</Card.Content>
  <Card.Footer className="justify-end">
    <Button type="button" variant="outline">
      Cancel
    </Button>
    <Button type="button">Save</Button>
  </Card.Footer>
</Card.Root>
```
