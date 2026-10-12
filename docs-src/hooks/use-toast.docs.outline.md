---
kind: prose
group: use-toast
title: useToast
description: Hook for displaying toast notifications
---

# useToast

React hook to display toast notifications for user feedback. It returns the `toast` function exported by [sonner](https://sonner.emilkowal.ski/toast). The built-in layouts (`SidebarLayout`, `GlobalHeaderLayout`) already render the toaster, so no provider setup is needed.

## Signature

```typescript
const useToast: () => typeof toast; // `toast` is sonner's export; use `ReturnType<typeof useToast>` to name it

// The returned function (abbreviated; see sonner for the full signature)
toast(message: React.ReactNode, options?: ExternalToast): string | number;
toast.success(message, options?);
toast.error(message, options?);
toast.info(message, options?);
toast.warning(message, options?);
toast.loading(message, options?);
toast.promise(promise, { loading, success, error });
toast.dismiss(id?);
```

## Parameters

### ExternalToast

The options type of sonner's `toast`. Inside an app that depends only on `@tailor-platform/app-shell`, name it as `Parameters<ReturnType<typeof useToast>>[1]` (importing it from `sonner` requires sonner as a direct dependency). The most common fields:

```typescript
{
  description?: React.ReactNode;
  duration?: number; // milliseconds
  action?: { label: React.ReactNode; onClick: (event: React.MouseEvent) => void };
  id?: string | number;
}
```

## Usage

### Basic Toast

```typescript
import { useToast } from "@tailor-platform/app-shell";

function SaveButton() {
  const toast = useToast();

  const handleSave = () => {
    // Save logic...
    toast("Saved", { description: "Your changes have been saved." });
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### Success Toast

```typescript
function CreateButton() {
  const toast = useToast();

  const handleCreate = async () => {
    const item = await createItem();
    toast.success(`Item ${item.id} created`);
  };

  return <button onClick={handleCreate}>Create</button>;
}
```

### Error Toast

```typescript
function DeleteButton() {
  const toast = useToast();

  const handleDelete = async () => {
    try {
      await deleteItem();
    } catch (error) {
      toast.error(`Failed to delete: ${(error as Error).message}`);
    }
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### Custom Duration

```typescript
toast("Processing...", { duration: 5000 }); // 5 seconds
```

## Related

- [Toast pattern](../patterns/interaction-toast.md) - When to use a toast and how to word it
- [SidebarLayout](../components/sidebar-layout.md) - Renders the toaster
