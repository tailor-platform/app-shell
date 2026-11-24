import { useEffect, useState } from "react";
import { Button, Text } from "@tailor-platform/app-shell";
import { createMemoryAuthClient } from "@tailor-platform/app-shell/testing";

export function LogoutCleanup() {
  const [client] = useState(() =>
    createMemoryAuthClient({ isReady: true, isAuthenticated: true, error: null }),
  );
  const [cachedItems, setCachedItems] = useState(["Draft order", "Product list"]);

  useEffect(() => {
    return client.addEventListener((event) => {
      if (event.type === "logout") {
        setCachedItems([]);
      }
    });
  }, [client]);

  return (
    <div className="flex flex-col gap-3">
      <Text.p>
        This memory client emits real logout events locally. It does not simulate OAuth, token
        expiry, or persisted sessions, and does not sign you out of the docs app.
      </Text.p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void client.logout()}>
          Simulate logout
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await client.login();
            setCachedItems(["Draft order", "Product list"]);
          }}
        >
          Reset logout demo
        </Button>
      </div>
      <Text.p role="status">Cached items: {cachedItems.length}</Text.p>
      {cachedItems.length > 0 && (
        <ul className="list-inside list-disc">
          {cachedItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
