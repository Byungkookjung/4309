# EE / Excel / Layout Integration

## Branch and Preserved Work

`integration/ee-excel-layout` starts at feature commit `9dd7be4`. Commit `cde5180` deliberately integrates the original pending Excel export and Activity layout changes, including their README and tests. The two overlapping ledger files were three-way merged against `1e842ce`, retaining both the exporter and EE script order. The exporter, layout CSS and other pending files were copied without modifying their source worktree.

The original `main` worktree remains at `1e842ce` with its original eight pending paths. File hashes, binary diff and porcelain status match the pre-feature snapshots. The existing EE feature branch remains unchanged. No production records, rules or Hosting releases were modified, and no main merge was performed.

## Concurrency Correction

The previous history query was not atomic with a later parent deletion. A transaction could be saved after that query, leaving the deletion decision based on stale history. This was a real race, not just a missing test.

`ledger-mutations.js` is shared by the application and actual-rules Emulator tests:

- Every remote transaction add, edit/relink and TXT import reads its parent documents and writes entries plus `ledgerSettings/eeRevision` in one Firestore transaction. Missing or changed-type parents and unavailable child assignments reject the whole save. An unchanged historical orphan/archived assignment may be retained only when editing an existing server entry; it cannot establish a new broken link.
- Parent deletion reads the revision **before** querying complete history, then requires that same revision in its delete transaction. Concurrent entry saves cause a revision conflict or explicit stale-data refusal. Parent documents are reread and checked inside the transaction, including on retries.
- If deletion commits first, an already-started entry save conflicts and retries against the missing parent, then rejects. If saving commits first, the revision fence or fresh history blocks deletion. A partially invalid TXT import writes nothing. Remote imports are limited to 450 entries per atomic transaction; users must split larger files explicitly.
- Hierarchical EE parents remain permanently protected by the app, including empty and archived-only child lists. Flat EE, FE and EI parents with references are now also protected. This intentionally tightens deletion behavior; budgeting calculations are unchanged. History checks retain references even on legacy records excluded by visible amount/reason filters.
- Local tabs use one origin-scoped Web Lock for activity writes, parent deletion and local budget updates. They reread saved parents/history under the lock. There is no unsafe localStorage lease fallback: unsupported browsers receive an error without a write. New manually entered transaction IDs use UUIDs to avoid cross-tab timestamp collisions.

### Guarantee Boundary

These protections apply to this updated application's cooperating clients. The actual deployed rules enforce ownership only; an old tab, previous app build or a different authorized client can still bypass the revision protocol. This is **not** database-enforced referential integrity. Do not claim a production-wide guarantee until an explicitly approved rollout addresses old clients and server-side enforcement. No security rule change was made here. Production rollout remains unapproved.

## Validation

All records in tests are local fixtures or Emulator records under `demo-ee-subcategories`.

- Node calculation/model/export suites: 67 tests.
- Application two-tab tests: Chrome and WebKit; save-first and delete-first orderings for EE, FE and EI; stale TXT imports; invisible legacy-reference protection. Both tabs call the actual application mutation functions.
- Actual deployed-rules snapshot on the Firebase Emulator: ownership permissions plus forced save-after-history-query races, delete-first saves, a genuine Firestore conflict/retry, atomic TXT failure, failed relink preserving its original entry, and eight simultaneous real save/delete races. Tests import the same `ledger-mutations.js`, rather than reimplementing the algorithm.
- Complete browser regression set: EE UI/sync, Excel download and byte-identical original cells/Summary/shared amounts, Activity layout, budget editing/TXT, mobile auth/offline shell, payout layout, paystub attachments/downloads, phone flows, planner UI/calendar and workplace setup. All use local fixtures and blocked Firebase SDK loading.
- Swift web-snapshot decode/round-trip smoke test; iOS Simulator suite: 20 unit tests and 2 UI tests, no failures. Result bundle is outside the repository at `/tmp/4309-integration-native.xcresult`.
- JavaScript syntax and Git whitespace checks. No physical-device Google sign-in or production-account sync was performed.

The wider regression run exposed stale test assumptions unrelated to this feature. Test-only changes now seed a valid existing workplace for paystub tests, respect the intentional matched desktop payout-card heights, supply the current workplace profile in the mobile auth double, inspect the active nonempty service-worker cache instead of an obsolete cache name, and put payout fixtures in the displayed month. Async UI assertions wait for saves to complete rather than racing the new locks. No unrelated application behavior was changed to make these tests pass.

## Reproduction

Serve this worktree itself, not the old temporary preview:

```sh
python3 -m http.server 8006 --bind 127.0.0.1
```

In another terminal, with Playwright installed:

```sh
export MOBILE_TEST_URL=http://127.0.0.1:8006
export LEDGER_EXPORT_BASE="$PWD/ledger-export.js"
# Optional: PLAYWRIGHT_MODULE=/absolute/path/to/playwright
TZ=America/Edmonton node --test tests/*.test.cjs
for suite in ee-export-download-ui ee-sync-ui ee-ui ledger-activity-layout-ui \
  ledger-budget-edit-ui ledger-concurrency-ui ledger-export-ui mobile-ui \
  payout-layout-ui paystubs-ui phone-flows planner-calendar-ui planner-ui \
  work-setup-ui ee-export-compat; do node "tests/$suite.cjs" || exit 1; done
```

For actual-rules Emulator reproduction, follow `EE_SUBCATEGORIES.md` and run both `tests/ee-firestore-emulator.cjs` and `tests/ledger-concurrency-emulator.cjs` in the same `firebase emulators:exec` session. The actual rules file is mandatory; absent rules are a release blocker. The tests refuse non-localhost hosts or a non-demo project. No deployment command is part of this workflow.
