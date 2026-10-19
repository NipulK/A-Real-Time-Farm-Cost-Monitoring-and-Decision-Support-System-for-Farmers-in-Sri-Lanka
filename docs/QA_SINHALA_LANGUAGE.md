# Independent farmer English / Sinhala QA — 18 October 2026

Implemented an account-specific English/Sinhala selector for independent farmers, including self-registration and the signed-in workspace. Existing independent accounts default to English. The chosen language is stored in SQLite `user_preferences`, survives sign-out, mobile/email login, reload and server restart, and can be changed without reloading or replacing entered records. Other account categories stay English; the preference API rejects owners, supervisors, organization farmers and admins, including organization farmers whose base role is `farmer`.

## Browser workflow completed

Used the Codex in-app browser against disposable storage on port 3107; no synthetic records were inserted into the real installation.

1. Opened independent registration and selected Sinhala. Inspected translated account and first-land fields, area units and sketch instructions.
2. Registered a synthetic farmer with Sinhala name, land name, location and a fixture sketch. The first signed-in page was Sinhala immediately.
3. Created a cultivation through Sinhala labels, selecting the translated crop with its unchanged crop ID.
4. Created a cash expense of LKR 1,250. Verified visible category `බීජ` had option value `Seeds`; save and totals succeeded.
5. Reviewed all eleven independent navigation pages: overview, cultivations, land records, activities, expenses, funding, harvests, history, decisions, reports and account/administration. Translated table headings, empty states, buttons, forms, calculation explanations and missing-data labels.
6. Switched to English and reloaded: English remained selected. Switched back to Sinhala, signed out and signed in using mobile: Sinhala returned. Email login and a server restart also retained Sinhala.
7. Signed in separately as owner, supervisor, organization farmer and administrator. Each had English headings, `html lang=en` and no language selector. Organization registration also had no selector.
8. At 390×844, checked the dashboard, mobile navigation, expense page and entry dialog. Document scroll width was 390, matching the viewport; dialog width was 358. Restored the normal viewport afterwards.
9. Entered invalid harvest quantities (10 total, 9 saleable, 0 lost). Server rejected them with the translated validation message. Changed loss to 1 and saved successfully.
10. Recorded a 5 kg sale at LKR 300/kg and a LKR 500 bank-transfer payment. Visible `බැංකු හුවමාරුව` retained API value `Bank transfer`. Statement showed costs 1,250, agreed sales 1,500, profit 250, received 500, receivable 1,000 and recorded net cash −750 LKR.
11. Switched to English again: category became Seeds while the farmer-entered Sinhala expense and cultivation names stayed intact. Returned to Sinhala and reloaded.
12. Fixed a server/browser Sinhala date-format hydration mismatch discovered in the console. Final fresh-tab checks in both languages, including reloads, produced zero errors/warnings. Corrected remaining English payment-method and missing-data display too.

## Automated verification

- 18 automated tests passed, including translation/validation tests and existing accounting, access, migration and provenance checks.
- TypeScript check and production build passed.
- 41 HTTP integration groups passed, including new preference persistence, initial Sinhala registration, account isolation, spoofed-target protection, invalid language, origin/authentication checks and denial for every other role. Restart persistence now includes the language preference.

## Evidence and boundaries

- `qa-sinhala-desktop.png`, `qa-sinhala-mobile.png`: final screenshots.
- `qa-sinhala-browser.json`: page survey, other-role checks, final snapshot and console result. Initial survey snapshots precede the final small display fixes; the final snapshot reflects those fixes.
- `qa-http-results.json`: automated integration results.

Translations apply to application copy and supported built-in labels. Farmer-entered names/notes, source price labels, IDs, original audit payloads and CSV column schemas retain their original values. Browser-native date-picker controls and browser validation depend on browser/OS language. No external translation service is used. Physical devices, other browser engines, exhaustive accessibility testing and professional Sinhala terminology review were not performed in this change. Print output remains outside this verification. Temporary QA servers and storage were cleaned after recording evidence; the existing real dev server was preserved.
