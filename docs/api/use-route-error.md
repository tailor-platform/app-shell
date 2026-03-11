---
title: useRouteError
description: Hook to access error details in custom error boundaries
---

# useRouteError

React Router hook to access error details within a custom error boundary component. Re-exported from `react-router` for convenience.

## Signature

```typescript
const useRouteError: () => unknown
```

## Return Value

| Type      | Description                                                                  |
| --------- | ---------------------------------------------------------------------------- |
| `unknown` | The error that was thrown (typically `Error` object or route error response) |

## Usage

### Basic Error Boundary

```typescript
import { useRouteError } from "@tailor-platform/app-shell";

function ErrorBoundary() {
  const error = useRouteError();

  const message = error instanceof Error
    ? error.message
    : "An unexpected error occurred";

  return (
    <div>
      <h1>Something went wrong</h1>
      <p>{message}</p>
      <button onClick={() => window.location.reload()}>
        Try Again
      </button>
    </div>
  );
}
```

### Use in Module Definition

```typescript
import { defineModule } from "@tailor-platform/app-shell";

const myModule = defineModule({
  path: "dashboard",
  component: DashboardPage,
  errorBoundary: <ErrorBoundary />,
  resources: [...]
});
```

### Use in Resource Definition

```typescript
const productsModule = defineModule({
  path: "products",
  component: ProductsPage,
  resources: [
    defineResource({
      path: ":id",
      component: ProductDetail,
      errorBoundary: <ErrorBoundary />,
    }),
  ],
});
```

### Advanced Error Handling

```typescript
import { isRouteErrorResponse, useRouteError } from "@tailor-platform/app-shell";

function ErrorBoundary() {
  const error = useRouteError();

  // Handle route error responses (404, 500, etc.)
  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }

  // Handle JavaScript errors
  if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <pre>{error.stack}</pre>
      </div>
    );
  }

  // Handle unknown errors
  return (
    <div>
      <h1>Unknown Error</h1>
      <p>Something went wrong</p>
    </div>
  );
}
```

### With Error Logging

```typescript
function ErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    // Log to error tracking service
    console.error("Route error:", error);
    // analytics.trackError(error);
  }, [error]);

  return (
    <div>
      <h1>Error</h1>
      <p>We've been notified and will fix this soon.</p>
    </div>
  );
}
```

### Custom Error Pages

```typescript
function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFoundPage />;
    }

    if (error.status === 403) {
      return <AccessDeniedPage />;
    }

    if (error.status === 500) {
      return <ServerErrorPage />;
    }
  }

  return <GenericErrorPage error={error} />;
}
```

## Error Boundary Scope

Error boundaries can be defined at different levels:

```typescript
// Module-level - catches errors in all resources
defineModule({
  path: "products",
  errorBoundary: <ModuleErrorBoundary />,
  resources: [...]
})

// Resource-level - catches errors in specific resource
defineResource({
  path: ":id",
  errorBoundary: <ResourceErrorBoundary />,
  component: ProductDetail
})

// Global - catches all unhandled errors
<AppShell
  modules={modules}
  errorBoundary={<GlobalErrorBoundary />}
/>
```

## Important Notes

### Always Import from AppShell

```typescript
// ✅ Correct
import { useRouteError } from "@tailor-platform/app-shell";

// ❌ Wrong - won't work with AppShell's router
import { useRouteError } from "react-router";
```

### Error Boundaries Don't Catch

Error boundaries do **not** catch:
- Errors in event handlers (use try/catch)
- Async errors (use try/catch with async/await)
- Server-side rendering errors
- Errors thrown in the error boundary itself

## Related

- [defineModule](./define-module.md) - Module-level error boundaries
- [defineResource](./define-resource.md) - Resource-level error boundaries
- [AppShell Component](../components/app-shell.md) - Global error boundary
