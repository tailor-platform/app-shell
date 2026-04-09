---
title: LinkedRecordsCard
description: Compact sidebar card displaying a list of linked records with icons, labels, and status badges
---

# LinkedRecordsCard

A lightweight sidebar card that displays a flat list of linked records. Each row shows an icon, a truncated label as a link, and an outline status badge. The header accepts either a plain string title or any ReactNode for custom content (e.g., a score display).

## Import

```tsx
import {
  LinkedRecordsCard,
  type LinkedRecordsCardProps,
} from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<LinkedRecordsCard
  title="Related Documents"
  records={[
    {
      id: "po-1",
      type: "purchase_order",
      label: "PO-105539",
      href: "/purchase-orders/105539",
      status: "Approved",
      statusVariant: "outline-success",
    },
    {
      id: "gr-1",
      type: "goods_receipt",
      label: "GR-200145",
      href: "/goods-receipts/200145",
      status: "Received",
      statusVariant: "outline-success",
    },
  ]}
/>
```

## Custom Title (ReactNode)

Pass any ReactNode as `title` for custom header content:

```tsx
<LinkedRecordsCard
  title={
    <span className="astw:text-lg astw:font-bold astw:text-green-700">
      100% Matched
    </span>
  }
  records={records}
/>
```

## With Custom Icons

Each record can provide its own `icon` ReactNode. If omitted, a default file icon is used.

```tsx
import { TruckIcon, ReceiptIcon } from "lucide-react";

<LinkedRecordsCard
  title="Source Documents"
  records={[
    {
      id: "gr-1",
      type: "goods_receipt",
      label: "GR-200145",
      href: "/gr/200145",
      status: "Received",
      statusVariant: "outline-success",
      icon: <TruckIcon className="astw:size-4" />,
    },
    {
      id: "pi-1",
      type: "purchase_invoice",
      label: "PI-2026-00371",
      href: "/invoices/371",
      status: "Draft",
      statusVariant: "outline-neutral",
      icon: <ReceiptIcon className="astw:size-4" />,
    },
  ]}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `ReactNode` | No | `"Related Documents"` | Card header. String renders as `<h3>`, ReactNode renders as-is |
| `records` | `LinkedRecord[]` | Yes | — | Flat list of records to display |
| `className` | `string` | No | — | Additional CSS classes on the root card |

### LinkedRecord

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `type` | `string` | Yes | Record type key |
| `label` | `string` | Yes | Display label (truncated if long) |
| `href` | `string` | Yes | Navigation link |
| `status` | `string` | Yes | Status text shown in badge |
| `statusVariant` | `string` | No | Badge variant. Default: `"outline-neutral"` |
| `icon` | `ReactNode` | No | Custom icon. Default: `FileTextIcon` |

## Empty State

When `records` is an empty array, the card shows "No linked records" in muted text.
