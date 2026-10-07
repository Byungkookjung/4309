# Work Today: two jobs in one widget

SwiftUI companion app and WidgetKit Home Screen widgets for iOS 17+.
Booster Juice is purple; Iron Peak is green. Small, medium and large widgets each show BOTH jobs' daily times and estimated CAD pay. Large also shows tomorrow.

## Automatic sync

1. Run Work Today and tap **Connect Google account**.
2. Sign in using the same Google account as the website, then choose **Connect this account**.
3. Return to Work Today. It reads both jobs' shifts and pay settings from the existing Firestore collections.
4. Add a Work Today widget from the Home Screen widget gallery. Widgets can be stacked with other widgets of the same size.

The app syncs when opened or with **Sync now**. The work widget requests a fresh timeline daily at the next local midnight (America/Edmonton for connected accounts; imported snapshots use their own timezone). Calendar arithmetic handles daylight-saving transitions. Cached midnight entries cover the next seven days even without a network response. Monthly Money and Earn It Back also request their next update at midnight. One Sync now button refreshes every widget. iOS controls actual refresh and display timing, so an exact midnight update or immediate web edits cannot be guaranteed. Offline, widgets retain their cache and display an update timestamp.

Pay uses each job's hourly rate and holiday multiplier, with the existing 30-minute break rule for shifts of 5.5 hours or longer. It excludes tips and deductions. Incomplete shifts display `--` rather than invented income.

**Disconnect and remove widget data** removes this device's credentials and cache. It never deletes website records. Manual JSON import and explicit sample data remain available while disconnected.

## Connection architecture

- `widget-connect.html` runs Firebase Google sign-in in an ASWebAuthenticationSession browser, not an embedded Google login webview.
- Each connection has a new P-256 key pair and state. WebCrypto encrypts the Firebase refresh credential using ECDH/SHA-256/AES-GCM; the callback fragment can only be decrypted by the originating app session.
- Tokens are stored in a shared Keychain item, not in exported JSON, a public URL query, or snapshot files.
- The app/widget exchange the refresh credential for an ID token and issue authenticated Firestore GET requests. Existing user security rules still apply. No admin credentials or database rule changes are needed.
- Snapshots are stored in the App Group container. Never build with `CODE_SIGNING_ALLOWED=NO`: this prevented the Simulator from granting shared-container access in the first prototype.
- `widget-connect.html`, `widget-connect.js`, and `widget-connection-crypto.js` must be hosted before real account connection works. The website/app currently use `https://todo-ledger.web.app/widget-connect.html`.

## Run in Simulator

1. Install Xcode and an iOS runtime in **Xcode > Settings > Components**.
2. Open `ios/WorkToday.xcodeproj`.
3. Select the **WorkToday** scheme and an iPhone simulator, then Run.
4. Open **Account**, then tap **Show sample on widget** for a test without signing in. A SAMPLE label distinguishes it from real records.
5. Home Screen > long-press > Edit > Add Widget > Work Today. Choose small, medium or large.

Existing widgets may need to be removed and re-added after installing the new sizes. The app's size selector previews all three sizes.

Browser-only content preview: `http://localhost:8000/widget-preview.html`. It is not a real iOS widget.

## Physical iPhone

Use a signing team for BOTH app and widget targets, unique bundle IDs, and the SAME App Group in both targets. `WORK_APP_GROUP` controls the App Group and shared Keychain access group. Register a group for your team rather than assuming the default `group.com.suyeon.worktoday` is available.

Free Personal Team accounts have capability restrictions. If Xcode rejects App Groups, use Simulator or a team supporting those capabilities; do not remove the entitlement. TestFlight is not needed for Simulator testing.

## Build and test

Regenerate after editing `project.yml`:

```sh
xcodegen generate --spec ios/project.yml
```

