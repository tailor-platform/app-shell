---
title: Table
description: Semantic HTML table with pre-styled sub-components
---

# Table

The `Table` component provides a set of pre-styled, semantic HTML table sub-components. It wraps a standard `<table>` element in a horizontally scrollable container.

## Import

```tsx
import { Table } from "@tailor-platform/app-shell"
```

## Basic Usage

```tsx preview
import { Table } from "@tailor-platform/app-shell"
;<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>Name</Table.Head>
      <Table.Head>Email</Table.Head>
      <Table.Head>Role</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>Alice</Table.Cell>
      <Table.Cell>alice@example.com</Table.Cell>
      <Table.Cell>Admin</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table.Root>
```

## Sub-components

| Sub-component   | HTML element | Description                            |
| --------------- | ------------ | -------------------------------------- |
| `Table.Root`    | `<table>`    | Root element with scrollable container |
| `Table.Header`  | `<thead>`    | Table header section                   |
| `Table.Body`    | `<tbody>`    | Table body section                     |
| `Table.Footer`  | `<tfoot>`    | Table footer section                   |
| `Table.Row`     | `<tr>`       | Table row (hover and selection styles) |
| `Table.Head`    | `<th>`       | Header cell                            |
| `Table.Cell`    | `<td>`       | Data cell                              |
| `Table.Caption` | `<caption>`  | Table caption                          |

## Props

### Table.Root Props

| Prop                 | Type     | Default | Description                                                       |
| -------------------- | -------- | ------- | ----------------------------------------------------------------- |
| `className`          | `string` | -       | Additional CSS classes for the `<table>` element                  |
| `containerClassName` | `string` | -       | Additional CSS classes for the outer scrollable `<div>` container |

All other standard HTML `<table>` props are accepted.

All other sub-components (`Table.Header`, `Table.Body`, `Table.Footer`, `Table.Row`, `Table.Head`, `Table.Cell`, `Table.Caption`) accept `className` and their corresponding standard HTML element props.

## Examples

### With Footer

```tsx preview
import { Table } from "@tailor-platform/app-shell"
;<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>Product</Table.Head>
      <Table.Head>Qty</Table.Head>
      <Table.Head>Price</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>Widget A</Table.Cell>
      <Table.Cell>10</Table.Cell>
      <Table.Cell>$100.00</Table.Cell>
    </Table.Row>
    <Table.Row>
      <Table.Cell>Widget B</Table.Cell>
      <Table.Cell>5</Table.Cell>
      <Table.Cell>$75.00</Table.Cell>
    </Table.Row>
  </Table.Body>
  <Table.Footer>
    <Table.Row>
      <Table.Cell colSpan={2}>Total</Table.Cell>
      <Table.Cell>$175.00</Table.Cell>
    </Table.Row>
  </Table.Footer>
</Table.Root>
```

### With Caption

```tsx preview
import { Table } from "@tailor-platform/app-shell"
;<Table.Root>
  <Table.Caption>Order line items</Table.Caption>
  <Table.Header>
    <Table.Row>
      <Table.Head>Item</Table.Head>
      <Table.Head>Status</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>Item 1</Table.Cell>
      <Table.Cell>Shipped</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table.Root>
```

### Constrained Height with Scroll

```tsx
<Table.Root containerClassName="astw:max-h-64 astw:overflow-y-auto">
  <Table.Header>
    <Table.Row>
      <Table.Head>Name</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {items.map((item) => (
      <Table.Row key={item.id}>
        <Table.Cell>{item.name}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table.Root>
```

## Related Components

- [Badge](./badge.md) - Display status inside table cells
- [Layout](./layout.md) - Place tables inside page layouts
