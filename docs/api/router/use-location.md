---
title: useLocation
description: Hook to access current location object with pathname, search, and state
---

# useLocation

React Router hook to access the current location object. Re-exported from `react-router` for convenience.

## Signature

```typescript
const useLocation: () => Location;
```

## Return Type

```typescript
interface Location {
  pathname: string; // Current path: "/products/123"
  search: string; // Query string: "?sort=name&page=2"
  hash: string; // Hash: "#details"
  state: any; // State passed via navigate()
  key: string; // Unique key for this location
}
```

## Usage

### Access Current Path

```typescript
import { useLocation } from "@tailor-platform/app-shell";

function Breadcrumb() {
  const location = useLocation();

  return <div>Current path: {location.pathname}</div>;
}
```

### Check Active Route

```typescript
function NavItem({ path, label }: { path: string; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <a
      href={path}
      className={isActive ? "active" : ""}
    >
      {label}
    </a>
  );
}
```

### Access Query Parameters

```typescript
function ProductsList() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const sort = searchParams.get("sort"); // "name"
  const page = searchParams.get("page"); // "2"

  return <div>Sort: {sort}, Page: {page}</div>;
}

// URL: /products?sort=name&page=2
```

### Access Navigation State

```typescript
// Navigate with state
function ProductsList() {
  const navigate = useNavigate();

  const selectProduct = (id: string) => {
    navigate(`/products/${id}`, {
      state: { from: "list", scrollPosition: window.scrollY },
    });
  };
}

// Access state in target component
function ProductDetail() {
  const location = useLocation();
  const from = location.state?.from;           // "list"
  const scrollPos = location.state?.scrollPosition; // 450

  return <div>Came from: {from}</div>;
}
```

### Track Route Changes

```typescript
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // Track page view
    analytics.pageView(location.pathname);
  }, [location.pathname]);

  return null;
}
```

### Preserve Query Params on Navigation

```typescript
function FilterButton({ filter }: { filter: string }) {
  const location = useLocation();
  const navigate = useNavigate();

  const applyFilter = () => {
    const params = new URLSearchParams(location.search);
    params.set("filter", filter);
    navigate(`${location.pathname}?${params}`);
  };

  return <button onClick={applyFilter}>Apply Filter</button>;
}
```

## Common Patterns

### Check Prefix Match

```typescript
function isActiveRoute(pathname: string, prefix: string) {
  return pathname.startsWith(prefix);
}

function NavItem({ path }: { path: string }) {
  const location = useLocation();
  const isActive = isActiveRoute(location.pathname, path);

  return <a className={isActive ? "active" : ""}>{path}</a>;
}
```

### Scroll to Hash

```typescript
function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      element?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);

  return null;
}
```

### Preserve Scroll Position

```typescript
function Layout() {
  const location = useLocation();
  const scrollPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    // Save scroll position
    scrollPositions.current[location.key] = window.scrollY;

    // Restore scroll position
    const savedPosition = scrollPositions.current[location.key];
    if (savedPosition !== undefined) {
      window.scrollTo(0, savedPosition);
    }
  }, [location]);

  return <Outlet />;
}
```

## useSearchParams Alternative

For easier query parameter handling, use `useSearchParams`:

```typescript
import { useSearchParams } from "@tailor-platform/app-shell";

function ProductsList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const sort = searchParams.get("sort");
  const page = searchParams.get("page");

  const updateSort = (newSort: string) => {
    setSearchParams({ sort: newSort, page });
  };

  return <div>...</div>;
}
```

## Important Notes

### Always Import from AppShell

```typescript
// ✅ Correct
import { useLocation } from "@tailor-platform/app-shell";

// ❌ Wrong - won't work with AppShell's router
import { useLocation } from "react-router";
```

### Location is Immutable

The location object is immutable. Don't try to modify it:

```typescript
// ❌ Wrong
location.pathname = "/new-path";

// ✅ Correct - use navigate
navigate("/new-path");
```

## Related

- [useNavigate](./use-navigate.md) - Programmatic navigation
- [useParams](./use-params.md) - Access route parameters
- [useSearchParams](./use-navigate.md) - Query parameter management
- [Routing & Navigation](../../concepts/routing-navigation.md) - Navigation guide
