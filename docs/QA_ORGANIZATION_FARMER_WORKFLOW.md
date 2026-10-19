# Organization farmer: newly registered user browser workflow

Date: 18 October 2026 (Asia/Colombo).

The organization owner registered a new farmer through the browser in a disposable QA installation. Supporting owner, supervisor and administrator actions tested what the farmer should see. Synthetic account details and upload fixtures were used; the regular workspace database and real accounts were untouched.

## Sequential browser results

| Step | Workflow and result |
|---|---|
| 1 | Approved owner registered QA Newly Registered Company Farmer with mobile, optional email, initial password and internal reference. Unique FR ID generated. Farmer did not use public self-registration. |
| 2 | Farmer signed in by email before any costs existed. My expenses showed the correct name, organization and ID, zero totals and an explicit empty-state message. No farming workspace, cost entry, correction, member management or land controls appeared. |
| 3 | Empty expense download exposed a blank-file issue. Password form opening/closing was inspected without submitting credentials. |
| 4 | Owner assigned farmer to QA Organization Watermelon cultivation. |
| 5 | Assigned supervisor entered LKR 1,800.75 irrigation cash expense against the new farmer ID and uploaded a synthetic receipt. |
| 6 | Supervisor added LKR 200 noncash family labour. Farmer signed in by mobile and saw only these two expenses, recorder name and cultivation, with cash/noncash totals separated. |
| 7 | Own receipt download succeeded. Own expense CSV contained these costs and excluded existing Farmer A/B expenses in the same cultivation. No Add expense, Correct, Attach receipt or Register member buttons were present. |
| 8 | Direct browser navigation to previously observed links for another farmer's receipt, a land sketch, organization summary and audit export was denied. No protected records were displayed. |
| 9 | Fixed empty-export issue and rebuilt/restarted. Created a second mobile-only organization farmer and verified its empty download now contains the complete header row and zero fabricated records. No synthetic internal email appeared in that farmer's portal. |
| 10 | Supervisor voided LKR 200 family labour with a reason and entered LKR 250 replacement. Farmer saw original marked Corrected / voided and replacement. Totals used LKR 250, not both amounts. |
| 11 | Owner removed farmer cultivation assignment. Farmer retained historical own expenses and receipts; total remained LKR 2,050.75. |
| 12 | Owner deactivated farmer. Email sign-in failed. Owner reactivated the account. |
| 13 | Administrator changed organization to Needs information. Farmer sign-in remained possible for account access, but expense table was hidden with an approval warning; even own ledger download was denied. Administrator restored approval. |
| 14 | Farmer signed in again and own records/downloads returned. Final export contains only own expenses and void status/history. Fresh final tab had no captured console warnings/errors. |

## Defect fixed

A new organization farmer with no expenses received a CSV containing only a byte-order mark and no column headings. Added an optional explicit column schema to the CSV formatter and supplied the farmer-ledger schema in the export endpoint. Empty farmer exports now contain expense_id, date, cultivation, description, category, basis, amount_LKR, voided and recorded_by headers without inventing rows. Populated exports retain their existing fields and CSV escaping protection.

Added a production HTTP regression group verifying the actual fresh-farmer export has the exact header row and no data rows. Browser retest used a second new, mobile-only organization farmer after rebuilding.

## Final expense reconciliation

Cash LKR 1,800.75 + live imputed cost LKR 250 = LKR 2,050.75. Original imputed LKR 200 remains visible as corrected/voided and is excluded from totals. Other farmers' same-cultivation costs are not visible or exported. Farmer IDs and private download checks enforce the restriction, including after assignments/status changes.

## Evidence and checks

Evidence: qa-organization-farmer-report.png, qa-organization-farmer-statement.txt, qa-organization-farmer-expenses.csv and qa-organization-farmer-empty.csv. All contain synthetic QA records only.

Final results: 16 automated tests passed; TypeScript and production build passed; 38 production HTTP integration groups passed, including the new empty-export regression. The HTTP suite separately exercises denied write attempts, session revocation, farmer password changes and immediate approval restrictions. In this browser journey, role transitions used sequential sign-ins rather than simultaneous sessions.

Limits: browser password-change submission was not performed; its form opening/closing was checked and server behavior is covered by the HTTP suite. No complete physical-device, browser-matrix, accessibility or load certification is claimed. Expected permission-denied navigations and deactivated-account sign-in were deliberate negative tests; the final fresh tab had a clean console. No email/SMS invitation service is connected. Test server stopped and disposable storage removed after saving evidence.
