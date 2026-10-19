# Browser login and registration workflow QA — 19 October 2026

Completed sequentially against the existing isolated localhost:3107 database. Real localhost:3000 users, organization approvals and records were not changed. All listed checks passed; no application defect requiring a code change was found.

| Step | Browser action and observed result |
| --- | --- |
| 1 | Invalid account sign-in displayed “Email or password is incorrect” and returned the submit button to an available state. |
| 2 | Completed new English individual registration with required contact/account and first-land fields. |
| 3 | Missing sketch prevented submission with the required file input marked missing. |
| 4 | Uploaded synthetic land-outline.png and submitted; account immediately opened its own farmer workspace without admin approval. |
| 5 | Land records displayed the newly entered English QA land. |
| 6 | Signed out and signed in successfully with the new farmer's mobile number. |
| 7 | Completed another individual registration without email, uploaded its sketch, then switched to Sinhala. Typed names/land details and the uploaded sketch remained usable. |
| 8 | Submitted using the Sinhala button; immediately activated in Sinhala. Reload retained Sinhala and the original typed farmer name. |
| 9 | Filled a new company application and first-land information. Missing registration evidence prevented submission. |
| 10 | Uploaded synthetic verification/sketch images. A mismatched confirmation password displayed “Passwords do not match.” Correcting it allowed submission. |
| 11 | New company appeared Pending in the organization application portal. No Register member control or operational dashboard was exposed. |
| 12 | Signed in as isolated QA administrator and located Browser QA Growers through Organization approvals search. |
| 13 | Selecting approval without a review note was blocked by the required note field. Added a note and saved; status changed to Approved with feedback visible. |
| 14 | Signed in as the new organization owner. The organization overview and Organization & people page were available; Register member exposed both farmer and supervisor categories. No staff account was submitted. |
| 15 | Successfully signed in using the English farmer's registered email, then the mobile-only Sinhala farmer's mobile number. |
| 16 | Inspected login, individual English registration, individual Sinhala registration and organization registration at 390px; each document width remained 390px. Restored desktop size afterwards. |
| 17 | Signed in again as the approved organization owner; final browser console had no warnings/errors and dashboard was left open for review. |

The native file chooser uploaded only the repository's synthetic land sketch fixture. The company evidence is explicitly synthetic QA evidence, not real business verification. All accounts created here belong only to the disposable test database. Initial administrator bootstrap was not repeated in this browser run; the existing automated suite covers its one-time guard.

Evidence: qa-auth-sinhala-registered.png, qa-auth-organization-pending.png, qa-auth-admin-approved.png, qa-auth-organization-unlocked.png, qa-auth-mobile-sinhala.png and qa-auth-organization-approved-dashboard.png.
