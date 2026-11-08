---
kind: prose
group: use-toast
title: useToast
description: Hook for displaying toast notifications
---

# useToast

React hook to display toast notifications for user feedback. It returns the `toast` function exported by [sonner](https://sonner.emilkowal.ski/toast), with the [defaults](#defaults) below for errors and toasts that carry an action. The built-in layouts (`SidebarLayout`, `GlobalHeaderLayout`) already render the toaster, so no provider setup is needed.

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

## Defaults

The toaster uses sonner's defaults: bottom right (full width at the bottom at 600px and below), up to three toasts visible, 4 seconds per toast. `useToast` changes two of sonner's per-toast defaults so that a message the user must act on does not disappear on its own:

| Call                                                              | `duration` | `closeButton` |
| ----------------------------------------------------------------- | ---------- | ------------- |
| `toast.error(...)`, and the error state of `toast.promise(...)`   | `Infinity` | `true`        |
| Any call with an `action` (`toast(...)`, `toast.success(...)`, …) | `Infinity` | `true`        |
| Everything else, including `toast.custom(...)`                    | sonner's   | sonner's      |

An option passed to the call wins over these defaults:

```typescript
toast.error("Retrying in 5s", { duration: 5000 }); // closes after 5 seconds
toast.error("Failed to save", { closeButton: false }); // stays; swipe, or Escape while it has focus, dismisses it
```

For `toast.promise`, a `duration` or `closeButton` on the call applies to the error state, and an `error` result object (`{ message, duration, closeButton, ... }`) wins over both.

An error toast with `dismissible: false` now stays until the caller calls `toast.dismiss(id)`; give it a `duration` if it should close on its own.

A call without an `action` that updates an existing toast by `id`, such as `toast.success("Saved", { id })` after `toast.error`, resets `duration` and `closeButton` to sonner's defaults unless it passes its own, so the updated toast closes by itself.

These defaults live in `useToast`. A `toast` imported from `sonner` directly does not get them.

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
      // Stays until the user closes it (see Defaults)
      toast.error(`Failed to delete: ${(error as Error).message}`);
    }
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### Toast with an Action

A toast with an `action` stays until the user closes it. Do not make it the only way to do something: if the toast offers Undo, the page offers a way back too.

```typescript
function ArchiveButton({ item }: { item: Item }) {
  const toast = useToast();

  const handleArchive = async () => {
    await archiveItem(item.id);
    toast(`${item.name} archived`, {
      action: { label: "Undo", onClick: () => restoreItem(item.id) },
    });
  };

  return <button onClick={handleArchive}>Archive</button>;
}
```

### Custom Duration

```typescript
toast("Processing...", { duration: 5000 }); // 5 seconds
```

## Related

- [Toast pattern](../patterns/interaction-toast.md) - When to use a toast and how to word it
- [SidebarLayout](../components/sidebar-layout.md) - Renders the toaster
