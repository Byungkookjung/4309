# Weekly Work Sheet + Expense Ledger

HTML, CSS, and vanilla JavaScript project with Google sign-in, Firestore sync, and local fallback storage.

It currently includes two main tools:

- `index.html`: weekly work hour tracker and payout logger
- `ledger.html`: personal expense ledger and planning dashboard

## Live Site

- `https://todo-ledger.web.app`

## Main Features

### Weekly Work Sheet

- Two-week work sheet view with Friday-based week blocks
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
- `git diff --check`
- Playwright checks for:
  - break rule
  - holiday calculations
  - Friday week start
  - responsive calendar layout
  - payout auto-calculation
  - payout edit flow
  - keyboard and calendar interactions

## Notes

- Work sheet payout calculations use the currently saved pay settings
- Payout history stores the calculated values at save time
- Expense ledger TXT import supports shorthand types such as `FE`, `EE`, `EI`, and `UI`
