# Todo App + Expense Ledger

A simple project that pairs a Todo app with a lightweight expense ledger, built with HTML, CSS, and JavaScript. It now supports Google sign-in and real-time Firestore sync across devices.

## Features

### Todo App (index.html)
- Add, edit, and delete tasks
- Mark tasks complete/incomplete
- Optional due dates with date-based sorting
- Filters: All, Active, Completed, Today, Upcoming
- Calendar view with date filtering and highlights
- Remaining task count + clear completed
- Google sign-in + Firestore real-time sync
- Local storage fallback when not signed in

### Expense Ledger (ledger.html)
- Account balance setup (Saving/Checking/Etc)
- Spending plan items add/edit/delete
- Activity entries for income/expense
- Summary by range (all/year/month/week)
- Expense-by-reason donut chart
- Google sign-in + Firestore real-time sync
- Local storage fallback when not signed in

## How to Run

1) Run a local server: `start-server.bat` (Windows) or `start-server.sh` (Mac/Linux)  
2) Open `http://localhost:8000/login.html` and sign in with Google  

From the Todo screen, use the header icon to open the Expense Ledger. The Ledger also links back to the Todo app.

## Key Files

- `index.html`: Todo App UI
- `app.js`: Todo App logic
- `ledger.html`: Expense Ledger UI
- `ledger.js`: Ledger logic
- `login.html`: Google sign-in screen
- `auth.js`: Firebase config + auth helpers
- `login.js`: Login page logic
- `style.css`: Shared styles
- `start-server.bat`, `start-server.sh`: Local server scripts

## Firebase Setup (Required for Sync)

1) Create a Firebase project and add a Web app  
2) In Firebase Console:
   - Authentication -> Sign-in method -> enable Google
   - Authentication -> Settings -> Authorized domains -> add `localhost`
   - Firestore Database -> Create database
3) Update `auth.js` with your `firebaseConfig`
4) Firestore rules (minimum):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Quick Usage

### Todo App
1) Type a task and click Add (or press Enter)
2) Optional: set a due date
3) Toggle completion with the checkbox
4) Edit via the Edit button or double-click
5) Use filters or the calendar to narrow results

### Expense Ledger
1) Save balances in Account Setup
2) Add items in Spending Plan
3) Add income/expense entries in Activity
4) Review totals in Summary

## Mobile/Emulator Testing

- **Windows**: `WINDOWS_TESTING_GUIDE.md`
- **Mac (iOS)**: `IOS_SIMULATOR_GUIDE.md`
- **All platforms**: `EMULATOR_GUIDE.md`
