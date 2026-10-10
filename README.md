# Weekly Work Sheet + Expense Ledger

HTML, CSS, and vanilla JavaScript project with Google sign-in, Firestore sync, and local fallback storage.

It currently includes two main tools:

- `index.html`: weekly work hour tracker and payout logger
- `ledger.html`: personal expense ledger and planning dashboard

## Live Site

- `https://todo-ledger.web.app`

## Main Features

### Weekly Work Sheet

- One-button switching between Booster Juice and Iron peak Auto Repair
- Separate shifts, hourly rates, payout history, and charts for each job; existing records remain under Booster Juice
- Iron peak Auto Repair excludes tips from its payout form, totals, history, and chart
- Two-week work sheet view with a configurable period start and payday delay in Pay Settings
- Defaults: $15/hour, a 1.5x holiday multiplier, and payday seven days after period end. Booster Juice periods start from July 31, 2026; Iron peak Auto Repair periods start Monday, October 5, 2026 (October 5-18, October 19-November 1, etc.). Previous Iron Peak default anchors (July 31, September 14 and September 28) are automatically replaced, without deleting shifts or payouts. Other custom anchors are preserved; adjust payday delay to the actual job schedule.
- Editable check-in and check-out times for past and current dates
- Auto break rule:
  - `0.5h` break when shift duration is `5.5h` or more
  - `0h` break otherwise
- Holiday toggle per day
- Expected income calculation using:
  - base hourly rate
  - holiday multiplier
- Shift calendar with daily worked hours
- Click-to-open day detail card that collapses again on second click
- Weekend and holiday dates highlighted in red on the calendar
- Pay settings hidden by default and editable through a pencil button
- Flexible time paste support for inputs such as:
  - `10`
  - `1000`
  - `10:00`
  - `오전 10:00`
  - `오후 5:00`
  - `5pm`
- Keyboard week navigation with `←` and `→`
- Mobile time editor with large check-in/check-out inputs, quick time choices, and calculated hours/break preview
- Save, cancel, or clear times in the mobile editor; changes are saved only on Save

### Actual Payout Log

- Paystub-style payout entry form
- Auto-calculated `Regular pay` from `Hours × hourly rate`
- Support for:
  - Holiday work pay
  - Stat holiday pay
  - Tips
  - Vacation payout
  - Deductions
- Auto-calculated:
  - `Gross pay`
  - `Net pay`
- Editable payout history entries
- Delete payout history entries
- Scrollable payout history
- Pay period start/end fields and schedule-block payout totals based on each job's configured payday

### Payout Trend

- Combined Monthly Payouts groups actual net deposits by calendar month, independent of work periods. Select a month to see per-job and combined totals plus a 10-month chart ending in that month; months without deposits show zero.

- Payout and tips displayed as blue and green lines on the same dollar scale
- Most recent 10 payout records shown in chronological order
- Amount labels above payout points and below tips points
- Horizontal scrolling on smaller screens keeps dates and amounts readable
- Latest, average, and highest payout/tips summaries use the full payout history

### Responsive Design

- Coordinated blue/white cards, buttons, inputs, and typography across both main pages
- Calendar and wallet SVG favicons for the work sheet and ledger
- Long titles, Korean descriptions, and unbroken URLs wrap within cards
- Mobile month filters wrap; wide weekly tables and trend charts scroll horizontally
- Calendar details appear below the calendar on smaller screens
- Visible keyboard focus and reduced-motion support

### Expense Ledger

- Balance setup for `Checking`, `Saving`, and `Etc`
- Balance history page with item delete and clear-all actions
- Fixed expense, expected expense, and expected income planning
- Activity tracking with category-linked budget items
- TXT import with validation, preview, shorthand support, and refresh after import
- Budget progress breakdowns
- Investment tracker
- Exchange tracker
- Firebase sync with local fallback

## Pages

- `login.html`: Google sign-in page
- `index.html`: Weekly Work Sheet
- `ledger.html`: Expense Ledger
- `investments.html`: Investment tracker page
- `widget-preview.html`: both-job widget preview and schedule snapshot export

## iPhone Companion and Widgets

### Mobile Web App (Free)

Open `/mobile/` for **Pocket Paws**, a separate mobile-first dashboard. It reads both jobs and the ledger from the existing Google account without modifying records. It includes today/tomorrow shifts, monthly money and a cat recovery clock using the same ledger-income formula as the native app. Sample data is available only through an explicit preview button.

In iPhone Chrome, open the dashboard, tap Share, then **Add to Home Screen**. Its manifest launches `/mobile/` in standalone mode with a cat icon; no paid Apple developer membership or weekly reinstall is needed. This is an app you open, not a live iOS Home Screen widget. Login may be required again in the installed app.

