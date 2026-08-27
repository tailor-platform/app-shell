---
"@tailor-platform/app-shell": patch
---

Fix an app being wedged permanently after a failed OAuth callback.

`@tailor-platform/auth-public-client` cleans the callback parameters out of the URL only when the code exchange succeeds. Every failure path — the authorization server returning an `error`, a state mismatch, a missing PKCE verifier, a failed exchange — left `?code=` or `?error=` in the query string. `AuthProvider` read that URL to decide whether a callback was in progress, so it treated the page as a live callback forever: auto-login never fired again, the app sat on `guardComponent`, and reloading only replayed the same failing callback. The sole escape was editing the URL by hand.

Two changes fix it:

- The callback parameters are now cleared on every outcome, not just success, preserving unrelated query parameters and the hash. Because it uses `replaceState`, the back button cannot replay the failed callback either.
- Auto-login now decides from the callback's status rather than from the URL, which is what the check meant all along — "is an exchange in flight", not "has this page ever been a callback".

Auto-login will not loop on this. A recoverable failure is retried once per tab; beyond that, and for any refusal the authorization server issues explicitly, AppShell stops rather than sending the user back for the same answer. The outcome is classified from the resulting auth state rather than from whether the callback threw, because two failure paths — an `error` from the server and a state mismatch — return normally after recording the error.

That makes `guardComponent` where a failed sign-in becomes visible: a guard that only renders a spinner will spin indefinitely, so render `useAuth().error` and offer a retry. See the authentication guide.

Stripping preserves the existing `history.state`, which routers rely on (react-router keeps `{usr, key, idx}` there, Next.js keeps `__NA`). One limitation is unchanged from before: a callback URL is detected by the presence of `code` or `error`, which are generic parameter names, so an app already using them for its own purposes on a route can have them removed.
