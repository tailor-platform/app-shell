# Table

Data table components.

## Parts

| Part           | Description                      |
| -------------- | -------------------------------- |
| `Table.Root`   | Table container with scroll area |
| `Table.Header` | Table header (`<thead>`, sticky) |
| `Table.Body`   | Table body (`<tbody>`)           |
| `Table.Footer` | Table footer (`<tfoot>`, sticky) |
| `Table.Row`    | Table row (`<tr>`)               |
| `Table.Head`   | Header cell (`<th>`)             |
| `Table.Cell`   | Data cell (`<td>`)               |

## Props (`Table.Root`)

| Prop                 | Type                  | Description                        |
| -------------------- | --------------------- | ---------------------------------- |
| `containerClassName` | `string`              | CSS classes for scroll container   |
| `containerStyle`     | `React.CSSProperties` | Inline styles for scroll container |

## Example

```tsx
import { Table } from "@tailor-platform/app-shell";

<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>Name</Table.Head>
      <Table.Head>Email</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>John Doe</Table.Cell>
      <Table.Cell>john@example.com</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table.Root>;
```
