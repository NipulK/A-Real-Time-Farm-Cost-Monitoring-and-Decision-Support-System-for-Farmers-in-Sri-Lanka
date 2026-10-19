# Organization owner: new-registration browser workflow

Date: 18 October 2026 (Asia/Colombo).

A new synthetic company was registered through the browser in the isolated QA installation. The actual workspace accounts and database were not changed. The uploaded images were synthetic test fixtures, not real registration evidence or real land surveys.

## Sequential browser results

| Step | Workflow | Result |
|---|---|---|
| 1 | Filled new company/responsible-person/contact/first-land details and attempted submission without company evidence | Browser required a registration document |
| 2 | Uploaded company evidence and first land sketch, submitted application | Pending portal opened; farming workspace/member registration absent |
| 3 | Updated business address and resubmitted | Updated details persisted; member registration still unavailable |
| 4 | Added a second land while pending, using hectares and a separate sketch | Separate land ID; 1 hectare shown as 2.4711 acres |
| 5 | Administrator requested more information with a review note | Needs information status and note saved |
| 6 | Owner signed in, read feedback, edited the second land boundary and resubmitted | Application returned to Pending |
| 7 | Administrator downloaded evidence, inspected revised land record and approved with a note | Approved status persisted |
| 8 | Owner signed in after approval | Full organization workspace and member registration became available |
| 9 | Registered two organization farmers | Distinct FR IDs; each linked to this organization; initial cost totals zero |
| 10 | Registered supervisor | Distinct SUP ID; same organization |
| 11 | Created watermelon cultivation and assigned supervisor | Only the company supervisor was offered; assignment saved |
| 12 | Assigned both farmers; deactivated and reactivated Farmer Two | Assignments and activation state updated |
| 13 | Recorded company capital LKR 20,000 | Funding increased cash without sales revenue |
| 14 | Signed in as the assigned supervisor; entered Farmer One cost LKR 2,500, Farmer Two cost LKR 3,500, uploaded receipt | Expenses attributed individually; total LKR 6,000 |
| 15 | Recorded harvest 300 kg, saleable 280 kg, losses 20 kg; sold 200 kg at LKR 60/kg; received LKR 5,000 | Owner saw LKR 12,000 sales, LKR 7,000 receivables and both farmer totals |
| 16 | Created second cultivation on second land, selected its empty expense page, inspected general record menu | Fixed forbidden expense shortcut absent; correct supervisor guidance shown; converted field area formatted to 3 decimals |
| 17 | Changed first cultivation budget to LKR 25,000; visited activity/account/planning/history pages | Settings saved; admin-only Add person absent; scenario 280×60−6000−1000 = LKR 9,800; historical prices remain labelled unverified |
| 18 | Attempted duplicate farmer mobile; downloaded expense receipt as owner | Duplicate rejected, three members remained; owner receipt download passed; expense correction button disabled |
| 19 | Signed in as Farmer One, then signed back in as owner using mobile | Farmer saw only own LKR 2,500 expenses; owner members/approval/records persisted |
| 20 | Downloaded owner summary and ledger CSVs and saved screenshots | Both exports succeeded; final browser console had no captured errors/warnings |

Browser sign-ins used test credentials only. Administrator and supervisor actions were supporting steps in this owner workflow, not an exhaustive separate QA certification for those roles.

## Defects found and fixed

1. The owner's empty expense ledger offered an enabled Add record shortcut that opened a forbidden expense form. Submitting it was correctly rejected by the server, so this was a UI permission inconsistency, not a successful authorization bypass. Removed the shortcut, replaced the empty-state explanation with supervisor recording guidance, and added a central client guard against opening that form as an organization owner. Retested on the newly created second cultivation; Add expense remains disabled and the general record chooser excludes expenses.
2. Converted field areas in the cultivation dropdown displayed a long raw floating-point value (2.4710538147 acres). It now uses the standard quantity formatter (2.471 acres); stored area and conversions remain unchanged. Verified in the rebuilt browser form.

## Final financial reconciliation

| Measure | LKR |
|---|---:|
| Company funding | 20,000 |
| Farmer One cash expenses | 2,500 |
| Farmer Two cash expenses | 3,500 |
| Total cash/economic costs | 6,000 |
| Sales revenue | 12,000 |
| Economic profit | 6,000 |
| Customer payments | 5,000 |
| Receivables | 7,000 |
| Net recorded cash | 19,000 |

There are 80 kg unsold; it is not counted as sales revenue. The second cultivation has no operational records, so organization-wide totals match the first cultivation. First budget is LKR 25,000 and second LKR 5,000.

## Verification and evidence

Final `npm test`: 16 passed. TypeScript check and production build passed. Final production HTTP suite on separate port 3108: 37 integration groups passed. Owner browser data persisted across the QA server restart and the build reload.

Evidence: qa-organization-owner-members.png, qa-organization-owner-report.png, qa-organization-owner-statement.txt, qa-organization-owner-summary.csv, qa-organization-owner-ledger.csv. Screenshots and exports contain synthetic QA data only.

Limits: print output and browser password-change submission were not tested in this journey; these are not claimed as browser passes. Rejection status and cross-organization isolation are covered by the HTTP suite; the interactive journey used request-more-information/resubmission/approval. Comprehensive physical-device, browser-matrix, accessibility and load testing was not performed. No SMS/email invitation delivery or cloud connection exists. QA server stopped and disposable browser storage removed after evidence was saved.
