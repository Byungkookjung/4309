# Expected Expense Subcategories

## Scope and Safety

This feature extends Expected Expenses only. It adds no virtual envelopes, bank balance adjustments, credit cards, or automatic merchant classification. FE, EI and UI budgeting arithmetic is unchanged.

Work is isolated on `feature/ee-subcategories` in a separate worktree based on `1e842ce`. The original worktree's pending Excel export and layout changes are not part of this branch. Their file hashes were checked before and after implementation. No production Firestore data, Hosting releases or security rules were changed.

## Budget Setup

Open Fixed & Expected Expenses, then Review EE template. Six recommended parents contain eighteen children totaling CAD 2,000 (420 / 500 / 120 / 450 / 230 / 280). Nothing is applied on page load.

For each existing parent, **Keep existing parent budget** is the default. Its current amount is distributed among the recommended children in their recommended proportions, using integer-cent largest-remainder allocation. Recommended amounts require an explicit selection and confirmation. Existing configured child budgets are never reset by reapplying the template. Parent IDs are reused, including uniquely matched old names. Ambiguous duplicate parents or occupied template IDs block application; unrelated custom EE parents remain untouched.

Active child budgets determine the parent amount. Edit children to change that total; the parent amount editor is read-only once children are configured. Each changed total requires confirmation. Child names are unique among active siblings. Zero budgets are supported. The first custom child starts with the old parent amount for explicit allocation, not an automatically created uncategorized allowance.

## Archiving and Historical Data

Archive retains a child's ID, label and historical budget value. Its allocated budget is excluded from the active parent total; Budget Progress shows its historical spending with a zero active allocation and a clearly marked archived label. Restore makes it selectable and restores its saved allocation after confirmation. No child is permanently deleted by this UI.

New transactions cannot select archived children. An existing transaction can retain its archived assignment or be manually moved. Historical transactions without an assignment count under **미분류**, which has no budget or invented percentage. Unknown parent mappings appear under **확인 필요**; missing child IDs count toward the parent's uncategorized spending and preserve saved labels for review.

Parent ID matching takes priority. Otherwise only unique EE name/alias matches are used: 쇼핑 / 개인쇼핑, 외식 / 외식,카페,배달, 택시 / 택시,기타. No records are rewritten on load or template application. Manual assignment preserves original reason, detail, date, amount, shared flag and creation timestamp; it may establish an explicit parent ID link on that manually saved entry.

## Storage and Synchronization

- `users/{uid}/ledgerPlanItems/{parentId}`: existing fields plus `subcategories: [{id, label, amount, archived}]`. Stored parent `amount` equals the active child sum.
- `users/{uid}/ledgerEntries/{entryId}`: optional `subcategoryId` and `subcategoryLabel` snapshot fields. Old TXT imports need neither field and remain uncategorized.
- `users/{uid}/ledgerSettings/eeRevision`: revision guard for EE settings writes, with targeted document checks and a fresh server budget read.
- Existing `ledgerPlanItems` / `ledgerActivity` local storage keys are retained. Local saves check for stale data in another tab before writing.

Remote updates merge parent metadata, check authenticated ownership and refuse stale documents or changed revisions. Template application does not write ledger entries, balances, FE, EI or UI documents. Account-local caches are never substituted for signed-in budgets.

No rules file is tracked in this repository. Tests use mock Firestore, not production or a real Firebase emulator. Before a later authorized rollout, verify that owner-only rules permit the added fields and revision document. No rules deployment is included.

## Progress and Export

The current application's parent budgets are not prorated for weekly or yearly views. Children follow exactly the same rule, while actual spending uses the existing selected week/month/year date filter. Shared amounts use the application's existing per-entry rounding. Parent spending is the sum of all child spending plus uncategorized spending, never a second expense entry. Warning starts at 80%; numeric percentages and excess amounts remain visible above 100%.

`ee-export.js` is a conditional adapter for the separately pending `ledger-export.js`. It appends a Subcategory column, retains all existing cells and calculations, and adds an EE breakdown after the original Summary rows. Budgets in that breakdown are explicitly monthly; spending is for the selected export period, with no new proration rule. Start-inclusive/end-exclusive boundaries remain unchanged. No exporter source or layout changes from the original dirty worktree are committed here. When integrating those changes later, retain their exporter script before ledger logic and retain the new EE scripts and adapter. Until that integration, the clean feature branch does not include an Excel download section of its own.

## Local Validation

```sh
TZ=America/Edmonton node --test tests/*.test.cjs
MOBILE_TEST_URL=http://localhost:8001 node tests/ee-ui.cjs
MOBILE_TEST_URL=http://localhost:8001 node tests/ee-sync-ui.cjs
MOBILE_TEST_URL=http://localhost:8001 node tests/ledger-budget-edit-ui.cjs
LEDGER_EXPORT_BASE=/absolute/path/to/existing/ledger-export.js node tests/ee-export-compat.cjs
```

Browser tests require Playwright (`PLAYWRIGHT_MODULE` can specify its installed module path), Chrome and WebKit. All browser fixtures disable Firebase SDK loading. No deployment command belongs to this workflow.

For a combined local preview without moving either worktree's changes, `LEDGER_ORIGINAL_WORKTREE=/path/to/original node tests/ee-integration-preview.cjs` builds an isolated temporary overlay. It merges the two pending ledger files against their common Git ancestor, reads the old export/layout files by symlink, and refuses unresolved merges. Serve the printed temporary directory on a separate localhost port. This overlay is not a commit or a deployment; the feature branch remains free of the unrelated pending files.
