---
"@tailor-platform/app-shell": patch
---

Fix sessions hanging permanently after the server rejects the grant, by raising `@tailor-platform/auth-public-client` to `^0.6.0`.

When a refresh token expired or was revoked, the auth client kept `isAuthenticated` true and reattached the dead token to every request, so apps sat in a permanent `{"errors":[{"message":"unauthorized","type":"Gateway"}]}` loop that only a manual IndexedDB clear recovered from. Any token-endpoint rejection now ends the session (`use_dpop_nonce` excepted), emitting `logout` and `auth_state_changed`. `AuthProvider` responds as it already does for a signed-out user: `guardComponent` renders, and with `autoLogin` the app redirects to sign-in. Transient failures still leave the session intact — a 5xx, a timeout, and a network failure are unchanged.

One behaviour change worth checking even though this is a patch: `fetch` and `getAuthHeaders` no longer throw `Error("No valid access token")` when a refresh is rejected — they throw the underlying error. If your app detects dead sessions by matching that message, it has stopped detecting them; listen for `logout` / `auth_state_changed` instead, which fire on exactly that condition. Grepping the installed package for the string will not tell you whether you are affected, because the throw still exists for the genuinely-no-token case — check your own error handling.
