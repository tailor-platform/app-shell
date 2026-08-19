# React Review Criteria

## Core rule

**Prefer non-effect solutions first.**

Prefer:

- render-time derivation
- event handlers
- explicit state ownership
- lazy state initialization
- `key`-based reset
- framework lifecycle boundaries such as route loaders

before reaching for `useEffect`.

## Review for avoidable `useEffect`

Be skeptical when `useEffect` is used for:

- derived state
- prop-to-state mirroring
- notifying parent callbacks after local state changes
- local resets that should be modeled by ownership or identity
- initialization that belongs in `useState(() => ...)`
- fetches that belong to router/framework lifecycle boundaries

### Bad: derived state in an effect

```tsx
const [filtered, setFiltered] = React.useState(items);

React.useEffect(() => {
  setFiltered(items.filter(matchesSearch));
}, [items, search]);
```

### Good: derive in render or memo

```tsx
const filtered = React.useMemo(() => items.filter(matchesSearch), [items, search]);
```

### Bad: prop mirroring

```tsx
const [inputValue, setInputValue] = React.useState(value);

React.useEffect(() => {
  setInputValue(value);
}, [value]);
```

### Good: choose ownership explicitly

```tsx
return <input value={value} onChange={(e) => onValueChange(e.target.value)} />;
```

### Bad: callback watcher effect

```tsx
React.useEffect(() => {
  onValueChange?.(selected);
}, [selected, onValueChange]);
```

### Good: notify from the event source

```tsx
const handleChange = (nextValue: string) => {
  setSelected(nextValue);
  onValueChange?.(nextValue);
};
```

### Bad: reset via effect

```tsx
React.useEffect(() => {
  setValue("");
}, [filterType]);
```

### Good: reset by identity

```tsx
return <FilterEditorInner key={filterType} filterType={filterType} />;
```

## Legitimate `useEffect`

`useEffect` is appropriate when synchronizing with an external system or imperative browser API, such as:

- subscriptions
- focus management
- observers / measurement
- imperative integration with non-React systems

### Good: subscription with cleanup

```tsx
React.useEffect(() => {
  const unsubscribe = authClient.subscribe(setSession);
  return unsubscribe;
}, [authClient]);
```

### Good: focus sync

```tsx
React.useEffect(() => {
  if (!open) return;
  inputRef.current?.focus();
}, [open]);
```

### Browser coordination

For routing, auth, or other integrations that coordinate with browser state, review:

- stable instance or identity across rerenders when re-creation would repeat work
- callback or initialization paths that run exactly when intended
- subscriptions, Suspense, or async startup that do not loop or race normal navigation
- real browser behavior on deep links, reload, back/forward, login/logout, and fallback paths when applicable

## Review questions

- Is this effect actually synchronizing with an external system?
- Can render-time derivation, an event handler, or explicit ownership replace it?
- Is the code using an effect as a state watcher?
- Does the effect create rerender, ordering, or race risk?
- If the effect stays, is its reason obvious from the code or a nearby comment?
