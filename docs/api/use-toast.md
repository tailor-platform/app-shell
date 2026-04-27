---
title: useToast
description: Hook for displaying toast notifications
---

# useToast

React hook to display toast notifications for user feedback.

## Signature

```typescript
const useToast: () => {
  toast: (props: ToastProps) => void;
};
```

## Parameters

### ToastProps

```typescript
{
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning"; // no color-coded styling applied
  duration?: number; // milliseconds
}
```

> **Note:** Toast notifications do not use color-coded styling for variants. All toasts (`success`, `error`, `warning`, `default`) are rendered with the same default appearance.

## Usage

### Basic Toast

```typescript
import { useToast } from "@tailor-platform/app-shell";

function SaveButton() {
  const { toast } = useToast();

  const handleSave = () => {
    // Save logic...
    toast({
      title: "Saved!",
      description: "Your changes have been saved.",
    });
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### Success Toast

```typescript
function CreateButton() {
  const { toast } = useToast();

  const handleCreate = async () => {
    await createItem();
    toast({
      title: "Created",
      description: "Item created successfully.",
      variant: "success",
    });
  };

  return <button onClick={handleCreate}>Create</button>;
}
```

### Error Toast

```typescript
function DeleteButton() {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteItem();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    }
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### Custom Duration

```typescript
toast({
  title: "Processing...",
  duration: 5000, // 5 seconds
});
```

## Related

- [SidebarLayout](../components/sidebar-layout.md) - Toast provider included
