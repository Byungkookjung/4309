# Scriptable Widgets

Build the self-contained `Pocket Paws.js` with `node scriptable/build.cjs` after changing shared calculation/recurrence modules. Install only this generated file in Scriptable; no additional modules are needed. See `/scriptable/` for installation instructions (requires deployment of this version).

- One script, two widget parameters: `work` and `todo`. Medium is the recommended size; small and large adapt their text/list limits.
- Work uses Edmonton's date, Iron Peak first, per-job rates, holiday multipliers and the same break formula as the website.
- To do includes today's ordinary tasks, recurring rules and moved occurrences, unfinished first. Tap to open the private planner. Widget checkmarks are display-only.
- Todo uses saved category colors (including the default category) for icons and backgrounds. Small displays up to 4 items; medium and large use two columns for up to 8 and 18 items. Additional items have a remaining-count label.
- App previews offer Small, Medium and Large. Tap links use `date=today`; work opens today's details and todo opens today's list.
- Website deployment does not replace the script saved on an iPhone. Replace that script to receive code/layout changes; task and shift data refresh through the existing connection without reinstalling.
- Pairing creates an ephemeral P-256 private key inside a local WebView, stores it in Keychain for at most ten minutes (enforced on return), and opens the existing trusted login page with only a public key and random state in its fragment.
- The confirmed Firebase UID/refresh token is transferred as ECDH/SHA-256/AES-GCM ciphertext. Scriptable checks state and expiry, decrypts locally and stores credentials in Keychain. The script never logs tokens or uses a public Firestore rule.
- This is a Firebase user credential, NOT a restricted read-only token; the supplied script only issues authenticated reads. Do not distribute connected credentials. Disconnect clears local credentials/cache; remote revocation requires Firebase account administration.
- Refresh tokens rotate; UID and connection generation are checked before caching. Cached summaries are separated by account and widget type, stored in Keychain, and shown only for the same Edmonton date with a stale label. Permission failures never display cached private data.
- Firestore REST requests are bounded, paginated, and subject to existing rules. App Check enforcement or restrictive new-collection rules may require server configuration; no rules are relaxed here.
- iOS decides refresh scheduling. `refreshAfterDate` requests an earliest refresh, not a guarantee. Closed-widget updates can be delayed.
- Google OAuth runs in the browser, not an embedded Google login WebView. Local WebCrypto, the Scriptable URL callback, installation and actual widget sizing must be verified on an iPhone. Browser/Node tests cannot certify native Scriptable behavior.

Official APIs: https://docs.scriptable.app/listwidget/ , https://docs.scriptable.app/keychain/ , https://docs.scriptable.app/webview/ , https://firebase.google.com/docs/firestore/use-rest-api
