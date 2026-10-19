# Supervisor: newly assigned user browser workflow

Date: 18 October 2026 (Asia/Colombo).

A new supervisor was created by an approved test organization through the browser. All actions used a disposable QA database/upload directory on port 3107. The normal workspace, real accounts and real farm records were untouched. Supporting owner actions established and removed access; this was a supervisor journey rather than a repeat of full organization registration.

## Sequential results

| Step | Action and observed result |
|---|---|
| 1 | Owner registered a new supervisor with a unique SUP ID. Supervisor signed in by email and initially saw zero cultivations and no operational records. |
| 2 | Inspected unassigned cultivation, land and funding screens. No farm/cultivation/funding creation rights were available, except an erroneous land UI button identified for correction below. |
| 3 | Owner created a fresh carrot cultivation and assigned the supervisor. |
| 4 | Owner assigned Farmer A to that cultivation. Supervisor saw only the newly assigned cultivation, not the other company season. Budget/details/assignment editing controls were absent. |
| 5 | Recorded irrigation work of 2.125 hours; quantity retained three decimal places. Expense farmer selection offered assigned Farmer A and excluded unassigned Farmer B. |
| 6 | Attempting expense submission without a farmer kept the form open. Selected Farmer A, linked the work and saved LKR 1,250.50 cash cost. Uploaded/downloaded a synthetic PNG receipt. |
| 7 | Added LKR 300 imputed cost separately. Added a synthetic duplicate LKR 50 expense, then voided it with a reason. Totals excluded it and report correction history retained the original and attribution. |
| 8 | Invalid harvest reconciliation was rejected. Valid harvest saved: 120 kg total, 110 saleable, 10 lost. |
| 9 | Attempt to sell 111 kg was rejected. Saved sale of 100 kg at LKR 60/kg, leaving 10 kg unsold. |
| 10 | LKR 6,001 payment was rejected. Saved LKR 2,000 partial payment, leaving LKR 4,000 due. |
| 11 | After fixes/build/restart, checked supervisor navigation and general record menu. No Land records, funding creation, member registration, account creation or cultivation creation controls. Funding is viewable only within assigned scope. |
| 12 | Search with no matches and Clear search worked. Owner removed the supervisor assignment. |
| 13 | Supervisor signed in using mobile and saw zero cultivations. Record form offered no available cultivation, disabled Save and gave owner-assignment guidance. Direct navigation to the previously observed receipt URL was denied with This cultivation is not assigned to you. |
| 14 | Owner restored assignment and closed the season. Supervisor retained historical read access but could not reopen the season; new expense Save was disabled. |
| 15 | Scenario 110×60−1550.50−100 produced LKR 4,949.50 projected profit. Historical crop filter and flagged-record control worked with unverified-price warning. |
| 16 | Summary and ledger downloads succeeded. Downloaded ledger contained new assigned-season records and excluded the organization's other season. |
| 17 | Owner deactivated supervisor; supervisor sign-in failed. After reactivation, mobile sign-in succeeded and assigned closed-season records remained available. |

## Issues fixed and browser retest

- Supervisor navigation exposed Land records, whose empty panel offered Add land despite server restrictions. Removed land navigation for supervisors and added a defensive owner-management message in LandPanel if reached. The final supervisor browser had no land navigation or land creation control. Existing API restrictions remain unchanged.
- Unassigned supervisor pages instructed users to create farms/seasons, set budgets or reopen seasons, which they cannot do. Dashboard/cultivation/record/funding empty states now explain the owner's responsibilities and ask for an assigned open season. After removing the test assignment, the updated cultivation and record guidance was verified in the browser with Save disabled.

## Reconciliation and final checks

Cash cost LKR 1,250.50; imputed cost LKR 300; economic cost LKR 1,550.50; sales LKR 6,000; economic profit LKR 4,449.50; payments LKR 2,000; receivables LKR 4,000; funding zero; net recorded cash LKR 749.50. Voided LKR 50 is excluded. Unsold 10 kg is not sales revenue.

Final build and TypeScript check passed. All 16 automated tests and 37 production HTTP integration groups passed after the UI fixes. The HTTP suite separately verifies server rejection of supervisor funding, budget, account, policy and assignment writes, and immediate session/permission revocation. Browser revocation checks here used sequential owner and supervisor sign-ins, not two simultaneous browser sessions. Final fresh browser tab had no captured console warnings/errors. An earlier permission-denied receipt navigation was intentional negative testing.

Evidence: qa-supervisor-report.png, qa-supervisor-statement.txt, qa-supervisor-summary.csv, qa-supervisor-ledger.csv. These contain synthetic QA data only.

Limits: print output and browser password-change submission were not tested; no claim of exhaustive every-input/device coverage. Physical-device/full-browser/accessibility/load tests remain separate. No email/SMS or hosted service was used. The test server was stopped and disposable storage removed after saving evidence.
