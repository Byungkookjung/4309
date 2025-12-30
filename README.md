# Todo App + Expense Ledger

A simple project that pairs a Todo app with a lightweight expense ledger, built with HTML, CSS, and JavaScript.

## Features

### Todo App (index.html)
- Add, edit, and delete tasks
- Mark tasks complete/incomplete
- Optional due dates with date-based sorting
- Filters: All, Active, Completed, Today, Upcoming
- Calendar view with date filtering and highlights
- Remaining task count + clear completed
- Local storage persistence

### Expense Ledger (ledger.html)
- Account balance setup (Saving/Checking/Etc)
- Spending plan items add/edit/delete
- Activity entries for income/expense
- Summary by range (all/year/month/week)
- Expense-by-reason donut chart
- Local storage persistence

## How to Run

1) Open `index.html` directly in a browser  
2) Or run a local server: `start-server.bat` (Windows) or `start-server.sh` (Mac/Linux)  

From the Todo screen, use the **Expense Ledger** button or open `ledger.html` directly.

## Key Files

- `index.html`: Todo App UI
- `app.js`: Todo App logic
- `ledger.html`: Expense Ledger UI
- `ledger.js`: Ledger logic
- `style.css`: Shared styles
- `start-server.bat`, `start-server.sh`: Local server scripts

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
