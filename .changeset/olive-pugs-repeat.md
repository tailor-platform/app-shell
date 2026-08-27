---
"@tailor-platform/app-shell": patch
---

Fix `autoLogin` being permanently disabled after a failed OAuth callback.

`@tailor-platform/auth-public-client` cleans the callback parameters out of the URL only when the code exchange succeeds; every failure path leaves `?code=` or `?error=` in the query string (tailor-platform/auth-public-client#139). `AuthProvider` decided whether a callback was in progress by reading that URL, so after any failed callback it treated the page as a live callback forever: auto-login never fired again, the app sat on `guardComponent`, and reloading only replayed the same failing callback.

Auto-login now decides from the callback's status rather than the URL — which is what the check meant all along: "is an exchange in flight", not "has this page ever been a callback". The URL is still the authority when no callback has been claimed at all, where redirecting away from unconsumed parameters would be unsafe.

It will not loop, either. A recoverable failure is retried once per tab; beyond that, and for any refusal the authorization server issues explicitly, AppShell stops rather than redirecting the user back for the same answer. The outcome is classified from the resulting auth state rather than from whether the callback threw, because two failure paths — a server `error` and a state mismatch — return normally after recording the error.

That makes `guardComponent` where a failed sign-in becomes visible: a guard that only renders a spinner will spin indefinitely, so render `useAuth().error` and offer a retry. See the authentication guide.

The stale parameters themselves remain in the URL after a failure until the cleanup is fixed upstream (tailor-platform/auth-public-client#139) — app-shell no longer misbehaves because of them, but deliberately does not reimplement the library's URL cleanup.