The dashboard syncs on sign-in, return to the foreground, manual Sync and once a minute while visible. It cannot guarantee background/midnight refresh while closed. Its scoped service worker caches only public UI assets, never financial responses or tokens. Records are kept in memory and cleared on account changes; offline reload requires reconnecting to load your account. Existing work-sheet and ledger records are preserved. Run `node --test tests/*.test.cjs` for calculation tests; real iPhone Chrome installation and Google sign-in need a physical-device check.

With the local server running and Playwright/Chrome installed, run `node tests/mobile-ui.cjs` for isolated mobile UI, mocked authentication, offline shell and service-worker checks. `PLAYWRIGHT_MODULE` can point to an existing Playwright installation, and `MOBILE_TEST_URL` defaults to `http://localhost:8000`. Tests never write production financial data.

`node tests/phone-flows.cjs` additionally exercises the mobile dashboard links into the full work sheet and ledger, using both Chrome and Playwright WebKit (install with `playwright install webkit`). It checks 320-1920px calendars, date detail toggling, time-editor save/cancel and long ledger text using isolated local storage. Phone calendars use compact rows, single-line weekdays, numeric hours and a dot for today; full date/status/hours remain in accessible labels. The work sheet allows browser zoom, and wide weekly tables retain horizontal scrolling instead of compressing their inputs. These are browser-engine tests, not a physical iPhone or real Google login test.

`ios/WorkToday.xcodeproj` contains a native companion app and three widget sizes showing both jobs' daily times and estimated pay, purple for Booster Juice and green for Iron Peak. Google account connection enables authenticated automatic sync; manual JSON import remains available. See [iOS setup and testing](ios/README.md) for Simulator/device instructions and signing requirements.

- **Both Jobs Today:** Iron Peak first, Booster Juice second, with AM/PM times. The large widget also shows tomorrow.
- **Monthly Money:** monthly ledger spending and income with a happy/angry money mood; shared expenses count at half.
- **Earn It Back:** `max(0, (monthly ledger spending - monthly ledger income) / 15 - elapsed scheduled work hours)`. Income matches Monthly Money's Earned value; Payout History is not used. Future work does not count. The countdown runs during scheduled work and pauses outside it.
- The sky-blue cat clock has awake/resting expressions and a paw progress marker. The large size includes one of 24 rotating tips.
- One **Sync now** button refreshes all widget data. Midnight refresh is requested in Edmonton time, but iOS controls actual background execution timing.
- Old or failed syncs are not treated as zero income. This is a schedule-based budgeting estimate, not a time-clock or bank balance.

## Cat Theme and Responsive Layout

The work sheet and ledger keep their existing workflows and layouts, with a sky-blue cat mascot, soft accents and decorative paw stamps on button hover, keyboard focus and touch. Original button labels, job colors, and financial status colors remain intact. Reduced-motion preferences disable decorative animation. The budget editor wraps long item names and uses its available width to choose columns. Activity Summary month buttons use 1-12, with month names retained as accessible labels.

## Key Files

- `index.html`: Weekly Work Sheet UI
- `app.js`: Weekly Work Sheet logic
- `ledger.html`: Expense Ledger UI
- `ledger.js`: Expense Ledger logic
- `style.css`: shared styles
- `polish.css`: visual refinements and responsive overrides for both main pages
- `mobile-time.js`: mobile shift time editor
- `auth.js`: Firebase config and auth helpers
- `login.html`: login screen
- `login.js`: login page logic
- `activity-import-sample.txt`: sample ledger TXT import file
- `firebase.json`: Firebase Hosting config

## Local Run

### Mac / Linux

1. `cd /Users/suyeonkim/Desktop/4309`
2. `chmod +x start-server.sh`
3. `./start-server.sh`

Alternatively, run `python3 -m http.server 8000` from the project directory.
If port 8000 is already in use, check the existing server or use another port such as 8001.

### Windows

1. Run `start-server.bat`

### Open

1. Open `http://localhost:8000/login.html`
2. Sign in with Google
3. Use the money icon to move between the work sheet and ledger

## Firebase Setup

1. Create a Firebase project and web app
2. Enable Google sign-in
3. Create Firestore
4. Update `auth.js` with your Firebase config

Minimum Firestore rules:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Deploy

This project is configured for Firebase Hosting with project id `todo-ledger`.

Manual deploy:

1. `firebase login`
2. `cd /Users/suyeonkim/Desktop/4309`
3. `firebase deploy --only hosting`

This deploys the website, widget connection page and preview assets only. Native iOS sources and tests are excluded from Hosting. Installing an updated iPhone app or distributing through TestFlight requires a separate signed Xcode build; pushing Git or deploying Hosting does not update the native app.

Hosting URLs:

- `https://todo-ledger.web.app`
- `https://todo-ledger.firebaseapp.com`

For Google sign-in, add both domains in Firebase Authentication authorized domains.

## Testing

Recent validation included:

- `node --check app.js`
- `node --check mobile-time.js`
- `git diff --check`
- Playwright checks for:
  - break rule
  - holiday calculations
  - Friday week start
  - responsive calendar layout
  - payout auto-calculation
  - payout edit flow
  - keyboard and calendar interactions

