---
"@tailor-platform/app-shell": minor
---

Replaced `getAuthHeadersForQuery` with `auth-public-client` 0.5.0's built-in `fetch()` method.

**Breaking change:** `EnhancedAuthClient.getAuthHeadersForQuery()` has been removed. Use `authClient.fetch` instead, which transparently handles DPoP proof generation and token refresh.

**Migration:**

```diff
 const urqlClient = createClient({
   url: `${authClient.getAppUri()}/query`,
-  fetchOptions: async () => {
-    const headers = await authClient.getAuthHeadersForQuery();
-    return { headers };
-  },
+  fetch: authClient.fetch,
 });
```
