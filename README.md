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
- New jobs initially use $15/hour, a 1.5x holiday multiplier, the July 31, 2026 period anchor, and payday seven days after period end; adjust these to the actual job schedule
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

- A final Combined Payout Trend section charts both jobs' net deposits over the latest 10 pay dates. Summary cards show only each job's latest payout (with its date) and the sum of those two payouts.

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

## Notes

- Work sheet payout calculations use the currently saved pay settings
- Payout history stores the calculated values at save time
- Expense ledger TXT import supports shorthand types such as `FE`, `EE`, `EI`, and `UI`