September 2026 visual update checks used isolated browser data, without writing to production Firestore:

- Mobile editor save, cancel, clear, and hours preview at 360, 390, and 430px
- Long Korean/English titles, descriptions, unbroken URLs, and large amounts at 360, 390, 768, 1024, and 1440px
- Page/text overflow checks and browser JavaScript error checks
- Recent-10-record payout/tips labels and chart scrolling at 390 and 1440px

These checks used desktop Chrome with resized viewports; native iOS/Android time pickers were not tested on physical devices.

October 2026 companion/theme validation:

- `node --test tests/widget-data.test.cjs` covers both-job snapshots and work calculations.
- Xcode Simulator suite: 22 passing tests, including ledger-based recovery, ignoring old payout caches, authenticated mock sync/offline retention, live countdown and widget size previews.
- Widget render checks include long English/Korean names, unbroken URLs and large numeric values.
- Browser theme checks cover 320, 390, 768 and 1440px, unchanged button dimensions and click handlers, disabled states, keyboard/reduced-motion styling, and no sticky touch-hover effect.
- Budget editor checks cover 320-1920px with long item names and edit callbacks.
- Browser checks use isolated fixtures without writes to production Firestore. Physical-device signing, background refresh and live Google connection still need device verification.

### October 10 Release Verification

- 13 Node calculation tests passed; JavaScript syntax and Git whitespace checks passed.
- Chrome and WebKit checks passed at 320, 375, 390, 430, 768, 1024, 1440 and 1920px for calendar layout, long text, checkbox alignment, header icon separation and shared-expense/submit layout.
- Dashboard offline shell/cache behavior, authenticated fixture sync, Todo menus, categories, repeat schedules, category dragging, write failures and sign-out were exercised without production writes.
- Xcode Simulator: 20 unit tests and 2 UI tests passed. Native iPhone app installation remains separate from website deployment.
- Browser-engine/simulator coverage does not replace a physical iPhone check or live Google sign-in.

## Notes

### Personal Todo Calendar

- Task cards open a bottom action sheet: edit, delete, move to tomorrow (Edmonton), choose a date, or convert to a routine. Conversion is an atomic write; moving a routine occurrence leaves its other dates unchanged. Routine deletion removes the entire routine, as indicated in the menu.
- Todo and shift calendars start on Monday. Completed tasks show a cat paw, and routines sort by category with category labels.
- Work sheet and ledger headers include a widget-home shortcut and an accessible icon-only logout. Ledger entry submission sits beside Shared expense; Abbreviations starts collapsed and charts use ten pastel colors.

- Routine frequency supports daily, weekly, every two weeks, monthly and yearly, with an optional inclusive end date. Older weekday-only routines remain weekly.
- Monthly routines select one or more dates and/or Last day. Missing dates are skipped (for example, February has no 31st); yearly February 29 repeats only in leap years. Two-week cycles are anchored to the start date.

- Categories support names, six color swatches (sky blue, lilac, mint, coral, peach and black), editing and deletion. Each category header has a quick-add task button, and both tasks and routines can select a category.
- Drag a task's grip onto a category to move it. Touch dragging uses the grip so the rest of the page scrolls normally; tapping or keyboard-activating the grip opens the editor as an alternative. Moving a routine changes its category for all occurrences.
- Category definitions are saved in the user's `personalCategories` collection. Deleting a category preserves its tasks/routines, displayed under the built-in `일상` (Daily) category. New tasks/routines default to Daily; existing unassigned records need no migration. The default category stays available and its color can be edited.

- Open `/mobile/planner.html` for private tasks, calendar dates, and recurring routines. There are no friends or sharing features.
- The `/mobile/` dashboard displays cards in this order: shifts, today's tasks, monthly money, and the cat recovery clock. Task editing stays on the separate calendar page.
- Today's task summary includes only Edmonton's current date and routines scheduled for that date. Routine completion is stored separately for each date.
- Records live under the signed-in user's `personalTasks`, `personalRoutines`, and `personalRoutineChecks` collections. Existing work and ledger records are not changed.
- Alberta general and optional holidays are distinguished using the [official provincial calendar](https://www.alberta.ca/alberta-general-holidays). These markers do not change work-sheet holiday pay.
- `tests/planner-ui.cjs` checks task editing/completion, recurring routines, deletion, failed saves, sign-out and responsive layout with isolated Chrome/WebKit fixtures. `tests/planner-model.test.cjs` checks holiday dates and recurring completion.
- Dashboard work times use larger, separate lines; emoji navigation retains accessible link names. Physical-device sign-in and live Firestore permissions still require account-owner verification.

- Work sheet payout calculations use the currently saved pay settings
- Payout history stores the calculated values at save time
- Expense ledger TXT import supports shorthand types such as `FE`, `EE`, `EI`, and `UI`
