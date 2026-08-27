---
"@tailor-platform/app-shell": patch
---

Fix an app being wedged permanently after a failed OAuth callback.

`@tailor-platform/auth-public-client` cleans the callback parameters out of the URL only when the code exchange succeeds. Every failure path — the authorization server returning an `error`, a state mismatch, a missing PKCE verifier, a failed exchange — left `?code=` or `?error=` in the query string. `AuthProvider` read that URL to decide whether a callback was in progress, so it treated the page as a live callback forever: auto-login never fired again, the app sat on `guardComponent`, and reloading only replayed the same failing callback. The sole escape was editing the URL by hand.

Two changes fix it:

- The callback parameters are now cleared on every outcome, not just success, preserving unrelated query parameters and the hash. Because it uses `replaceState`, the back button cannot replay the failed callback either.
- Auto-login now decides from the callback's status rather than from the URL, which is what the check meant all along — "is an exchange in flight", not "has this page ever been a callback".

A callback the authorization server explicitly refuses is treated as its own outcome and deliberately does **not** re-initiate login: bouncing straight back would ask the same question, get the same answer, and loop. The error stays available on `useAuth().error` for `guardComponent` to render, the URL is still cleaned, and a deliberate reload retries. Failures that are not the server's verdict — a state mismatch or a failed exchange — do resume auto-login, since those are the recoverable ones.
