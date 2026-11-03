# Expected Expense Subcategories

Integration update: `integration/ee-excel-layout` deliberately includes the previously separate Excel/layout changes. See `INTEGRATION_VALIDATION.md` for the concurrency correction, complete combined validation and the limits of the ownership-only security rules. The historical feature-branch notes below describe the original isolated implementation; the original dirty worktree is still untouched.

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

Hierarchical EE parents cannot be removed, including empty or archived-only child lists. The parent Remove button is disabled with an explanation, and the underlying deletion handler independently refuses the operation. Flat legacy EE parents with historical ID/name/alias references are also protected. Clear all is all-or-nothing and refuses to remove any budgets if a protected parent is present. Local deletion rereads saved history and checks for stale budgets; remote deletion reads complete server history/budgets and rechecks targeted documents in a transaction. Failed verification deletes nothing. Remaining raw local records retain their unrelated metadata; FE/EI/UI deletion behavior remains available.

## Storage and Synchronization

- `users/{uid}/ledgerPlanItems/{parentId}`: existing fields plus `subcategories: [{id, label, amount, archived}]`. Stored parent `amount` equals the active child sum.
- `users/{uid}/ledgerEntries/{entryId}`: optional `subcategoryId` and `subcategoryLabel` snapshot fields. Old TXT imports need neither field and remain uncategorized.
- `users/{uid}/ledgerSettings/eeRevision`: revision guard for EE settings writes, with targeted document checks and a fresh server budget read.
- Existing `ledgerPlanItems` / `ledgerActivity` local storage keys are retained. Local saves check for stale data in another tab before writing.

Remote updates merge parent metadata, check authenticated ownership and refuse stale documents or changed revisions. Template application does not write ledger entries, balances, FE, EI or UI documents. Account-local caches are never substituted for signed-in budgets.

No rules file is tracked in this repository. On November 2, 2026 (Edmonton), the actual deployed `cloud.firestore` release was fetched using read-only Rules API requests. No production Firestore records were accessed or modified. Snapshot provenance:

- Release: `projects/todo-ledger/releases/cloud.firestore`
- Ruleset: `projects/todo-ledger/rulesets/94b18868-c5c8-4d77-89e9-792ef39761bf`
- `firestore.rules` SHA256: `7705b473f5202db29f4099ca32f5b276758be094337b178b0966269bd6b80023`
- Actual policy: recursive `users/{userId}/{document=**}` permits reads/writes only when authenticated UID equals `userId`.

The actual snapshot passed Firebase Firestore Emulator tests on localhost with the isolated `demo-ee-subcategories` project. Owner child fields, entry assignment/history, archive updates and atomic parent/revision writes succeeded. Other-user and anonymous reads, writes, creates, updates, deletes, queries and revision transactions were denied. FE/EI fixture amounts and owner revision remained intact after rejected writes. No production project, rules deployment, Hosting deployment or main merge was used.

These rules are ownership checks, not EE schema validation or referential-integrity constraints. They do not prohibit an owner using another client from deleting a parent or forging a revision; application guards are not server-side immutability. A new restrictive rules design would require separate review and approval. Before release, recheck the active ruleset if it changed. If the actual rules snapshot is unavailable, security compatibility is a **release blocker**, not an assumed pass. The committed test refuses to run without an explicit actual-rules file and localhost/demo project configuration.

## Progress and Export

The current application's parent budgets are not prorated for weekly or yearly views. Children follow exactly the same rule, while actual spending uses the existing selected week/month/year date filter. Shared amounts use the application's existing per-entry rounding. Parent spending is the sum of all child spending plus uncategorized spending, never a second expense entry. Warning starts at 80%; numeric percentages and excess amounts remain visible above 100%.

The chosen correction is display-only: Budget Progress identifies **Monthly plan** versus **Period actual**, shows the exact selected spending period, and states that week/year percentages and differences compare with **one monthly reference budget**, not a weekly/yearly allowance. EE detail labels use the same distinction. Existing FE/EI/UI and EE arithmetic has not been rescaled. A weekly or yearly view can therefore exceed 100% of the monthly reference without implying it exceeded a prorated allowance. Budgets are current settings, not versioned historical budgets.

Optional future proposal, NOT implemented: introduce a separately labeled selected-period allowance using each month's budget divided by its days and summed across selected dates; a full year at an unchanged monthly budget would sum to twelve monthly budgets. This would change percentages, remaining/excess values and warnings for all affected views and requires an explicit decision about historical budget versions and FE/EI handling. It should not be introduced silently as part of subcategories.

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

## Review Follow-up Validation

- 58 feature/repository Node tests plus 3 original pending-export tests pass (61 total), including hierarchical/archived/empty-parent deletion guards and unchanged monthly-reference arithmetic.
- Chrome and WebKit pass handler-level Remove/Clear all protections, stale server hierarchy and historical-reference checks, valid FE deletion, period descriptions, FE/EI/UI numeric regressions, template/archive/history lifecycle and responsive EE UI.
- The untouched pending Excel exporter plus adapter preserves every original cell and package/style part. Explicit checks cover original/shared amounts (including 3-cent rounding), FE/EI/UI, Summary totals/net, end-exclusive boundaries, Unicode/XML detail and archived/uncategorized children; ZIP integrity passes.
- The temporary combined preview passes actual Excel download tests in Chrome/WebKit with EE details and byte-identical original cells; the original export and Activity layout suites also pass. Original Excel/layout source hashes, binary diff and working-tree status remain unchanged.
- Actual-rules emulator suite passes the owner/other-user/anonymous authorization checks described above. Snapshot and emulator runtime/dependencies remain outside the repository.

Additional commands (use an isolated combined preview URL for the download test):

```sh
MOBILE_TEST_URL=http://127.0.0.1:8005 LEDGER_EXPORT_BASE=/absolute/original/ledger-export.js node tests/ee-export-download-ui.cjs

# Test-only dependencies may be installed outside either source worktree.
npm install --prefix /tmp/ee-test-deps firebase@12.19.0 @firebase/rules-unit-testing@5.0.2
# Temporary firebase.json: firestore.rules points to the actual read-only snapshot;
# emulator firestore host 127.0.0.1, port 8189; UI disabled. Java 21+ required.
EE_EMULATOR_DEPS=/tmp/ee-test-deps EE_ACTUAL_RULES=/absolute/actual/firestore.rules \
  firebase emulators:exec --only firestore --project demo-ee-subcategories \
  --config /absolute/temporary/firebase.json 'node /absolute/feature/tests/ee-firestore-emulator.cjs'
```

No automatic release is authorized by these results. Pending Excel/layout changes remain uncommitted in the original worktree and must be integrated deliberately later; the feature branch contains only their read-only integration harnesses and tests.
