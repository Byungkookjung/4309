# Expected Expense Subcategories

## Current Interface

The budget overview uses compact white rows with green accents. Child names and budgets are visible by default, indented beneath the parent without a child-heading/count badge; each parent's child list can be collapsed and expanded. The pencil button edits a child inline, and the trash button asks for confirmation before deleting it. New children are added individually. There is no Review EE template section, automatic template application, recommended-budget description, Archive button or Restore button.

Fixed Expenses and Expected Income share the same white overview rows, green amounts, edit icons and compact progress-card styling as Expected Expenses, without adding subcategories or changing calculations. Unexpected Income uses the same progress-card style while retaining its existing reason grouping and no-budget semantics. Income above its expected amount is not marked as expense overspending.

All ledger section cards use pale-green outer surfaces and white inner cards, including balances, investments, budget overview, activity/history, summaries and import/export. Only top-level progress-card amount/budget pairs use enlarged text; child amounts stay compact. Mobile spacing is constrained to avoid excessive header height or page overflow.

Existing budgets are loaded without automatic changes. A parent's active budget is the sum of its active children. Older archived records are still understood for compatibility, but are not offered for new transactions or automatically restored. Existing names/aliases remain supported; historical transactions are never classified from merchant names.

## Deletion and Historical Safety

An EE parent's Edit action allows deletion, including when it has children or historical spending. The confirmation states that all children will be removed from the active lists while existing transactions remain unchanged. Cancel writes nothing.

Deletion is represented by a `deleted: true` historical record, rather than erasing the referenced Firestore document. Parent deletion marks all its children deleted and removes the parent from active totals, budget setup and new-transaction choices. Child deletion excludes only that child from the active budget and choices. The original IDs, names and child amounts remain available for historical transaction labels and exports. This is internal history retention, not a user-facing Archive feature. Existing transaction dates, amounts, shared flags, details and balances are not rewritten.

Budget Progress retains spending from deleted categories, marked as deleted, without inventing an active budget allowance. Transactions lacking child assignments remain under 미분류 with no assigned budget. Parent and child spending are never counted as two separate expenses. New transactions cannot select deleted parents or children; an existing historical transaction may keep its unchanged assignment or be moved manually. FE/EI calculations and their existing deletion safeguards are unchanged.

## Concurrency and Security

Entry saves, edits and TXT imports still validate parent documents and update the shared `ledgerSettings/eeRevision` in an atomic transaction. Parent deletion uses the same revision fence and rereads the targeted documents. Local tabs use a shared Web Lock and reread storage. A save that loses to deletion is rejected; a previously saved transaction keeps its historical parent ID. EE deletion may succeed after a save because it retains the referenced record rather than orphaning it.

The actual rules snapshot used by local tests has SHA256 `7705b473f5202db29f4099ca32f5b276758be094337b178b0966269bd6b80023`. It enforces authenticated ownership, not schema or referential integrity. Old or external clients can bypass application safeguards; no new server-side guarantee is claimed. Emulator tests use localhost and demo projects only. Production Firestore data and rules are not changed by this work.

## Budget Progress and Export

Budget Progress details start closed and open only when the Expected Expense row is clicked. The selected row and outer details area are pale green; the inner category cards remain white with small child rows. Inside an opened card, child lists are initially expanded and can be collapsed individually. The displayed amounts compare selected-period actuals with the current monthly reference budget, with no new weekly/yearly scaling rule. Shared-amount rounding and the existing FE/EI/UI arithmetic are unchanged.

Excel files use safe short names such as `26.10.15-26.11.02.xlsx`. Slashes cannot be used portably in filenames, so dots separate year/month/day. Start-inclusive/end-exclusive date semantics, original columns, shared amounts and Summary totals remain unchanged. Export errors appear in Korean in red; success messages are green. Deleted-category labels remain available in historical exports.

The exchange panel and its history screen have been removed from the ledger. Their old saved data is not deleted, no exchange-history listener is started, and rates are no longer fetched on ledger initialization.

## Validation

Run the Node suites and the isolated Chrome/WebKit tests against this worktree's local server. The EE UI tests cover default expansion, icon editing, child deletion, confirmation cancellation, parent cascade, historical labels, reload and mobile widths. Sync tests cover server metadata, stale-write protection and history retention. Concurrency tests exercise two tabs and actual Firestore transactions. Export tests cover Korean red errors, short filenames, period boundaries, original cells and totals. No deployment is performed by these tests.
