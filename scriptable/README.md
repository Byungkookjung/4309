# Pocket Pond Scriptable Widgets

Install the generated `Pocket Paws.js` in Scriptable. Keep its script name **Pocket Paws** when updating so existing widget configuration and Keychain credentials remain usable.

## Widgets

| Parameter | Required size | Content |
| --- | --- | --- |
| `todo-month` | Large | Current month's tasks and routines, colored by category |
| `work-week` | Medium | Today centered between three previous and three following days; work times only |

`work`, `todo`, `work-month`, and `todo-week` have been removed. Old parameters show a migration hint without fetching data. Legacy `month` aliases `todo-month`. Unsupported sizes show a size-selection hint.

- All reference dates use `America/Edmonton`, including daylight-saving changes.
- Work week advances one date per day when refreshed. Saturday shows Wed/Thu/Fri/**Sat**/Sun/Mon/Tue. Green is Iron Peak; purple is Booster Juice. `a` and `p` mean AM and PM.
- Work week uses cream and pond-green styling, a frog mark and a highlighted center date. Its heading shows the reference date so stale views are identifiable.
- Monthly Todo is Monday-first and includes recurring and moved occurrences. Unfinished items sort first; completed items are muted and struck through. Long titles shorten, and excess entries show `+N`.
- Monthly Todo centers weekdays, dates and task labels, with 10 pt side insets to keep Monday and Sunday clear of the widget edges. Task text remains 9 pt; titles show their first six grapheme characters at most, using two balanced lines when needed. Text rows reserve enough height for full glyphs. A small `+N` beside the date reports additional tasks without consuming a task row.
- Monthly labels use consistent bold text, darker category-tinted ink and readable completed-task colors. Thin gaps separate label backgrounds without shifting their positions; emoji sequences stay intact when text is clipped.
- Tapping work opens today's work sheet; tapping Todo opens today's planner. Individual calendar cells and checkmarks are display-only.

## Install and Update

1. Install Scriptable on the iPhone.
2. Import `Pocket Paws.js`, or replace the entire contents of the existing Pocket Paws script.
3. Run it and choose **Connect / switch account** if not already connected.
4. Sign in on the trusted website, confirm the account and allow the return to Scriptable.
5. Add a Large or Medium Scriptable widget, select Pocket Paws, and enter the corresponding parameter above.

The hosted installer is `/scriptable/`. Website deployment does **not** replace code already saved in Scriptable. Update the installed script manually to receive layout/code changes. Normal task and shift updates use the existing account connection.

## Refresh

Run the script and choose **Refresh monthly to do** or **Refresh work week** to fetch fresh data and open a preview.

Both widgets request their next refresh after five minutes, or one second after the next Edmonton midnight if sooner. **iOS decides the actual Home Screen refresh time.** Neither exact midnight redraws nor instant task updates are guaranteed; an already displayed widget may remain stale until iOS runs it again.

Todo collections are fetched concurrently. A matching account, Edmonton day and layout-version cache may be used after network failures, with an Offline label. Previous-day data and permission-failure caches are never rendered as current data on a new execution.

## Security

- Pairing creates an ephemeral P-256 key in a local WebView. Pending private keys are stored in Keychain with a ten-minute callback validity limit.
- Only the public key and random state go to the login page. Confirmed UID/refresh-token credentials return encrypted using ECDH/SHA-256/AES-GCM; state and expiry are checked before local decryption.
- Credentials stay in Scriptable Keychain. There is no public data feed and no relaxed Firestore rule.
- The Firebase credential has normal account permissions, **not a restricted read-only scope**. This script only reads data. Never share connected credentials.
- Disconnect clears local credentials and caches; it does not remotely revoke copied tokens.
- UID and connection generation are checked before caching. Firestore reads are paginated and bounded, using existing access rules.

## Build and Verify

```sh
node scriptable/build.cjs
node --test tests/scriptable.test.cjs
```

Edit `runtime.js`, `calendar.js`, `core.js`, `frog.js`, or shared source modules, then rebuild the standalone script. Do not hand-edit the generated bundle.

Tests cover encrypted pairing, paging, recurrence, category colors, isolated caches, removed parameters, supported sizes, rendering bounds, rolling date ranges, Edmonton midnight and daylight-saving transitions. Browser canvas previews approximate appearance, but do not certify native Scriptable rendering. Real iPhone layout, live Google sign-in and background scheduling require device verification.

Official references: [ListWidget](https://docs.scriptable.app/listwidget/), [Keychain](https://docs.scriptable.app/keychain/), [WebView](https://docs.scriptable.app/webview/), [Firestore REST](https://firebase.google.com/docs/firestore/use-rest-api).
