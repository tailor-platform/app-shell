# Anti-patterns and legitimate cases

Use these examples to calibrate reviews. They are generic on purpose.

## Delete: derived state

**Bad**

```tsx
const [visibleRows, setVisibleRows] = useState<Row[]>([]);

useEffect(() => {
  setVisibleRows(rows.filter((row) => row.enabled));
}, [rows]);
```

**Prefer**

```tsx
const visibleRows = useMemo(() => rows.filter((row) => row.enabled), [rows]);
```

If the computation is cheap, inline it without `useMemo`.

## Delete: event logic in effect

**Bad**

```tsx
const [submitted, setSubmitted] = useState(false);

useEffect(() => {
  if (submitted) {
    toast.success("Saved");
    navigate("/orders");
  }
}, [submitted, navigate]);

async function handleSubmit() {
  await save(values);
  setSubmitted(true);
}
```

**Prefer**

```tsx
async function handleSubmit() {
  await save(values);
  toast.success("Saved");
  navigate("/orders");
}
```

## Delete: initialize state from props via effect

**Bad**

```tsx
function Editor({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState("");

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);
}
```

**Prefer**

```tsx
function Editor({ initialContent }: { initialContent: string }) {
  const [content, setContent] = useState(initialContent);
}
```

## Delete: POST / mutation in effect

**Bad**

```tsx
const [jsonToSubmit, setJsonToSubmit] = useState<Payload | null>(null);

useEffect(() => {
  if (jsonToSubmit) {
    post("/api/register", jsonToSubmit);
  }
}, [jsonToSubmit]);

function handleSubmit() {
  setJsonToSubmit({ firstName, lastName });
}
```

**Prefer**

```tsx
function handleSubmit() {
  post("/api/register", { firstName, lastName });
}
```

## Rewrite: prop-driven reset

**Bad**

```tsx
function ProfilePage({ userId }: { userId: string }) {
  const [comment, setComment] = useState("");

  useEffect(() => {
    setComment("");
  }, [userId]);
}
```

**Prefer**

```tsx
function ProfilePage({ userId }: { userId: string }) {
  return <Profile key={userId} userId={userId} />;
}
```

## Rewrite: browser subscription mirrored into state

**Bad**

```tsx
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const update = () => setIsOnline(navigator.onLine);
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}, []);
```

**Prefer**

```tsx
const isOnline = useSyncExternalStore(
  (cb) => {
    window.addEventListener("online", cb);
    window.addEventListener("offline", cb);
    return () => {
      window.removeEventListener("online", cb);
      window.removeEventListener("offline", cb);
    };
  },
  () => navigator.onLine,
  () => true,
);
```

## Rewrite: fetch without cleanup

**Bad**

```tsx
useEffect(() => {
  fetchResults(query).then((json) => {
    setResults(json);
  });
}, [query]);
```

**Prefer**

```tsx
useEffect(() => {
  let ignore = false;

  fetchResults(query).then((json) => {
    if (!ignore) setResults(json);
  });

  return () => {
    ignore = true;
  };
}, [query]);
```

## Delete: passing data to the parent in an effect

**Bad**

```tsx
function Parent() {
  const [data, setData] = useState<Data | null>(null);
  return <Child onFetched={setData} />;
}

function Child({ onFetched }: { onFetched: (data: Data) => void }) {
  const data = useSomeAPI();

  useEffect(() => {
    if (data) onFetched(data);
  }, [data, onFetched]);
}
```

**Prefer**

```tsx
function Parent() {
  const data = useSomeAPI();
  return <Child data={data} />;
}
```

## Delete: effect chains

**Bad**

```tsx
useEffect(() => {
  if (card?.gold) setGoldCardCount((count) => count + 1);
}, [card]);

useEffect(() => {
  if (goldCardCount > 3) {
    setRound((round) => round + 1);
    setGoldCardCount(0);
  }
}, [goldCardCount]);
```

**Prefer**

```tsx
function handlePlaceCard(nextCard: Card) {
  setCard(nextCard);
  if (nextCard.gold) {
    if (goldCardCount < 3) {
      setGoldCardCount(goldCardCount + 1);
    } else {
      setGoldCardCount(0);
      setRound(round + 1);
    }
  }
}
```

Derive what you can during render; do the transition work in the event handler.

## Keep: external synchronization with cleanup

```tsx
useEffect(() => {
  const connection = createConnection(roomId);
  connection.connect();
  return () => connection.disconnect();
}, [roomId]);
```

This is what effects are for.

## Keep: unmount cleanup

```tsx
useEffect(() => {
  return () => {
    clearTimeout(timeoutRef.current);
    abortControllerRef.current?.abort();
  };
}, []);
```

Cleanup-only effects are often fine.

## Keep: mount/unmount registration

```tsx
useEffect(() => {
  registry.register(id, value);
  return () => registry.unregister(id);
}, [id, value, registry]);
```

If the component is synchronizing with a registry or store outside React, this can be legitimate.

## Bias

When unsure:

- prefer **no finding** over a noisy one
- prefer **rewrite** over **delete** for real browser/client synchronization
- prefer **existing repo patterns** over new abstractions
