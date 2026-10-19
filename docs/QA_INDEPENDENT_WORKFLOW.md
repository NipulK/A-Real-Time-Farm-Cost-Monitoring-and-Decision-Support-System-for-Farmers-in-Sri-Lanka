# Independent farmer: new-user browser workflow

Date: 18 October 2026 (Asia/Colombo).

The test followed one newly registered independent farmer through the browser, in order. Synthetic details and uploads were used in the separate QA installation on port 3107; the regular workspace database was not used.

| Step | Action and observed result |
|---|---|
| 1 | Self-registered a new independent farmer with email, mobile, first land and uploaded outline. Immediately signed in, without approval. Starting farming totals were zero. |
| 2 | Followed the first-time setup button and created a 1-acre watermelon cultivation on the registered land, with budget LKR 10,000 and forecast 200 kg. |
| 3 | Recorded LKR 10,000 personal funding. Cash increased; sales remained zero. |
| 4 | Recorded 2 worker-days of planting activity. The work itself did not create an expense. |
| 5 | Recorded LKR 2,000 cash labour expense linked to the activity, without supervisor or organization farmer attribution. |
| 6 | Uploaded and downloaded a synthetic PNG receipt; recorded LKR 500 family labour as imputed cost, distinct from cash. |
| 7 | Invalid harvest reconciliation was rejected with readable feedback. Saved total 200 kg, saleable 180 kg and loss 20 kg. |
| 8 | Attempt to sell 181 kg was rejected. Sold 100 kg at LKR 50/kg, leaving 80 kg stock and LKR 5,000 revenue. |
| 9 | LKR 5,001 payment was rejected. Received LKR 2,000 partial payment, leaving LKR 3,000 due. |
| 10 | Downloaded summary and ledger CSVs. Forecast assumptions of 180 kg, LKR 50/kg and LKR 500 extra cost produced LKR 6,000 projected profit at the then-recorded LKR 2,500 cost. Actual results remained separate. |
| 11 | Corrected family labour by voiding LKR 500 with a reason and recording LKR 600 replacement. Original remains in correction history; live total is LKR 2,600. |
| 12 | Added a separate second land and sketch, 160 perches converted to 1 acre; edited its location successfully. |
| 13 | Viewed historical prices and flagged records with unverified-market warnings. Closed the cultivation. New-expense form displayed no-open-cultivation guidance and disabled saving. |
| 14 | Signed out and back in using mobile, then email. Land, season, expense history and financial results persisted; they also survived the QA server restart. |
| 15 | Retested improved first-time guidance with another independent test account that has a land and no cultivation; correct button opens cultivation form. |

## Final reconciliation

Funding LKR 10,000; cash expense LKR 2,000; imputed expense LKR 600; economic cost LKR 2,600; sales LKR 5,000; economic profit LKR 2,400; payments LKR 2,000; receivables LKR 3,000; net recorded cash LKR 10,000. Unsold 80 kg is not counted as sales revenue.

Evidence: qa-new-farmer-report.png, qa-new-farmer-statement.txt, qa-new-farmer-summary.csv and qa-new-farmer-ledger.csv. The earlier statement and screenshot match the final corrected costs; CSVs were downloaded again after correction. No browser warnings/errors were captured in the final tab.

## Fixes verified during independent-farmer browser QA

- Search with no matches now says No matching records and offers Clear search; clearing restores rows.
- Independent cultivation details no longer show the irrelevant assigned-supervisors panel.
- Season history shows harvest totals and activity quantities instead of a dash. General quantity display retains three decimal places supported by entry forms.
- Forms explain when there is no open cultivation and disable Save rather than leaving an unexplained empty choice.
- Harvest reconciliation feedback no longer starts with an empty field-name colon.
- First-time dashboard recognizes the land/field created during registration and says Start your first cultivation; the button was checked in the browser after rebuilding.

The first five fixes were introduced and exercised in the preceding independent-farmer session and confirmed in this new-user journey where applicable. The final build, TypeScript check, 16 automated tests and 37 HTTP integration groups passed after the onboarding wording fix.

## Limits

This report covers the listed independent-farmer journey and does not certify every possible input, device or role. Browser password-change dialog opening/cancel was inspected in the preceding session; changing credentials was not submitted through the browser. Password/session behavior is covered separately by HTTP tests. The preceding Print report click timed out in the in-app browser and print output was not verified; it remains a manual check in a regular browser. Full physical-mobile/browser-matrix/accessibility/load testing was not performed. Organization roles were not tested interactively in this journey. Earlier responsive testing evidence is separate; the interrupted responsive sweep was not completed.

QA server stopped after completion. Test records were isolated from the user's real data.
