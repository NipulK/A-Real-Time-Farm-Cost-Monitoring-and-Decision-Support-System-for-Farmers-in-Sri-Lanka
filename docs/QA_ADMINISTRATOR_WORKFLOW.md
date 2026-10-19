# System administrator: sequential browser QA

Date: 18 October 2026 (Asia/Colombo).

The administrator workspace was checked using synthetic QA accounts, organizations and records in isolated storage on port 3107. The normal database, real administrator credentials and real farmer data were not changed. The QA suite seeded prerequisites; all browser mutations described below were made through the UI.

## Results by step

| Step | Action and observed result |
|---|---|
| 1 | Signed in as test administrator; inspected Administration and People & access, including both farmer categories, organization owners, supervisor and mobile-only account. |
| 2 | Opened Add person; blank submission stayed on required fields. Created an independent support account with initial credentials. |
| 3 | Opened/cancelled Reset password and Change my password forms. Deactivated the created account; self-deactivation control absent. No credential changes were submitted through the browser. |
| 4 | Created account could not sign in while inactive; administrator signed back in and reactivated it. |
| 5 | Added crop and two varieties, then edited crop name and varieties; changes persisted. |
| 6 | Approved a carrot/district reference policy, then revoked it using the same form; status updated without duplicate policy rows. |
| 7 | Attempted organization review with empty note, which browser required. Rejected pending test investor with feedback. |
| 8 | Changed investor to Needs information with feedback. Downloaded company registration document and inspected/downloaded the pending applicant's private land sketch. |
| 9 | Approved the reviewed investor with a note; Approved status persisted. No member-registration panel appeared in the administrator review screen. |
| 10 | Active cultivation validation was rejected with Close the cultivation before validating it. Validated a closed cultivation, revoked validation and validated it again. |
| 11 | Opened/cancelled cultivation editing. Duplicate crop and duplicate account email submissions were rejected with readable messages. |
| 12 | Rebuilt and verified contact/category fixes: mobile-only account shows registered phone, independent and organization farmers have distinct labels, and Reset password identifies selected account. |
| 13 | Entered LKR 15.25 administrator support expense against assigned farmer ID, uploaded/downloaded receipt, then voided the synthetic entry with a reason; live totals returned to original values and history remained. |
| 14 | Activity form opened/cancelled; search/no-match/Clear search worked. Funding form and all three Harvest/Sale/Payment tabs/forms opened/cancelled successfully. These shared financial form submissions were fully exercised in earlier role journeys; this step checks administrator access and form wiring. |
| 15 | Changed historical market/product and flagged-record filter; unverified warnings remained. Scenario inputs produced 100×60−3500−500 = LKR 2,000 projected profit for selected organization season. |
| 16 | Inspected new cultivation and Add field forms and cancelled. Edited an existing field name successfully. Register land navigated to Land records; Add land form opened/cancelled. Saved administrator correction to pending applicant's land location. |
| 17 | Summary and ledger CSV downloads succeeded in selected scope. |
| 18 | Expanded audit event details and downloaded audit CSV. Support correction and land edit were audited. Export did not contain either known plaintext test password checked. |
| 19 | Final rebuilt-browser retest: switching cultivation cleared prior validation error; independent cultivation had no supervisor-assignment panel; overview View all, general record chooser, Escape and cancel controls worked; account-creation role labels were readable. |
| 20 | Saved final settings/account screenshot and audit/summary/ledger exports. Fresh final tab reported no captured console warnings/errors and no internal placeholder email was visible. |

Every top-level administrator navigation page was visited: Overview, Cultivations, Land records, Organization & people, Activities & labour, Expenses & receipts, Funding & budgets, Harvests & sales, Historical prices, Decision support, Reports & exports and Administration.

## Issues fixed

1. Mobile-only account row showed an internal UUID@mobile.invalid email. Administrator snapshot now exposes an empty email plus registered mobile, and account table displays the available contact. Added HTTP assertions verifying this administrator snapshot behavior.
2. Account table and creation form used raw roles, so independent and organization farmers both appeared as farmer. Table now uses profile category labels; creation choices show Independent farmer and System administrator while retaining underlying role values.
3. Reset-password dialog did not identify its target. It now displays selected account name and email/mobile before the password field. Browser inspected/cancelled, without submitting a credential change.
4. Validation error from an active season remained when selecting a different cultivation. Scope selection now clears that obsolete error; rejection plus scope-switch was retested after the final build.
5. Administrator could see an Assigned supervisors panel on independent cultivations despite organization-only assignment rules. Panel now appears only for organization cultivations. Independent panel absence was checked after rebuilding; organization workflow support remains covered by browser and HTTP regression.

No role permissions were broadened, and accounting rules were not changed.

## Final checks and evidence

16 automated tests passed. TypeScript and production build passed. Final production HTTP suite on port 3108: 38 integration groups passed, including administrator mobile-only contact regression assertions. Existing accounting, approvals, private files, isolation, audit immutability and session checks passed.

Evidence: qa-administrator-accounts.png, qa-administrator-settings.txt, qa-administrator-audit.csv, qa-administrator-summary.csv, qa-administrator-ledger.csv. All contain synthetic test records. Data and sessions survived QA server restarts between builds.

## Remaining manual browser checks

Password-reset/change forms were opened, inspected and cancelled; no new credential was entered/submitted there. Browser-use security rules require a human handoff for credential changes. API regression tests separately cover administrator reset, password changes and session revocation. Print output was not verified (the earlier in-app browser print attempt timed out). Thus this report is not a claim that every admin button/form was submitted end to end.

Some shared setup/financial forms were opened/cancelled as itemized rather than creating redundant records. No full physical-device/browser-matrix, accessibility or load certification was performed. No email/SMS, cloud deployment or paid service was used. The browser-test server was stopped and disposable storage removed after saving evidence; the regular app server was left alone.