Build with Simulator signing enabled:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project ios/WorkToday.xcodeproj -scheme WorkToday \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  CODE_SIGN_IDENTITY=- build
```

Select an installed Simulator by name or ID for tests:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project ios/WorkToday.xcodeproj -scheme WorkToday \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  CODE_SIGN_IDENTITY=- test
node --test tests/widget-data.test.cjs
```

Tests cover shared-container access, shared Keychain, rates/holiday calculations, encrypted WebCrypto-to-CryptoKit callbacks, wrong state/key rejection, mock Firebase sync, offline cache retention, and small/medium/large UI previews. The connection fixture contains only generated test keys and fake credentials. Unit tests skip credential-writing tests if an account already exists.

Real Google login and production-account sync require the account owner's interactive sign-in and must be checked separately from mocked tests. Physical-device signing and Apple-controlled background refresh timing are also separate checks.

## Widget Gallery

- The large **Both Jobs Today** widget shows today and tomorrow, with Iron Peak first (green) and Booster Juice second (purple). Times use AM/PM. Small and medium remain today-only.
- Add **Monthly Money** separately from the Work Today widget gallery, in small or medium size. It uses the same connected Google account but reads `ledgerEntries`, not work schedules.
- Monthly Money shows current-month spending and recorded income from the ledger in CAD. Shared expenses count the user's half. Spending above income gets an angry face; equal or lower gets a happy face. Old caches without income request sync instead of assuming zero.
- Empty synced months show $0; missing/stale-month data requests a sync rather than presenting last month's total as current. Offline same-month data is retained. Disconnecting clears both widget caches, not website records.
- In the app, **Show sample on widget** previews all widgets without an account. Large preview includes tomorrow. Samples are explicitly marked.
- Simulator tests cover month boundaries, income exclusion, shared amounts, zero totals, mock ledger sync and offline cache retention. Real-account Google sign-in still requires an end-to-end device check.

- **Earn It Back** calculates max(0, (monthly spending - monthly ledger income) / CAD 15 per hour - monthly scheduled work already elapsed). Both jobs are included; future shifts are excluded, overnight shifts are clipped to the month, and overlapping shifts never count the same second twice. Because break start times are not stored, qualifying breaks reserve the final 30 minutes of a shift. This is a schedule-based estimate, not a time-clock attendance record.
- All widgets share rounded typography, soft card backgrounds and restrained accent colors. The app keeps account/import/sample controls in Account and exposes one Sync now button.
- Widget rendering tests include compact sizes, long English/Korean names, an unbroken URL and large amounts. Required numeric values scale to fit; optional workplace names truncate with their full accessibility text preserved.

- Small widgets use explicit 10-point insets instead of system margins, with larger work amounts and full-width money figures. Earn It Back is a filled progress ring with h:m:s, pausing outside work and showing Covered! at zero. The native countdown runs during active work without one-second network requests. Cached quarter-hour, shift/break-boundary, target-completion and midnight entries update the ring and pause state; actual timeline timing remains controlled by iOS.
- The large widget rotates 24 unique short tips daily in Edmonton time. Twelve bundled native-emoji images keep the advice readable even on Simulator runtimes lacking emoji fonts. Opening the app / Sync now refreshes monthly schedule history and ledger data together. Old caches without monthly history request sync rather than showing incorrect worked hours.

### Ledger Income for Earn It Back

Income comes from the same monthly ledger snapshot shown as Earned in Monthly Money. Payout History is not fetched or credited. No income entries means zero income; an old cache with missing income requires sync, and failed syncs preserve the previous cache. Remaining hours are max(0, (spending - ledger income) / 15 - elapsed scheduled hours). This is a budgeting estimate, not a bank balance; income and elapsed work may overlap.

### Cat Clock

The vector sky-blue cat has highlighted eyes during active work and closed eyes while resting. A paw marker follows the progress ring; small widgets place the countdown inside the cat and larger widgets place the numbers alongside it. The decorations do not change calculation or sync behavior. Simulator validation includes all three sizes and long numeric values; the complete native suite currently contains 22 tests.
