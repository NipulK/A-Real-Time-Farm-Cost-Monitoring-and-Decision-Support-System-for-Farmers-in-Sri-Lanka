# Role-by-role functional test report

Date: 18 October 2026 (Asia/Colombo).

## Result

**Passed: 37 HTTP integration groups and 16 automated domain, security, migration and price-import tests. TypeScript check and production build passed.** No failing assertions remained in the final run. Seven integration groups were added to the existing suite. No application defect was found in this run, so application code was not changed.

Tests ran against the production application on a temporary local server with a separate disposable SQLite database and upload directory. The QA server was stopped and its disposable storage removed after completion. No real accounts, passwords, organization applications or farming records were changed by these tests.

## Role results

| Role | Functions exercised | Restrictions exercised | Result |
|---|---|---|---|
| Administrator | First-time setup; review/reject/request information/approve organizations; account activation and password reset; crop catalogue creation/edit; reference-area policy; closed cultivation validation; audit export | Setup cannot be repeated; decisions recorded; audit history append-only; validation requires closed cultivation | Passed |
| Independent farmer | Immediate self-registration; mobile/email login; mobile-only account; multiple lands, unit conversion, private sketch preview/download and land edit; cultivation; own expenses; funding, harvest, sale, payment; correction, ledger export, closure; password change | Cannot approve organizations, create administrators, reset other users, assign an organization supervisor, validate records or enter records after closure | Passed |
| Organization owner | Application/evidence/first land; pending/rejection/information/resubmission; post-approval staff creation with IDs; cultivation; same-organization farmer/supervisor assignment; per-farmer and combined expense records; funding; account deactivation | Operations blocked pending approval; cannot self-approve, grant administrator privileges, reset arbitrary users, enter organization expenses or access other organizations | Passed |
| Supervisor | Assigned cultivation access; activities; farmer-attributed cash/imputed expenses; harvest; sale; payment; receipt; expense correction | Cannot change funding, budgets, accounts, crop/policy, staff activation or assignments; cannot record missing/unassigned farmer costs; removing assignment immediately blocks access and uploads | Passed |
| Organization farmer | Own-expense portal, totals, correction history, receipts, own ledger export; own password change with prior-session revocation | Other farmers’ expenses, organization totals, land documents, budgets, sales, audit exports and member lists unavailable; record creation, correction, approval, assignment and upload blocked | Passed |
| Visitor / pending applicant | Public registration, application status and feedback | Protected routes require login; public payload cannot select administrator or approved status; pending applicants cannot register members or operate | Passed |

## Shared financial and data checks

Funding remains separate from revenue, customer payments reduce receivables, imputed costs remain distinct from cash costs, and activities do not duplicate expenses. Concurrent competing sales cannot oversell a harvest; payments cannot exceed the remaining sale balance. Corrections preserve originals and farmer attribution; dependent records must be corrected in reverse order. Accounts, sessions, approvals, expenses and private sketches survive an application restart.

Invalid/duplicate registration data, absent or invalid sketches, oversized uploads, area limits, cross-organization assignment, wrong-origin requests, malformed/oversized JSON, excessive numeric precision and repeated failed logins were rejected as expected. Historical-data and benchmark invariants passed the automated regression tests.

## Evidence and limits

Reproduce with `npm test`, `npm run typecheck`, `npm run build`, then `npm run qa:http` in the app directory. The HTTP suite source is `scripts/qa-http.mjs`; its final machine report is `docs/qa-http-results.json` (37 passed).

This run exercised real HTTP endpoints, role-specific server-rendered page loading, calculations and persistence. It did not repeat interactive browser clicks or responsive measurements. Earlier browser evidence is documented in QA_REPORT.md and is separate from this run. The owner’s client-side member panel placement was inspected in code; it was not newly verified through browser interaction. No claim is made that every possible input or UI path has been tested.

Email/SMS, hosted services, PostgreSQL/Supabase, physical devices, a complete browser/accessibility matrix, production load and backup recovery remain outside the current local implementation/test scope.
